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
    console.log('🔧 Corrigindo despesa 131...');
    
    // Corrigir split da despesa 131
    const { error: updateError } = await supabase
      .from('expenses')
      .update({ split: true })
      .eq('id', 131)
      .eq('owner', 'Compartilhado');

    if (updateError) {
      console.error('❌ Erro ao corrigir despesa 131:', updateError);
      return res.status(500).json({ error: 'Erro ao corrigir despesa' });
    }

    // Verificar resultado
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, description, owner, split, cost_center_id')
      .eq('id', 131)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao verificar despesa:', fetchError);
      return res.status(500).json({ error: 'Erro ao verificar despesa' });
    }

    console.log('✅ Despesa 131 corrigida:', expense);
    return res.status(200).json({ success: true, expense });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
