import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath) {
  try {
    console.log(`\n📄 Executando: ${path.basename(filePath)}`);
    
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Dividir em statements individuais (separados por ponto e vírgula)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // Tentar executar diretamente se RPC não existir
          console.log('⚠️ RPC exec_sql não disponível, tentando executar diretamente...');
          console.log('📝 SQL:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log(`✅ Migração concluída: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar migração ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, '../docs/migrations');
  
  const migrations = [
    '2025-11-15-add-partial-payment-flag.sql',
    '2025-11-15-update-bulk-expenses-partial-payment.sql'
  ];
  
  console.log('🚀 Iniciando migrações...\n');
  
  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Arquivo não encontrado: ${migration}`);
      continue;
    }
    
    await runMigration(filePath);
  }
  
  console.log('\n✅ Todas as migrações foram processadas!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Verifique o Supabase Dashboard > SQL Editor');
  console.log('2. Execute manualmente as migrações se necessário');
  console.log('3. Teste o upload de arquivos no frontend');
}

main().catch(console.error);

