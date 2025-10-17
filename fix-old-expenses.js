import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function fixOldExpenses() {
  console.log('🔧 Corrigindo expenses antigas...\n');

  try {
    // 1. Buscar expenses com owner null
    const { data: expensesWithNullOwner, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .is('owner', null)
      .not('conversation_state', 'is', null);

    if (fetchError) {
      console.log('❌ Erro ao buscar expenses:', fetchError.message);
      return;
    }

    console.log(`📊 Encontradas ${expensesWithNullOwner.length} expenses com owner null`);

    // 2. Para cada expense, extrair dados do conversation_state
    for (const expense of expensesWithNullOwner) {
      try {
        const conversationState = expense.conversation_state;
        if (!conversationState) continue;

        console.log(`\n🔍 Processando expense ID ${expense.id}:`);
        console.log(`  - Valor: R$ ${expense.amount}`);
        console.log(`  - Descrição: ${expense.description}`);
        console.log(`  - Conversation State:`, JSON.stringify(conversationState, null, 2));

        // Extrair responsável do conversation_state
        const responsavel = conversationState.responsavel;
        if (!responsavel) {
          console.log(`  ❌ Sem responsável no conversation_state`);
          continue;
        }

        // Buscar centro de custo
        const { data: costCenters, error: ccError } = await supabase
          .from('cost_centers')
          .select('*')
          .eq('organization_id', expense.organization_id)
          .eq('name', responsavel);

        if (ccError || !costCenters || costCenters.length === 0) {
          console.log(`  ❌ Centro de custo "${responsavel}" não encontrado`);
          continue;
        }

        const costCenter = costCenters[0];
        console.log(`  ✅ Centro de custo encontrado: ${costCenter.name} (ID: ${costCenter.id})`);

        // Buscar categoria
        let categoryId = null;
        const categoria = conversationState.categoria || expense.category;
        if (categoria) {
          const { data: categories, error: catError } = await supabase
            .from('budget_categories')
            .select('*')
            .eq('organization_id', expense.organization_id)
            .eq('name', categoria);

          if (!catError && categories && categories.length > 0) {
            categoryId = categories[0].id;
            console.log(`  ✅ Categoria encontrada: ${categoria} (ID: ${categoryId})`);
          } else {
            console.log(`  ⚠️ Categoria "${categoria}" não encontrada`);
          }
        }

        // Atualizar expense
        const updateData = {
          owner: responsavel,
          category_id: categoryId,
          cost_center_id: costCenter.id
        };

        const { error: updateError } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', expense.id);

        if (updateError) {
          console.log(`  ❌ Erro ao atualizar: ${updateError.message}`);
        } else {
          console.log(`  ✅ Atualizada com sucesso!`);
          console.log(`    - Owner: ${responsavel}`);
          console.log(`    - Category ID: ${categoryId}`);
          console.log(`    - Cost Center ID: ${costCenter.id}`);
        }

      } catch (error) {
        console.log(`  ❌ Erro ao processar expense ${expense.id}:`, error.message);
      }
    }

    console.log('\n✅ Processo concluído!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

fixOldExpenses();

