#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO - CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://ompulmhcjfzlflbrlwpu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcHVsbWhjamZ6bGZsYnJsd3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTgyODMsImV4cCI6MjA3NTU5NDI4M30.FcohoJlTkk_4Y8GQ7LkSrVynbbCCVJnF3sL30FrgJOc';

async function checkV2Data() {
  console.log('🔍 VERIFICANDO DADOS NAS TABELAS V2...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Verificar organizations
    console.log('🏢 1. ORGANIZATIONS:');
    const { data: orgs, error: orgsError, count: orgsCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact' });

    if (orgsError) {
      console.error('❌ Erro:', orgsError.message);
    } else {
      console.log(`✅ Total: ${orgsCount} organizações`);
      if (orgs && orgs.length > 0) {
        orgs.forEach(org => {
          console.log(`   - ${org.name} (ID: ${org.id})`);
        });
      }
    }
    console.log('');

    // 2. Verificar users
    console.log('👥 2. USERS:');
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (usersError) {
      console.error('❌ Erro:', usersError.message);
    } else {
      console.log(`✅ Total: ${usersCount} usuários`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`   - ${user.name} (${user.email}) - ${user.role} - Org: ${user.organization_id}`);
        });
      }
    }
    console.log('');

    // 3. Verificar cost_centers
    console.log('🎯 3. COST CENTERS:');
    const { data: costCenters, error: costCentersError, count: costCentersCount } = await supabase
      .from('cost_centers')
      .select('*', { count: 'exact' });

    if (costCentersError) {
      console.error('❌ Erro:', costCentersError.message);
    } else {
      console.log(`✅ Total: ${costCentersCount} centros de custo`);
      if (costCenters && costCenters.length > 0) {
        costCenters.forEach(cc => {
          console.log(`   - ${cc.name} (${cc.color}) - Org: ${cc.organization_id} - Ativo: ${cc.is_active}`);
        });
      }
    }
    console.log('');

    // 4. Verificar budget_categories
    console.log('📋 4. BUDGET CATEGORIES:');
    const { data: budgetCats, error: budgetCatsError, count: budgetCatsCount } = await supabase
      .from('budget_categories')
      .select('*', { count: 'exact' });

    if (budgetCatsError) {
      console.error('❌ Erro:', budgetCatsError.message);
    } else {
      console.log(`✅ Total: ${budgetCatsCount} categorias`);
      if (budgetCats && budgetCats.length > 0) {
        budgetCats.forEach(cat => {
          console.log(`   - ${cat.name} - Org: ${cat.organization_id}`);
        });
      }
    }
    console.log('');

    // 5. Verificar budgets
    console.log('💰 5. BUDGETS:');
    const { data: budgets, error: budgetsError, count: budgetsCount } = await supabase
      .from('budgets')
      .select('*', { count: 'exact' });

    if (budgetsError) {
      console.error('❌ Erro:', budgetsError.message);
    } else {
      console.log(`✅ Total: ${budgetsCount} orçamentos`);
      if (budgets && budgets.length > 0) {
        budgets.forEach(budget => {
          console.log(`   - R$ ${budget.amount} - Mês: ${budget.month}/${budget.year} - Org: ${budget.organization_id}`);
        });
      }
    }
    console.log('');

    // 6. Verificar pending_invites
    console.log('📧 6. PENDING INVITES:');
    const { data: invites, error: invitesError, count: invitesCount } = await supabase
      .from('pending_invites')
      .select('*', { count: 'exact' });

    if (invitesError) {
      console.error('❌ Erro:', invitesError.message);
    } else {
      console.log(`✅ Total: ${invitesCount} convites pendentes`);
      if (invites && invites.length > 0) {
        invites.forEach(invite => {
          console.log(`   - ${invite.email} - Código: ${invite.invite_code} - Org: ${invite.organization_id}`);
        });
      }
    }
    console.log('');

    // 7. Verificar allowed_users
    console.log('🔐 7. ALLOWED USERS:');
    const { data: allowedUsers, error: allowedUsersError, count: allowedUsersCount } = await supabase
      .from('allowed_users')
      .select('*', { count: 'exact' });

    if (allowedUsersError) {
      console.error('❌ Erro:', allowedUsersError.message);
    } else {
      console.log(`✅ Total: ${allowedUsersCount} usuários permitidos`);
      if (allowedUsers && allowedUsers.length > 0) {
        allowedUsers.forEach(user => {
          console.log(`   - ${user.email} - Org: ${user.organization_id}`);
        });
      }
    }
    console.log('');

    console.log('✅ VERIFICAÇÃO DE DADOS CONCLUÍDA!');
    
    // Resumo
    console.log('\n📊 RESUMO:');
    console.log(`🏢 Organizations: ${orgsCount || 0}`);
    console.log(`👥 Users: ${usersCount || 0}`);
    console.log(`🎯 Cost Centers: ${costCentersCount || 0}`);
    console.log(`📋 Budget Categories: ${budgetCatsCount || 0}`);
    console.log(`💰 Budgets: ${budgetsCount || 0}`);
    console.log(`📧 Pending Invites: ${invitesCount || 0}`);
    console.log(`🔐 Allowed Users: ${allowedUsersCount || 0}`);

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
checkV2Data();
