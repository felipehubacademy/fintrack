#!/usr/bin/env node

import https from 'https';

const url = 'https://meuazulao.com.br/api/notifications/check-bills-due-tomorrow';
const CRON_SECRET = process.env.CRON_SECRET || 'test-token';

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CRON_SECRET}`
  },
  timeout: 10000
};

console.log('🔍 Testando endpoint:', url);
console.log('📤 Enviando requisição POST...\n');

const req = https.request(url, options, (res) => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Status HTTP: ${res.statusCode}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Resposta:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (res.statusCode === 200) {
      console.log('✅ Sucesso! Endpoint funcionando.');
    } else if (res.statusCode === 401) {
      console.log('❌ Erro de autenticação. Use CRON_SECRET correto.');
    } else if (res.statusCode === 404) {
      console.log('❌ Endpoint não encontrado.');
    } else {
      console.log(`⚠️ Status: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
  if (error.code === 'ENOTFOUND') {
    console.log('💡 Verifique se a URL está correta.');
  } else if (error.code === 'ECONNREFUSED') {
    console.log('💡 Servidor não está respondendo.');
  }
});

req.on('timeout', () => {
  console.error('❌ Timeout na requisição (>10s)');
  req.destroy();
});

req.end();

