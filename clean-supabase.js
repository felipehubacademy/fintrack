import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_KEY não encontrados no .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧹 LIMPANDO TABELA EXPENSES...\n');

try {
  // Contar registros antes
  const { count: beforeCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Registros encontrados: ${beforeCount}`);
  
  if (beforeCount === 0) {
    console.log('✅ Tabela já está vazia!');
    process.exit(0);
  }
  
  // Deletar todos os registros
  const { error } = await supabase
    .from('expenses')
    .delete()
    .neq('id', 0); // Deleta todos (neq 0 = not equal to 0, pega todos os IDs)
  
  if (error) {
    console.error('❌ Erro ao deletar:', error);
    process.exit(1);
  }
  
  // Verificar se está vazio
  const { count: afterCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Limpeza concluída!`);
  console.log(`📊 Registros deletados: ${beforeCount}`);
  console.log(`📊 Registros restantes: ${afterCount}`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}

