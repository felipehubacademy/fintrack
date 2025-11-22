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

const testPhone = '+5511999888777'; // Phone de teste único

// Limpar estado entre testes
async function cleanTestState() {
  await supabase
    .from('conversation_state')
    .delete()
    .eq('user_phone', testPhone);
}

// Casos de teste
const testCases = [
  // ========================================
  // CATEGORIA 1: INFERÊNCIA DE CATEGORIA
  // ========================================
  {
    id: 1,
    category: 'Inferência de Categoria',
    name: 'Perfume → Beleza (não Impostos)',
    message: 'gastei 250 em perfume no crédito Latam em 5x',
    expected: {
      shouldSave: true,
      category: 'beleza',
      shouldNotHave: ['impostos', 'imposto']
    }
  },
  {
    id: 2,
    category: 'Inferência de Categoria',
    name: 'Torradeira → Casa (não Contas)',
    message: 'comprei uma torradeira por 139 no crédito C6',
    expected: {
      shouldSave: true,
      category: 'casa',
      shouldNotHave: ['contas', 'conta']
    }
  },
  {
    id: 3,
    category: 'Inferência de Categoria',
    name: 'Sacolão → Mercado ou Alimentação (fallback correto)',
    message: 'gastamos 50 no sacolão no dinheiro',
    expected: {
      shouldSave: true,
      category: ['mercado', 'alimentação', 'alimentacao'], // Aceita Mercado (se existir) ou Alimentação (fallback)
      shouldNotHave: ['outros', 'outro']
    }
  },
  {
    id: 4,
    category: 'Inferência de Categoria',
    name: 'Impostos → Impostos (correto)',
    message: 'paguei 106,17 impostos no crédito Roxinho',
    expected: {
      shouldSave: true,
      category: 'impostos',
      shouldNotHave: ['transporte']
    }
  },
  
  // ========================================
  // CATEGORIA 2: MENÇÕES DIRETAS DE RESPONSÁVEL
  // ========================================
  {
    id: 5,
    category: 'Menções Diretas',
    name: 'Gasto do Felipe → responsável=Felipe',
    message: 'gasto do Felipe, 150 mercado no crédito Latam',
    expected: {
      shouldSave: true,
      responsible: 'felipe',
      shouldNotAsk: ['quem pagou', 'responsável', 'foi você']
    }
  },
  {
    id: 6,
    category: 'Menções Diretas',
    name: 'Gasto da família → compartilhado',
    message: 'gasto da família, 200 no supermercado crédito Roxinho',
    expected: {
      shouldSave: true,
      responsible: 'compartilhado',
      shouldNotAsk: ['quem pagou', 'responsável']
    }
  },
  {
    id: 7,
    category: 'Menções Diretas',
    name: 'Compra da Letícia → responsável=Letícia',
    message: 'compra da Letícia, 50 farmácia no pix',
    expected: {
      shouldSave: true,
      responsible: 'letícia',
      shouldNotAsk: ['quem pagou', 'responsável']
    }
  },
  
  // ========================================
  // CATEGORIA 3: CARTÃO → CRÉDITO AUTOMÁTICO
  // ========================================
  {
    id: 8,
    category: 'Cartão → Crédito',
    name: 'Latam mencionado → crédito inferido',
    message: 'gastei 100 em café no Latam',
    expected: {
      shouldSave: true,
      payment: 'crédito',
      card: 'latam',
      shouldNotAsk: ['pagou como', 'forma de pagamento']
    }
  },
  {
    id: 9,
    category: 'Cartão → Crédito',
    name: 'MercadoPago → crédito automático + 10x',
    message: 'compramos uma máquina de lavar por 3299 em 10x no MercadoPago',
    expected: {
      shouldSave: true,
      payment: 'crédito',
      card: 'mercadopago',
      shouldNotAsk: ['pagou como', 'qual cartão']
    }
  },
  
  // ========================================
  // CATEGORIA 4: "À VISTA" = 1 PARCELA
  // ========================================
  {
    id: 10,
    category: 'À Vista',
    name: '"À vista" → 1 parcela',
    message: 'comprei pão por 11,20 no crédito C6, à vista',
    expected: {
      shouldSave: true,
      installments: true, // Difícil verificar número exato, mas não deve perguntar
      shouldNotAsk: ['quantas parcelas', 'parcelado']
    }
  },
  
  // ========================================
  // CATEGORIA 5: ACCENTUAÇÃO
  // ========================================
  {
    id: 11,
    category: 'Accentuação',
    name: '"sacolao" → "Sacolão" com acento',
    message: 'gastamos 80 no sacolao no dinheiro',
    expected: {
      shouldSave: true,
      description: 'sacolão', // Deve ter acento na resposta
      shouldNotHave: ['sacolao']
    }
  },
  
  // ========================================
  // CATEGORIA 6: VERBOS COM PALAVRAS ANTES
  // ========================================
  {
    id: 12,
    category: 'Verbos Individuais',
    name: '"hoje gastei" → responsável=eu',
    message: 'hoje gastei 50 no mercado no débito',
    expected: {
      shouldSave: false, // Falta cartão (débito precisa)
      shouldAsk: ['qual cartão', 'cartão'],
      shouldNotAsk: ['quem pagou', 'responsável', 'foi você']
    }
  },
  {
    id: 13,
    category: 'Verbos Individuais',
    name: '"Zul, gastei" → responsável=eu',
    message: 'Zul, gastei com pão no crédito',
    expected: {
      shouldSave: false, // Falta valor e cartão
      shouldAsk: ['quanto', 'valor', 'qual cartão'],
      shouldNotAsk: ['quem pagou', 'responsável']
    }
  },
  {
    id: 14,
    category: 'Verbos Individuais',
    name: 'Erro transcrição "julgastei"',
    message: 'julgastei 11,79 com material elétrico no crédito Latam à vista',
    expected: {
      shouldSave: true,
      responsible: 'felipe', // Deve inferir "eu" = Felipe
      shouldNotAsk: ['quem pagou']
    }
  }
];

// Executar teste
async function runTest(testCase) {
  await cleanTestState();
  
  const zul = new ZulAssistant();
  
  console.log(`\n📝 Teste ${testCase.id}: ${testCase.name}`);
  console.log(`   Mensagem: "${testCase.message}"`);
  
  try {
    // Processar mensagem
    const result = await zul.processMessage(
      testCase.message,
      testContext.userId,
      testContext.userName,
      testPhone,
      testContext
    );
    
    // Extrair string da resposta (pode ser string direta ou objeto com .message)
    const response = typeof result === 'string' ? result : (result?.message || result?.text || JSON.stringify(result));
    
    console.log(`   Resposta: "${response}"`);
    
    const responseLower = response.toLowerCase();
    let passed = true;
    const checks = [];
    
    // Verificar se deve salvar (sucesso com ✅) ou perguntar
    if (testCase.expected.shouldSave !== undefined) {
      const wasSaved = response.includes('✅') || responseLower.includes('anotado') || responseLower.includes('registrado');
      const saveOk = testCase.expected.shouldSave ? wasSaved : !wasSaved;
      checks.push(`Save ${testCase.expected.shouldSave ? 'esperado' : 'não esperado'}: ${saveOk ? '✅' : '❌'}`);
      if (!saveOk) passed = false;
    }
    
    // Verificar categoria (aceita string ou array)
    if (testCase.expected.category) {
      const expectedCategories = Array.isArray(testCase.expected.category) 
        ? testCase.expected.category 
        : [testCase.expected.category];
      
      const categoryOk = expectedCategories.some(cat => responseLower.includes(cat));
      const categoriesDisplay = expectedCategories.join(' ou ');
      checks.push(`Categoria "${categoriesDisplay}": ${categoryOk ? '✅' : '❌'}`);
      if (!categoryOk) passed = false;
    }
    
    // Verificar responsável
    if (testCase.expected.responsible) {
      const responsibleOk = responseLower.includes(testCase.expected.responsible) || 
                           (testCase.expected.responsible === 'compartilhado' && responseLower.includes('família'));
      checks.push(`Responsável "${testCase.expected.responsible}": ${responsibleOk ? '✅' : '❌'}`);
      if (!responsibleOk) passed = false;
    }
    
    // Verificar pagamento
    if (testCase.expected.payment) {
      const paymentOk = responseLower.includes(testCase.expected.payment);
      checks.push(`Pagamento "${testCase.expected.payment}": ${paymentOk ? '✅' : '❌'}`);
      if (!paymentOk) passed = false;
    }
    
    // Verificar cartão
    if (testCase.expected.card) {
      const cardOk = responseLower.includes(testCase.expected.card);
      checks.push(`Cartão "${testCase.expected.card}": ${cardOk ? '✅' : '❌'}`);
      if (!cardOk) passed = false;
    }
    
    // Verificar descrição
    if (testCase.expected.description) {
      const descOk = responseLower.includes(testCase.expected.description);
      checks.push(`Descrição "${testCase.expected.description}": ${descOk ? '✅' : '❌'}`);
      if (!descOk) passed = false;
    }
    
    // Verificar parcelas (apenas flag)
    if (testCase.expected.installments) {
      const installmentsOk = !responseLower.includes('quantas parcelas') && !responseLower.includes('parcelado');
      checks.push(`Parcelas não perguntadas: ${installmentsOk ? '✅' : '❌'}`);
      if (!installmentsOk) passed = false;
    }
    
    // Verificar o que DEVE perguntar
    if (testCase.expected.shouldAsk && testCase.expected.shouldAsk.length > 0) {
      const askedSomething = testCase.expected.shouldAsk.some(term => responseLower.includes(term.toLowerCase()));
      checks.push(`Perguntou algo esperado: ${askedSomething ? '✅' : '❌'}`);
      if (!askedSomething) passed = false;
    }
    
    // Verificar o que NÃO deve perguntar
    if (testCase.expected.shouldNotAsk && testCase.expected.shouldNotAsk.length > 0) {
      const askedWrong = testCase.expected.shouldNotAsk.some(term => responseLower.includes(term.toLowerCase()));
      checks.push(`NÃO perguntou proibido: ${!askedWrong ? '✅' : '❌'}`);
      if (askedWrong) passed = false;
    }
    
    // Verificar o que NÃO deve ter
    if (testCase.expected.shouldNotHave && testCase.expected.shouldNotHave.length > 0) {
      const hasWrong = testCase.expected.shouldNotHave.some(term => responseLower.includes(term.toLowerCase()));
      checks.push(`NÃO contém proibido: ${!hasWrong ? '✅' : '❌'}`);
      if (hasWrong) passed = false;
    }
    
    console.log(`   Validações: ${checks.join(', ')}`);
    console.log(`   Resultado: ${passed ? '✅ PASSOU' : '❌ FALHOU'}`);
    
    return { passed, category: testCase.category };
    
  } catch (error) {
    console.log(`   ❌ ERRO: ${error.message}`);
    return { passed: false, category: testCase.category };
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🧪 TESTES ABRANGENTES DO ZUL ASSISTANT\n');
  console.log('=' .repeat(80));
  
  const results = {
    'Inferência de Categoria': { passed: 0, total: 0 },
    'Menções Diretas': { passed: 0, total: 0 },
    'Cartão → Crédito': { passed: 0, total: 0 },
    'À Vista': { passed: 0, total: 0 },
    'Accentuação': { passed: 0, total: 0 },
    'Verbos Individuais': { passed: 0, total: 0 }
  };
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results[result.category].total++;
    if (result.passed) results[result.category].passed++;
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // RESUMO FINAL
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTADO GERAL:\n');
  
  let totalPassed = 0;
  let totalTests = 0;
  
  for (const [category, stats] of Object.entries(results)) {
    const percentage = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
    const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
    console.log(`${status} ${category.padEnd(25)} ${percentage}% (${stats.passed}/${stats.total})`);
    totalPassed += stats.passed;
    totalTests += stats.total;
  }
  
  const overallPercentage = Math.round((totalPassed / totalTests) * 100);
  console.log('\n' + '-'.repeat(80));
  console.log(`🎯 TOTAL: ${overallPercentage}% (${totalPassed}/${totalTests}) ${overallPercentage === 100 ? '✅ PERFEITO!' : ''}`);
  console.log('='.repeat(80) + '\n');
  
  process.exit(0);
}

// Executar
runAllTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});
