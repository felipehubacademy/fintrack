#!/usr/bin/env node

/**
 * Script para testar o endpoint localmente
 * Uso: node test-endpoint-local.js
 */

import https from 'https';
import http from 'http';

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-123';
const URLS = [
  'http://localhost:3000',
  'https://fintrack-web.vercel.app',
  'https://meuazulao.com.br'
];

async function testEndpoint(baseUrl, testName) {
  return new Promise((resolve) => {
    const url = new URL(`${baseUrl}/api/notifications/check-bills-due-tomorrow`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      timeout: 5000
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ${testName}`);
    console.log(`📡 URL: ${baseUrl}`);
    console.log(`${'='.repeat(60)}\n`);

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status HTTP: ${res.statusCode}`);
        console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));
        
        if (data) {
          console.log(`\n📄 Resposta:`);
          try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
          } catch (e) {
            console.log(data);
          }
        }
        
        console.log(`\n${res.statusCode === 200 ? '✅' : res.statusCode === 401 ? '⚠️' : '❌'} Resultado: ${res.statusCode === 200 ? 'Sucesso!' : res.statusCode === 401 ? 'Token inválido (mas endpoint funciona!)' : 'Erro'}`);
        
        resolve({
          url: baseUrl,
          status: res.statusCode,
          success: res.statusCode === 200 || res.statusCode === 401
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Erro: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Servidor não está rodando em ${baseUrl}`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   💡 Domínio não encontrado`);
      }
      resolve({
        url: baseUrl,
        status: 0,
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      console.log(`❌ Timeout (>5s)`);
      req.destroy();
      resolve({
        url: baseUrl,
        status: 0,
        success: false,
        error: 'timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Teste do Endpoint: check-bills-due-tomorrow');
  console.log(`🔑 CRON_SECRET: ${CRON_SECRET.substring(0, 10)}...`);
  
  const results = [];
  
  for (const url of URLS) {
    const result = await testEndpoint(url, `Testando ${url}`);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Delay entre testes
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Resumo dos Testes');
  console.log(`${'='.repeat(60)}\n`);
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.url}: ${result.status || 'Erro'}`);
  });
  
  const working = results.find(r => r.success);
  if (working) {
    console.log(`\n✅ Endpoint funcionando em: ${working.url}`);
    console.log(`\n💡 Configure no GitHub Secrets:`);
    console.log(`   APP_URL=${working.url}`);
  } else {
    console.log(`\n❌ Nenhum endpoint funcionando. Verifique:`);
    console.log(`   1. Se o servidor está rodando (para localhost)`);
    console.log(`   2. Se o endpoint está deployado (para Vercel)`);
    console.log(`   3. Se o CRON_SECRET está correto`);
  }
}

runTests().catch(console.error);



