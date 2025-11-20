import dotenv from 'dotenv';
dotenv.config();

import ZulAssistant from './services/zulAssistant.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mock context para testes
const testContext = {
  userName: 'Felipe Xavier',
  userId: '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92',
  organizationId: '9fad4881-65a9-4e38-ad75-b707ddff473f',
  organizationType: 'family',
  organizationName: 'Família Xavier',
  isSoloUser: false,
  availableCards: ['Latam', 'C6', 'Neon', 'Roxinho', 'Hub', 'MercadoPago', 'XP']
};

const testPhone = '+5511999999999'; // Phone de teste

// Casos de teste
const testCases = [
  {
    id: 1,
    name: 'Verbo Individual: gastei (com descrição parcial)',
    message: 'Zul, gastei com pão no crédito',
    expected: {
      responsible: 'eu',
      shouldAsk: ['valor', 'cartão'], // Deve perguntar valor e cartão
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 2,
    name: 'Verbo Individual: comprei (completo)',
    message: 'comprei uma televisão por 1500 reais em 5x no crédito Latam',
    expected: {
      responsible: 'eu',
      shouldAsk: [], // Não deve perguntar nada, deve chamar save_expense direto
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 3,
    name: 'Verbo Individual: paguei',
    message: 'paguei 106,17 impostos, foi no crédito uma vez no Roxinho',
    expected: {
      responsible: 'eu',
      shouldAsk: [], // Não deve perguntar nada
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 4,
    name: 'Verbo Compartilhado: gastamos',
    message: 'gastamos R$ 47, crédito Latam',
    expected: {
      responsible: 'compartilhado',
      shouldAsk: ['descrição', 'o que'], // Deve perguntar apenas descrição
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 5,
    name: 'Verbo Compartilhado: compramos',
    message: 'compramos uma máquina de lavar louça por R$ 3.299,00, divididos em 10 vezes no cartão Mercado Pago',
    expected: {
      responsible: 'compartilhado',
      shouldAsk: [], // Não deve perguntar nada
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 6,
    name: 'Sem verbo - deve perguntar responsável',
    message: '150 mercado no crédito',
    expected: {
      responsible: null,
      shouldAsk: ['responsável', 'quem', 'é você'], // DEVE perguntar responsável
      shouldNotAsk: []
    }
  },
  {
    id: 7,
    name: 'Menção direta: gasto do Felipe',
    message: 'gasto do Felipe, 150 mercado no crédito Latam',
    expected: {
      responsible: 'Felipe',
      shouldAsk: [], // Não deve perguntar nada
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 8,
    name: 'Menção direta: gasto da família',
    message: 'gasto da família, 200 no supermercado crédito Roxinho',
    expected: {
      responsible: 'compartilhado',
      shouldAsk: [], // Não deve perguntar nada
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 9,
    name: 'Verbo com erro de transcrição: julgastei (já normalizado)',
    message: 'gastei R$ 11,79 com material elétrico, foi no crédito Latam, à vista',
    expected: {
      responsible: 'eu',
      shouldAsk: [], // Não deve perguntar nada
      shouldNotAsk: ['responsável', 'quem pagou']
    }
  },
  {
    id: 10,
    name: 'Verbo no meio: hoje gastei',
    message: 'hoje gastei 50 no mercado no débito',
    expected: {
      responsible: 'eu',
      shouldAsk: ['cartão'], // Deve perguntar apenas qual cartão (débito precisa de cartão)
      shouldNotAsk: ['responsável', 'quem pagou', 'valor']
    }
  }
];

async function clearTestHistory() {
  console.log('🧹 Limpando histórico de teste...\n');
  const { error } = await supabase
    .from('conversation_state')
    .delete()
    .eq('user_phone', testPhone);
  
  if (error) {
    console.error('❌ Erro ao limpar histórico:', error);
  }
}

async function runTest(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTE ${testCase.id}: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📨 Mensagem: "${testCase.message}"`);
  console.log(`🎯 Esperado: responsável="${testCase.expected.responsible}"`);
  
  if (testCase.expected.shouldAsk.length > 0) {
    console.log(`   Deve perguntar sobre: ${testCase.expected.shouldAsk.join(', ')}`);
  }
  if (testCase.expected.shouldNotAsk.length > 0) {
    console.log(`   NÃO deve perguntar sobre: ${testCase.expected.shouldNotAsk.join(', ')}`);
  }
  
  console.log(`\n⏳ Processando...`);
  
  try {
    const zul = new ZulAssistant();
    const result = await zul.processMessage(
      testCase.message,
      testContext.userId,
      testContext.userName,
      testPhone,
      testContext
    );
    
    // O result pode ser um objeto se houver erro, vamos garantir que é string
    const responseText = typeof result === 'string' ? result : 
                        (result?.message || result?.text || JSON.stringify(result));
    
    console.log(`\n💬 Resposta do Zul:\n"${responseText}"\n`);
    
    // Análise da resposta
    const responseLower = responseText.toLowerCase();
    let passed = true;
    const issues = [];
    
    // Verificar se perguntou sobre responsável quando NÃO deveria
    if (testCase.expected.shouldNotAsk.length > 0) {
      for (const topic of testCase.expected.shouldNotAsk) {
        if (responseLower.includes(topic)) {
          passed = false;
          issues.push(`❌ ERRO: Perguntou sobre "${topic}" mas NÃO deveria!`);
        }
      }
    }
    
    // Verificar se perguntou sobre o que deveria
    if (testCase.expected.shouldAsk.length > 0) {
      let askedAboutSomethingExpected = false;
      for (const topic of testCase.expected.shouldAsk) {
        if (responseLower.includes(topic)) {
          askedAboutSomethingExpected = true;
          break;
        }
      }
      
      // Se esperava perguntar algo mas não perguntou nada relevante
      if (!askedAboutSomethingExpected) {
        // Verificar se foi salvo direto (contém "✅" ou "Registrado" ou "Pronto")
        const wasSaved = responseLower.includes('✅') || 
                        responseLower.includes('registrado') || 
                        responseLower.includes('pronto') ||
                        responseLower.includes('joia');
        
        if (wasSaved && testCase.expected.shouldAsk.length > 0) {
          passed = false;
          issues.push(`❌ ERRO: Salvou direto mas deveria perguntar sobre: ${testCase.expected.shouldAsk.join(', ')}`);
        }
      }
    }
    
    // Verificar se salvou quando deveria
    if (testCase.expected.shouldAsk.length === 0) {
      const wasSaved = responseLower.includes('✅') || 
                      responseLower.includes('registrado') || 
                      responseLower.includes('pronto') ||
                      responseLower.includes('joia');
      
      if (!wasSaved) {
        passed = false;
        issues.push(`❌ ERRO: Deveria ter salvado direto mas perguntou algo!`);
      }
    }
    
    // Resultado final
    console.log(`\n${'─'.repeat(80)}`);
    if (passed) {
      console.log(`✅ TESTE PASSOU!`);
    } else {
      console.log(`❌ TESTE FALHOU!`);
      issues.forEach(issue => console.log(issue));
    }
    console.log(`${'─'.repeat(80)}`);
    
    return { testCase, result, passed, issues };
    
  } catch (error) {
    console.error(`\n❌ ERRO ao executar teste:`, error.message);
    console.log(`${'─'.repeat(80)}`);
    return { testCase, result: null, passed: false, issues: [error.message] };
  } finally {
    // Limpar histórico após cada teste
    await clearTestHistory();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1s entre testes
  }
}

async function runAllTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    TESTE DE DETECÇÃO DE VERBOS - ZUL                       ║
║                    Total de testes: ${testCases.length}                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
  
  await clearTestHistory();
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
  }
  
  // Relatório final
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`                          RELATÓRIO FINAL`);
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total de testes: ${testCases.length}`);
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📊 Taxa de sucesso: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log(`\n🔍 TESTES QUE FALHARAM:\n`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ${r.testCase.id}. ${r.testCase.name}`);
      r.issues.forEach(issue => console.log(`      ${issue}`));
    });
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
  
  // Limpar histórico final
  await clearTestHistory();
  
  process.exit(failed > 0 ? 1 : 0);
}

// Executar testes
runAllTests().catch(console.error);

