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
    console.log('🧪 Testando create_installments...');
    
    const { data, error } = await supabase.rpc('create_installments', {
      p_amount: 100,
      p_installments: 1,
      p_description: 'Teste API',
      p_date: '2025-10-23',
      p_card_id: 'c2a5c5b1-69c1-47bf-a303-add3c872e09a',
      p_category_id: '8fed02aa-caa5-48ca-af21-b969d7adb452',
      p_cost_center_id: null, // Compartilhado
      p_owner: 'Compartilhado',
      p_organization_id: '092adfb3-41d8-4006-bfa5-7035338560e9',
      p_user_id: 'ca227254-bfdf-47f1-899c-e2117542a092',
      p_whatsapp_message_id: null
    });

    if (error) {
      console.error('❌ Erro na função:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Sucesso, ID criado:', data);
    return res.status(200).json({ success: true, expenseId: data });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
