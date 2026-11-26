/**
 * Data access for Zul. Wraps a Supabase (service role) client so the rest of
 * the core can be tested with an in-memory fake that implements the same
 * methods.
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { digitsOnly } from './language.js';

let sharedClient = null;

export function getSupabase() {
  if (sharedClient) return sharedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  sharedClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return sharedClient;
}

/** Brazilian numbers sometimes arrive without the mobile "9" (or with it). */
export function phoneVariants(phone) {
  const d = digitsOnly(phone);
  const out = new Set([d]);
  const br = d.match(/^55(\d{2})(\d{8,9})$/);
  if (br) {
    const [, ddd, local] = br;
    if (local.length === 8 && /^[6-9]/.test(local)) out.add(`55${ddd}9${local}`);
    if (local.length === 9 && local.startsWith('9')) out.add(`55${ddd}${local.slice(1)}`);
    out.add(`${ddd}${local}`); // stored without country code
  }
  return [...out];
}

export const PLACEHOLDER_EMAIL_DOMAIN = process.env.ZUL_PLACEHOLDER_EMAIL_DOMAIN || 'phone.meuazulao.invalid';

/** Internal address for accounts created on WhatsApp (never mailed). */
export function placeholderEmail(phone) {
  return `wa${digitsOnly(phone)}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

function inviteCode() {
  return randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function isMissingColumn(error) {
  return error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|Could not find the .* column/i.test(error.message || ''));
}

function isUniqueViolation(error) {
  return error && (error.code === '23505' || /duplicate key/i.test(error.message || ''));
}

export function createDb(supabase = getSupabase()) {
  const db = {
    // -------------------------------------------------------------- webhook
    /** Returns true the first time a WhatsApp message id is seen. */
    async claimMessage(messageId, phone) {
      const { error } = await supabase.from('zul_processed_messages').insert({ message_id: messageId, phone: digitsOnly(phone) });
      if (!error) return true;
      if (isUniqueViolation(error)) return false;
      // Table missing or DB hiccup: better to answer twice than never.
      console.warn('[zul] idempotency check unavailable:', error.message);
      return true;
    },

    async finishMessage(messageId, status, detail = null) {
      const { error } = await supabase
        .from('zul_processed_messages')
        .update({ status, detail, processed_at: new Date().toISOString() })
        .eq('message_id', messageId);
      if (error) console.warn('[zul] could not mark message:', error.message);
    },

    // ---------------------------------------------------------------- state
    async getConversation(phone) {
      const { data, error } = await supabase.from('zul_conversations').select('*').eq('phone', digitsOnly(phone)).maybeSingle();
      if (error) {
        console.warn('[zul] conversation state unavailable:', error.message);
        return null;
      }
      return data;
    },

    async saveConversation(phone, patch) {
      const row = { phone: digitsOnly(phone), ...patch, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('zul_conversations').upsert(row, { onConflict: 'phone' });
      if (error) console.warn('[zul] could not save conversation state:', error.message);
    },

    async saveConfirmation(waMessageId, phone, payload) {
      if (!waMessageId) return;
      const { error } = await supabase.from('zul_confirmations').insert({
        wa_message_id: waMessageId,
        phone: digitsOnly(phone),
        kind: payload.kind,
        record_ids: payload.ids,
        data: payload.data || {},
      });
      if (error) console.warn('[zul] could not save confirmation:', error.message);
    },

    async getConfirmation(waMessageId, phone) {
      if (!waMessageId) return null;
      const { data, error } = await supabase
        .from('zul_confirmations')
        .select('*')
        .eq('wa_message_id', waMessageId)
        .eq('phone', digitsOnly(phone))
        .maybeSingle();
      if (error) return null;
      return data ? { kind: data.kind, ids: data.record_ids || [], data: data.data || {}, waMessageId } : null;
    },

    // ---------------------------------------------------------------- users
    async findUserByPhone(phone) {
      const variants = phoneVariants(phone);
      const tail = digitsOnly(phone).slice(-8);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('phone', `%${tail}%`)
        .eq('is_active', true)
        .limit(10);
      if (error) throw error;
      const match = (data || []).find((u) => variants.includes(digitsOnly(u.phone)))
        || (data || []).find((u) => variants.some((v) => digitsOnly(u.phone).endsWith(v.slice(-10))));
      if (!match) return null;
      const [{ data: organization }, { data: costCenters }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', match.organization_id).maybeSingle(),
        supabase.from('cost_centers').select('id, name, user_id').eq('organization_id', match.organization_id).eq('is_active', true),
      ]);
      const costCenter = (costCenters || []).find((c) => c.user_id === match.id) || null;
      return { ...match, organization: organization || null, costCenter };
    },

    async updateUser(userId, patch) {
      let { error } = await supabase.from('users').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', userId);
      if (error && isMissingColumn(error)) {
        const { language, currency, ...rest } = patch;
        ({ error } = await supabase.from('users').update(rest).eq('id', userId));
      }
      if (error) throw error;
      if (patch.name) {
        await supabase.from('cost_centers').update({ name: patch.name }).eq('user_id', userId);
      }
    },

    /**
     * Creates auth user (same id, so phone OTP sign-in lands on this row),
     * a solo organization and the public users row.
     */
    async createAccount({ phone, name, language, currency, organizationId = null, role = 'admin' }) {
      const digits = digitsOnly(phone);
      const userId = randomUUID();
      const email = placeholderEmail(digits);
      const displayName = (name || '').trim() || `+${digits}`;

      let authCreated = false;
      try {
        let res = await supabase.auth.admin.createUser({
          id: userId, phone: digits, phone_confirm: true, email, email_confirm: true,
          user_metadata: { name: displayName, source: 'whatsapp', language, currency },
        });
        if (res.error && /email/i.test(res.error.message || '')) {
          res = await supabase.auth.admin.createUser({
            id: userId, phone: digits, phone_confirm: true, user_metadata: { name: displayName, source: 'whatsapp' },
          });
        }
        if (res.error) console.warn('[zul] auth user not created:', res.error.message);
        else authCreated = res.data?.user?.id === userId;
      } catch (err) {
        console.warn('[zul] auth user not created:', err.message);
      }

      let orgId = organizationId;
      let createdOrg = false;
      if (!orgId) {
        orgId = randomUUID();
        const { error: orgError } = await supabase.from('organizations').insert({
          id: orgId,
          name: displayName,
          admin_id: authCreated ? userId : null,
          invite_code: inviteCode(),
          type: 'solo',
        });
        if (orgError) {
          if (authCreated) await supabase.auth.admin.deleteUser(userId).catch(() => {});
          throw orgError;
        }
        createdOrg = true;
      }

      const userRow = {
        id: userId, organization_id: orgId, name: displayName, email, phone: digits,
        phone_verified: true, role, is_active: true, language, currency,
      };
      let { error: userError } = await supabase.from('users').insert(userRow);
      if (userError && isMissingColumn(userError)) {
        const { language: _l, currency: _c, ...rest } = userRow;
        ({ error: userError } = await supabase.from('users').insert(rest));
      }
      if (userError) {
        if (createdOrg) await supabase.from('organizations').delete().eq('id', orgId);
        if (authCreated) await supabase.auth.admin.deleteUser(userId).catch(() => {});
        // Two messages raced to create the same account: use the winner.
        if (isUniqueViolation(userError)) {
          const existing = await db.findUserByPhone(digits);
          if (existing) return existing;
        }
        throw userError;
      }

      // A trigger normally creates the cost center; make sure one exists.
      const { data: cc } = await supabase.from('cost_centers').select('id, name, user_id').eq('user_id', userId).maybeSingle();
      let costCenter = cc;
      if (!costCenter) {
        const { data: created } = await supabase.from('cost_centers').insert({
          organization_id: orgId, name: displayName, user_id: userId, linked_email: email,
          default_split_percentage: createdOrg ? 100 : 50, is_active: true,
        }).select('id, name, user_id').maybeSingle();
        costCenter = created || null;
      }
      const { data: organization } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
      return { ...userRow, organization, costCenter, authCreated };
    },

    async findOrganizationByInviteCode(code) {
      const { data } = await supabase.from('organizations').select('*').eq('invite_code', String(code).toUpperCase()).maybeSingle();
      return data || null;
    },

    async setOrganizationType(orgId, type) {
      await supabase.from('organizations').update({ type }).eq('id', orgId);
    },

    async setOrganizationName(orgId, name) {
      await supabase.from('organizations').update({ name }).eq('id', orgId);
    },

    // ----------------------------------------------------------- categories
    async loadCategories(orgId, kind = 'expense') {
      const types = kind === 'income' ? 'type.eq.income,type.eq.both' : 'type.eq.expense,type.eq.both';
      const [orgRes, globalRes] = await Promise.all([
        supabase.from('budget_categories').select('id, name, organization_id, type').eq('organization_id', orgId).or(types),
        supabase.from('budget_categories').select('id, name, organization_id, type').is('organization_id', null).or(types),
      ]);
      return [...(orgRes.data || []), ...(globalRes.data || [])];
    },

    async createCategory(orgId, { name, kind = 'expense', macro = 'wants' }) {
      const row = { organization_id: orgId, name, type: kind, macro_group: kind === 'income' ? 'income' : macro };
      let { data, error } = await supabase.from('budget_categories').insert(row).select('id, name, organization_id, type').single();
      if (error && isMissingColumn(error)) {
        const { macro_group, ...rest } = row;
        ({ data, error } = await supabase.from('budget_categories').insert(rest).select('id, name, organization_id, type').single());
      }
      if (error && isUniqueViolation(error)) {
        ({ data } = await supabase.from('budget_categories').select('id, name, organization_id, type').eq('organization_id', orgId).eq('name', name).maybeSingle());
        return data;
      }
      if (error) throw error;
      return data;
    },

    // ------------------------------------------------------------- expenses
    async insertExpenses(rows) {
      const { data, error } = await supabase.from('expenses').insert(rows).select('*');
      if (error) throw error;
      return data;
    },

    async getExpenses(ids, orgId) {
      const { data, error } = await supabase.from('expenses').select('*').in('id', ids).eq('organization_id', orgId);
      if (error) throw error;
      return data || [];
    },

    /** Updates the expenses and their installment children. */
    async updateExpenses(ids, patch, orgId) {
      const list = ids.join(',');
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .or(`id.in.(${list}),parent_expense_id.in.(${list})`)
        .eq('organization_id', orgId)
        .select('*');
      if (error) throw error;
      return data || [];
    },

    async deleteExpenses(ids, orgId) {
      const list = ids.join(',');
      // Children first (installments point to the parent).
      await supabase.from('expenses').delete().in('parent_expense_id', ids).eq('organization_id', orgId);
      const { data, error } = await supabase.from('expenses').delete().or(`id.in.(${list})`).eq('organization_id', orgId).select('id');
      if (error) throw error;
      return data || [];
    },

    async createInstallments(params) {
      const { data, error } = await supabase.rpc('create_installments', {
        p_amount: params.amount,
        p_installments: params.installments,
        p_description: params.description,
        p_date: params.date,
        p_card_id: params.cardId,
        p_category_id: params.categoryId,
        p_cost_center_id: params.costCenterId,
        p_owner: params.owner,
        p_organization_id: params.organizationId,
        p_user_id: params.userId,
        p_whatsapp_message_id: params.whatsappMessageId,
      });
      if (error) throw error;
      return data; // parent expense id
    },

    // -------------------------------------------------------------- incomes
    async insertIncome(row) {
      let { data, error } = await supabase.from('incomes').insert(row).select('*').single();
      if (error && isMissingColumn(error)) {
        const { category_id, owner, payment_method, ...rest } = row;
        ({ data, error } = await supabase.from('incomes').insert(rest).select('*').single());
      }
      if (error) throw error;
      return data;
    },
    async updateIncomes(ids, patch, orgId) {
      const { data, error } = await supabase.from('incomes').update(patch).in('id', ids).eq('organization_id', orgId).select('*');
      if (error) throw error;
      return data || [];
    },
    async deleteIncomes(ids, orgId) {
      const { data, error } = await supabase.from('incomes').delete().in('id', ids).eq('organization_id', orgId).select('id');
      if (error) throw error;
      return data || [];
    },

    // ---------------------------------------------------------------- cards
    async listCards(orgId) {
      const { data } = await supabase.from('cards').select('*').eq('organization_id', orgId).eq('is_active', true);
      return data || [];
    },
    async createCard(orgId, { name, closingDay, ownerId }) {
      const dueDay = ((closingDay + 6) % 31) + 1; // assume due ~7 days after closing
      const row = {
        organization_id: orgId, name, bank: name, type: 'credit', card_type: 'credit', closing_day: closingDay,
        billing_day: dueDay, best_day: closingDay, is_active: true, owner_id: ownerId,
      };
      let { data, error } = await supabase.from('cards').insert(row).select('*').single();
      for (let i = 0; error && isMissingColumn(error) && i < 5; i += 1) {
        const missing = (error.message.match(/'(\w+)' column|column "?(\w+)"?/) || []).slice(1).find(Boolean);
        if (!missing || !(missing in row)) break;
        delete row[missing];
        ({ data, error } = await supabase.from('cards').insert(row).select('*').single());
      }
      if (error) throw error;
      return data;
    },
    async updateCard(cardId, patch) {
      const { error } = await supabase.from('cards').update(patch).eq('id', cardId);
      if (error) throw error;
    },

    // ---------------------------------------------------------------- bills
    async insertBill(row) {
      const { data, error } = await supabase.from('bills').insert(row).select('*').single();
      if (error) throw error;
      return data;
    },
    async deleteBills(ids, orgId) {
      const { data, error } = await supabase.from('bills').delete().in('id', ids).eq('organization_id', orgId).select('id');
      if (error) throw error;
      return data || [];
    },

    // -------------------------------------------------------------- budgets
    async upsertBudget({ organizationId, categoryId, limitAmount, monthYear }) {
      const { data: existing } = await supabase
        .from('budgets').select('id').eq('organization_id', organizationId).eq('category_id', categoryId).eq('month_year', monthYear).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('budgets').update({ limit_amount: limitAmount }).eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      }
      const { data, error } = await supabase
        .from('budgets').insert({ organization_id: organizationId, category_id: categoryId, limit_amount: limitAmount, month_year: monthYear })
        .select('id').single();
      if (error) throw error;
      return data.id;
    },
    async listBudgets(orgId, monthYear) {
      const { data } = await supabase.from('budgets').select('id, category_id, limit_amount').eq('organization_id', orgId).eq('month_year', monthYear);
      return data || [];
    },

    // -------------------------------------------------------------- queries
    async listExpenses(orgId, { from, to, categoryIds = null, term = null }) {
      let q = supabase
        .from('expenses')
        .select('id, amount, description, category, category_id, date')
        .eq('organization_id', orgId)
        .eq('status', 'confirmed')
        .gte('date', from)
        .lte('date', to);
      if (categoryIds && term) {
        q = q.or(`category_id.in.(${categoryIds.join(',')}),description.ilike.%${term.replace(/[%,()]/g, ' ')}%`);
      } else if (categoryIds) {
        q = q.in('category_id', categoryIds);
      } else if (term) {
        q = q.ilike('description', `%${term.replace(/[%,()]/g, ' ')}%`);
      }
      const { data, error } = await q.limit(5000);
      if (error) throw error;
      return data || [];
    },
    async listIncomes(orgId, { from, to }) {
      const { data, error } = await supabase
        .from('incomes').select('id, amount, date').eq('organization_id', orgId).eq('status', 'confirmed').gte('date', from).lte('date', to).limit(5000);
      if (error) throw error;
      return data || [];
    },
  };
  return db;
}
