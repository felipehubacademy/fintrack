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

const testPhone = '+5511888888888'; // Phone de teste diferente

// Casos de teste para INFORMAÇÕES FALTANDO
const testCases = [
  {
    id: 1,
    name: 'SEM VALOR - deve perguntar quanto foi',
    message: 'gastei no mercado no pix',
    expected: {
      shouldAsk: ['quanto', 'valor', 'qual foi o valor'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 2,
    name: 'SEM DESCRIÇÃO - deve perguntar o que foi',
    message: 'gastei 50 reais no crédito Latam',
    expected: {
      shouldAsk: ['o que', 'qual', 'comprou', 'que foi', 'descrição'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 3,
    name: 'SEM FORMA DE PAGAMENTO - deve perguntar como pagou',
    message: 'gastei 80 no barbeiro',
    expected: {
      shouldAsk: ['como', 'pagou', 'forma', 'pix', 'crédito', 'débito', 'dinheiro'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 4,
    name: 'SEM CARTÃO (crédito sem especificar) - deve perguntar qual cartão',
    message: 'comprei uma TV por 1500 no crédito em 3x',
    expected: {
      shouldAsk: ['qual cartão', 'cartão', 'qual foi o cartão'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 5,
    name: 'DESCRIÇÃO NONSENSE (incompreensível) - deve perguntar ou pedir esclarecimento',
    message: 'gastei 25 reais no furuti no pix',
    expected: {
      shouldAsk: ['furuti', 'o que', 'seria', 'hortifruti', 'pode esclarecer', 'não entendi'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 6,
    name: 'DESCRIÇÃO GENÉRICA (compramos) - deve perguntar o que compraram',
    message: 'compramos 47 reais no crédito Latam',
    expected: {
      shouldAsk: ['o que', 'compraram', 'qual', 'que foi'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto', 'quem pagou']
    }
  },
  {
    id: 7,
    name: 'DESCRIÇÃO APENAS VERBO - deve rejeitar e perguntar',
    message: 'gastei 100 reais gastamos no pix',
    expected: {
      shouldAsk: ['o que', 'compraram', 'qual', 'gastou', 'descrição'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 8,
    name: 'MÚLTIPLAS INFORMAÇÕES FALTANDO - deve perguntar uma por vez',
    message: 'gastei alguma coisa',
    expected: {
      shouldAsk: ['quanto', 'valor', 'o que', 'como', 'pagou'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 9,
    name: 'DESCRIÇÃO COM ERRO DE TRANSCRIÇÃO - deve tentar interpretar ou perguntar',
    message: 'gastei 30 reais no portefruti no dinheiro',
    expected: {
      shouldAsk: ['portefruti', 'o que seria', 'hortifruti', 'pode esclarecer'],
      shouldNotAsk: ['salvo', '✅', 'registrado', 'pronto']
    }
  },
  {
    id: 10,
    name: 'TUDO OK MAS DESCRIÇÃO CURTA (deve aceitar se for clara) - barbeiro é válido',
    message: 'gastei 80 no barbeiro no pix',
    expected: {
      shouldAsk: [], // Não deve perguntar nada - deve salvar direto
      shouldNotAsk: ['o que', 'qual', 'como']
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
  
  if (testCase.expected.shouldAsk.length > 0) {
    console.log(`   ✅ Deve perguntar sobre (pelo menos um): ${testCase.expected.shouldAsk.join(', ')}`);
  }
  if (testCase.expected.shouldNotAsk.length > 0) {
    console.log(`   ❌ NÃO deve: ${testCase.expected.shouldNotAsk.join(', ')}`);
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
    
    const responseText = typeof result === 'string' ? result : 
                        (result?.message || result?.text || JSON.stringify(result));
    
    console.log(`\n💬 Resposta do Zul:\n"${responseText}"\n`);
    
    // Análise da resposta
    const responseLower = responseText.toLowerCase();
    let passed = true;
    const issues = [];
    
    // Verificar se NÃO fez o que não deveria (ex: salvar quando falta info)
    if (testCase.expected.shouldNotAsk.length > 0) {
      for (const topic of testCase.expected.shouldNotAsk) {
        if (responseLower.includes(topic.toLowerCase())) {
          passed = false;
          issues.push(`❌ ERRO: Fez "${topic}" mas NÃO deveria (falta informação obrigatória)!`);
        }
      }
    }
    
    // Verificar se perguntou pelo menos UMA coisa esperada
    if (testCase.expected.shouldAsk.length > 0) {
      let askedAboutSomethingExpected = false;
      for (const topic of testCase.expected.shouldAsk) {
        if (responseLower.includes(topic.toLowerCase())) {
          askedAboutSomethingExpected = true;
          console.log(`   ✅ Perguntou sobre: "${topic}"`);
          break;
        }
      }
      
      if (!askedAboutSomethingExpected) {
        passed = false;
        issues.push(`❌ ERRO: Não perguntou sobre nenhum dos tópicos esperados: ${testCase.expected.shouldAsk.join(', ')}`);
      }
    } else {
      // Caso especial: deve salvar direto (tudo OK)
      const wasSaved = responseLower.includes('✅') || 
                      responseLower.includes('registrado') || 
                      responseLower.includes('pronto') ||
                      responseLower.includes('joia') ||
                      responseLower.includes('anotado');
      
      if (!wasSaved) {
        passed = false;
        issues.push(`❌ ERRO: Deveria ter salvado direto (todas informações presentes) mas perguntou algo!`);
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
║              TESTE DE INFORMAÇÕES FALTANDO E NONSENSE - ZUL                ║
║                          Total de testes: ${testCases.length}                                       ║
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

