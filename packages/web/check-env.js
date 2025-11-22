#!/usr/bin/env node

/**
 * Script para verificar e configurar variáveis de ambiente do Supabase
 * Execute: node check-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verificando variáveis de ambiente do Supabase...\n');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let allPresent = true;
const missingVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const preview = value ? `${value.substring(0, 30)}...` : 'FALTANDO';
  
  console.log(`${status} ${varName}`);
  console.log(`   ${preview}\n`);
  
  if (!value) {
    allPresent = false;
    missingVars.push(varName);
  }
});

if (allPresent) {
  console.log('✅ Todas as variáveis estão configuradas!\n');
  console.log('Se ainda houver erros, verifique:');
  console.log('1. Se o servidor Next.js foi reiniciado após adicionar as variáveis');
  console.log('2. Se há conexão com a internet');
  console.log('3. Se as chaves estão corretas no dashboard do Supabase\n');
  process.exit(0);
}

// Variáveis faltando - oferecer ajuda
console.log('❌ Variáveis faltando!\n');
console.log('═══════════════════════════════════════════════════════════════\n');

const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 O arquivo .env.local não existe. Criando template...\n');
  
  const template = `# Supabase Configuration
# Obtenha essas chaves em: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/settings/api

# URL do projeto Supabase (Project URL)
NEXT_PUBLIC_SUPABASE_URL=https://niyqusfrurutumqnopbm.supabase.co

# Chave pública anon (anon public key)
# Esta chave já está correta (aparece nos logs do WebSocket)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5peXF1c2ZydXJ1dHVtcW5vcGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDMyODksImV4cCI6MjA3NzExOTI4OX0.hIfOF4Ee0GSH651j4K6-6fd-QgyRocw3fkdq2ZNFMxw

# ⚠️ Chave privada service_role (service_role key)
# COPIE do dashboard: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/settings/api
# NUNCA compartilhe esta chave ou faça commit dela!
SUPABASE_SERVICE_ROLE_KEY=cole_aqui_a_service_role_key_do_dashboard
`;

  try {
    fs.writeFileSync(envPath, template);
    console.log('✅ Arquivo .env.local criado com sucesso!\n');
    console.log('📍 Localização: ' + envPath + '\n');
  } catch (error) {
    console.error('❌ Erro ao criar .env.local:', error.message);
    process.exit(1);
  }
}

console.log('📝 PRÓXIMOS PASSOS:\n');
console.log('1. Abra o arquivo .env.local:');
console.log('   ' + envPath + '\n');

console.log('2. Acesse o dashboard do Supabase:');
console.log('   https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/settings/api\n');

console.log('3. Copie a SERVICE_ROLE_KEY do dashboard e cole no .env.local\n');

console.log('4. Salve o arquivo e reinicie o servidor:');
console.log('   npm run dev\n');

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('💡 IMPORTANTE:');
console.log('   - ANON_KEY: chave pública (já está configurada)');
console.log('   - SERVICE_ROLE_KEY: chave privada (você precisa copiar do dashboard)');
console.log('   - NUNCA faça commit do arquivo .env.local!\n');

console.log('🔗 Links úteis:');
console.log('   - Dashboard do projeto: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm');
console.log('   - API Settings: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/settings/api\n');

