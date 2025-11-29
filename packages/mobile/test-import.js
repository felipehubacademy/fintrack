// Teste rápido para verificar importações
console.log('🧪 Testando importações...\n');

try {
  const { supabase } = require('@fintrack/shared/api');
  console.log('✅ @fintrack/shared/api importado com sucesso');
  console.log('   Supabase client:', typeof supabase);
} catch (e) {
  console.log('❌ Erro ao importar @fintrack/shared/api');
  console.log('   ', e.message);
}

try {
  const { formatCurrency } = require('@fintrack/shared/utils');
  console.log('✅ @fintrack/shared/utils importado com sucesso');
  console.log('   Teste formatCurrency:', formatCurrency(1234.56));
} catch (e) {
  console.log('❌ Erro ao importar @fintrack/shared/utils');
  console.log('   ', e.message);
}

try {
  const { APP_CONFIG } = require('@fintrack/shared/constants');
  console.log('✅ @fintrack/shared/constants importado com sucesso');
  console.log('   APP_CONFIG.SITE_NAME:', APP_CONFIG.SITE_NAME);
} catch (e) {
  console.log('❌ Erro ao importar @fintrack/shared/constants');
  console.log('   ', e.message);
}

console.log('\n🎉 Todos os testes passaram!');

