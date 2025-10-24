import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Verificando função create_installments...');
    
    // Verificar se a função existe e seus parâmetros
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          p.proname as function_name,
          pg_get_function_arguments(p.oid) as arguments,
          pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_installments'
        AND n.nspname = 'public';
      `
    });

    if (error) {
      console.error('❌ Erro ao verificar função:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Função encontrada:', data);
    return res.status(200).json({ success: true, function: data });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
