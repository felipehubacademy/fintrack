#!/usr/bin/env node

import SmartConversation from './backend/services/smartConversation.js';

async function testRandomMessages() {
  console.log('🧪 TESTANDO MENSAGENS ALEATÓRIAS NO FINTRACK\n');

  const conversation = new SmartConversation();
  const testPhone = '5511978229898'; // Seu número para teste

  const testMessages = [
    // ✅ Mensagens válidas (despesas)
    "Gastei 50 no mercado no débito",
    "Paguei 30 na farmácia",
    "R$ 25 no posto de gasolina para o Felipe",
    
    // ❌ Mensagens aleatórias (não despesas)
    "Olá, como vai?",
    "Boa tarde!",
    "Que horas são?",
    "Como está o tempo hoje?",
    "Vou viajar amanhã",
    "Feliz aniversário!",
    "Qual é a capital do Brasil?",
    "Meu cachorro está doente",
    "Gostaria de falar sobre investimentos",
    "Quero saber sobre o sistema",
    "Preciso de ajuda",
    "Como funciona isso aqui?",
    "Oi, tudo bem?",
    "Bom dia!",
    "Obrigado pela ajuda"
  ];

  console.log('📱 SIMULANDO MENSAGENS ALEATÓRIAS:\n');

  for (const message of testMessages) {
    console.log(`\n📝 Mensagem: "${message}"`);
    console.log('─'.repeat(50));
    
    try {
      const analysis = await conversation.analyzeExpenseMessage(message, testPhone);
      
      if (analysis && analysis.erro === "Mensagem não é sobre despesas") {
        console.log('❌ RESULTADO: Mensagem rejeitada (não é sobre despesas)');
        console.log('💬 RESPOSTA: "💰 Olá! Eu sou o assistente do FinTrack..."');
      } else if (analysis && analysis.valor) {
        console.log('✅ RESULTADO: Despesa detectada');
        console.log(`💰 Valor: R$ ${analysis.valor}`);
        console.log(`📝 Descrição: ${analysis.descricao}`);
        console.log(`📂 Categoria: ${analysis.categoria}`);
        console.log(`💳 Método: ${analysis.metodo_pagamento || 'não especificado'}`);
        console.log(`👤 Responsável: ${analysis.responsavel || 'não especificado'}`);
        console.log(`🎯 Confiança: ${(analysis.confianca * 100).toFixed(0)}%`);
        console.log(`❓ Precisa confirmar: ${analysis.precisa_confirmar ? 'Sim' : 'Não'}`);
      } else {
        console.log('⚠️ RESULTADO: Análise falhou ou retornou null');
        console.log('💬 RESPOSTA: "❌ Não consegui entender sua mensagem..."');
      }
      
    } catch (error) {
      console.log('❌ ERRO: Falha na análise');
      console.log(`🔍 Detalhes: ${error.message}`);
    }
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ TESTE CONCLUÍDO!');
  console.log('\n📋 RESUMO:');
  console.log('✅ Mensagens sobre despesas → Processadas normalmente');
  console.log('❌ Mensagens aleatórias → Recebem orientação educativa');
  console.log('🎯 Sistema focado apenas em gastos e despesas');
}

// Executar teste
testRandomMessages().catch(console.error);
