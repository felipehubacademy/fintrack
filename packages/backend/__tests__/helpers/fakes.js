// In-memory fakes for the Zul core (db, WhatsApp, model). Not a test file.
import { digitsOnly } from '../../zul/language.js';

export function createFakeDb() {
  let seq = 1;
  const id = () => `id-${seq++}`;
  const t = {
    processed: new Map(), conversations: new Map(), confirmations: new Map(), users: [], organizations: [],
    categories: [
      { id: 'g-mercado', name: 'Mercado', organization_id: null, type: 'expense' },
      { id: 'g-transporte', name: 'Transporte', organization_id: null, type: 'expense' },
      { id: 'g-lazer', name: 'Lazer', organization_id: null, type: 'expense' },
      { id: 'g-outros', name: 'Outros', organization_id: null, type: 'expense' },
    ],
    expenses: [], incomes: [], cards: [], bills: [], budgets: [], calls: [],
  };
  let expenseId = 100;
  const db = {
    tables: t,
    async claimMessage(messageId) {
      if (t.processed.has(messageId)) return false;
      t.processed.set(messageId, 'processing');
      return true;
    },
    async finishMessage(messageId, status) { t.processed.set(messageId, status); },
    async getConversation(phone) { return t.conversations.get(digitsOnly(phone)) || null; },
    async saveConversation(phone, patch) {
      const key = digitsOnly(phone);
      t.conversations.set(key, { ...(t.conversations.get(key) || {}), phone: key, ...patch });
    },
    async saveConfirmation(waId, phone, payload) { t.confirmations.set(waId, { kind: payload.kind, ids: payload.ids, data: payload.data || {}, phone: digitsOnly(phone) }); },
    async getConfirmation(waId) { const c = t.confirmations.get(waId); return c ? { ...c, waMessageId: waId } : null; },
    async findUserByPhone(phone) {
      const u = t.users.find((x) => x.phone === digitsOnly(phone));
      if (!u) return null;
      return { ...u, organization: t.organizations.find((o) => o.id === u.organization_id), costCenter: { id: `cc-${u.id}`, name: u.name } };
    },
    async updateUser(userId, patch) { Object.assign(t.users.find((u) => u.id === userId), patch); },
    async createAccount({ phone, name, language, currency, organizationId, role = 'admin' }) {
      t.calls.push('createAccount');
      const orgId = organizationId || id();
      if (!organizationId) t.organizations.push({ id: orgId, name: name || phone, type: 'solo', invite_code: 'ABC123' });
      const user = { id: id(), phone: digitsOnly(phone), name: name || `+${digitsOnly(phone)}`, organization_id: orgId, role, language, currency };
      t.users.push(user);
      return { ...user, organization: t.organizations.find((o) => o.id === orgId), costCenter: { id: `cc-${user.id}`, name: user.name } };
    },
    async findOrganizationByInviteCode(code) { return t.organizations.find((o) => o.invite_code === code) || null; },
    async setOrganizationType(orgId, type) { t.organizations.find((o) => o.id === orgId).type = type; },
    async setOrganizationName(orgId, name) { t.organizations.find((o) => o.id === orgId).name = name; },
    async loadCategories(orgId) { return t.categories.filter((c) => c.organization_id === null || c.organization_id === orgId); },
    async createCategory(orgId, { name, kind }) {
      const row = { id: id(), name, organization_id: orgId, type: kind };
      t.categories.push(row);
      return row;
    },
    async insertExpenses(rows) {
      const saved = rows.map((r) => ({ ...r, id: expenseId++ }));
      t.expenses.push(...saved);
      return saved;
    },
    async getExpenses(ids) { return t.expenses.filter((e) => ids.includes(e.id)); },
    async updateExpenses(ids, patch) {
      const rows = t.expenses.filter((e) => ids.includes(e.id) || ids.includes(e.parent_expense_id));
      rows.forEach((r) => Object.assign(r, patch));
      return rows;
    },
    async deleteExpenses(ids) {
      const before = t.expenses.length;
      t.expenses = t.expenses.filter((e) => !ids.includes(e.id) && !ids.includes(e.parent_expense_id));
      return Array.from({ length: before - t.expenses.length }, (_, i) => ({ id: i }));
    },
    async createInstallments() { throw new Error('rpc not available in fake'); },
    async insertIncome(row) { const saved = { ...row, id: id() }; t.incomes.push(saved); return saved; },
    async updateIncomes(ids, patch) { const rows = t.incomes.filter((e) => ids.includes(e.id)); rows.forEach((r) => Object.assign(r, patch)); return rows; },
    async deleteIncomes(ids) { const rows = t.incomes.filter((e) => ids.includes(e.id)); t.incomes = t.incomes.filter((e) => !ids.includes(e.id)); return rows; },
    async listCards(orgId) { return t.cards.filter((c) => c.organization_id === orgId); },
    async createCard(orgId, { name, closingDay }) { const c = { id: id(), organization_id: orgId, name, closing_day: closingDay, type: 'credit' }; t.cards.push(c); return c; },
    async updateCard(cardId, patch) { Object.assign(t.cards.find((c) => c.id === cardId), patch); },
    async insertBill(row) { const saved = { ...row, id: id() }; t.bills.push(saved); return saved; },
    async deleteBills(ids) { const rows = t.bills.filter((b) => ids.includes(b.id)); t.bills = t.bills.filter((b) => !ids.includes(b.id)); return rows; },
    async upsertBudget({ organizationId, categoryId, limitAmount, monthYear }) {
      const existing = t.budgets.find((b) => b.organization_id === organizationId && b.category_id === categoryId && b.month_year === monthYear);
      if (existing) { existing.limit_amount = limitAmount; return existing.id; }
      const b = { id: id(), organization_id: organizationId, category_id: categoryId, limit_amount: limitAmount, month_year: monthYear };
      t.budgets.push(b);
      return b.id;
    },
    async listBudgets(orgId, monthYear) { return t.budgets.filter((b) => b.organization_id === orgId && b.month_year === monthYear); },
    async listExpenses(orgId, { from, to, categoryIds, term }) {
      return t.expenses.filter((e) => e.organization_id === orgId && e.date >= from && e.date <= to
        && (!categoryIds && !term ? true
          : (categoryIds && categoryIds.includes(e.category_id)) || (term && e.description.toLowerCase().includes(term.toLowerCase()))));
    },
    async listIncomes(orgId, { from, to }) { return t.incomes.filter((e) => e.organization_id === orgId && e.date >= from && e.date <= to); },
  };
  return db;
}

export function createFakeWa() {
  let n = 1;
  const sent = [];
  return {
    sent,
    async sendText(to, body) { const wid = `wamid.out${n++}`; sent.push({ to, body, id: wid }); return wid; },
    async sendButtons(to, body, buttons) { const wid = `wamid.out${n++}`; sent.push({ to, body, buttons, id: wid }); return wid; },
    async sendCtaUrl(to, body, label, url) { const wid = `wamid.out${n++}`; sent.push({ to, body, cta: { label, url }, id: wid }); return wid; },
    async sendTemplate(to, name, lang, components) { sent.push({ to, template: name, lang, components }); return `wamid.out${n++}`; },
    async markRead() {},
    async downloadMedia() { return { buffer: Buffer.from('x'), mimeType: 'audio/ogg' }; },
  };
}

/** Model stub: returns queued intents, records calls. */
export function createFakeAi(responses = []) {
  const calls = [];
  return {
    calls,
    available: () => true,
    async interpret(text) { calls.push(text); return responses.shift() ?? null; },
    async interpretImage() { calls.push('[image]'); return responses.shift() ?? null; },
    async transcribe() { calls.push('[audio]'); return responses.shift() ?? ''; },
  };
}

export function textMessage(from, body, { id, context } = {}) {
  return { from, id: id || `wamid.in${Math.random().toString(36).slice(2)}`, type: 'text', text: { body }, ...(context ? { context: { id: context } } : {}) };
}
