#!/usr/bin/env node

/**
 * Script para converter arquivos SVG em strings JavaScript
 * 
 * Uso:
 *   1. Coloque seus arquivos SVG em packages/mobile/src/assets/banks/
 *   2. Execute: node packages/mobile/scripts/convert-svgs-to-js.js
 *   3. O script atualizará bankLogos.js automaticamente
 */

const fs = require('fs');
const path = require('path');

const banksDir = path.join(__dirname, '../src/assets/banks');
const outputFile = path.join(banksDir, 'bankLogos.js');

// Mapeamento de nomes de arquivos para chaves do objeto
const bankMapping = {
  'nubank.svg': 'nubank',
  'itau.svg': 'itau',
  'itaú.svg': 'itau',
  'bradesco.svg': 'bradesco',
  'bb.svg': 'bb',
  'banco-do-brasil.svg': 'bb',
  'santander.svg': 'santander',
  'inter.svg': 'inter',
  'banco-inter.svg': 'inter',
  'c6.svg': 'c6',
  'c6bank.svg': 'c6',
  'caixa.svg': 'caixa',
  'caixabank.svg': 'caixa',
  'cef.svg': 'caixa',
  'btg.svg': 'btg',
  'btg-pactual.svg': 'btg',
  'original.svg': 'original',
  'neon.svg': 'neon',
  'picpay.svg': 'picpay',
  'PicPay.svg': 'picpay',
  'mercadopago.svg': 'mercadopago',
  'mercado-pago.svg': 'mercadopago',
  'xp.svg': 'xp',
  'xp-investimentos.svg': 'xp',
  'banrisul.svg': 'banrisul',
  'bmg.svg': 'bmg',
  'bv.svg': 'bv',
  'safra.svg': 'safra',
  'sicoob.svg': 'sicoob',
  'sicredi.svg': 'sicredi',
};

// Lista de bancos esperados
const expectedBanks = [
  'nubank',
  'itau',
  'bradesco',
  'bb',
  'santander',
  'inter',
  'c6',
  'caixa',
  'caixabank',
  'btg',
  'original',
  'neon',
  'picpay',
  'mercadopago',
  'xp',
  'banrisul',
  'bmg',
  'bv',
  'safra',
  'sicoob',
  'sicredi',
];

function readSvgFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function findSvgFiles() {
  const files = fs.readdirSync(banksDir);
  return files.filter(file => file.endsWith('.svg'));
}

function generateBankLogosJs(svgMap) {
  const header = `/**
 * Bank Logos SVG Strings
 * 
 * Este arquivo é gerado automaticamente pelo script convert-svgs-to-js.js
 * Para atualizar, execute: node packages/mobile/scripts/convert-svgs-to-js.js
 * 
 * OU edite manualmente adicionando seus SVGs como strings abaixo.
 */

`;

  let bankLogosObject = 'export const bankLogos = {\n';
  
  // Adiciona os SVGs encontrados
  for (const [key, svg] of Object.entries(svgMap)) {
    if (svg) {
      // Escapa quebras de linha e formata
      const escapedSvg = svg
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\${/g, '\\${');
      
      bankLogosObject += `  ${key}: \`${escapedSvg}\`,\n`;
    } else {
      bankLogosObject += `  ${key}: null, // Adicione o SVG aqui\n`;
    }
  }
  
  bankLogosObject += '};\n\n';

  const getBankLogoSvgFunction = `/**
 * Retorna o SVG string do banco (se existir)
 */
export function getBankLogoSvg(bankName) {
  // Normaliza o nome do banco
  const normalized = bankName?.toLowerCase().trim();
  
  // Mapeamento de nomes alternativos
  const aliases = {
    'caixa': 'caixa',
    'caixabank': 'caixa',
    'cef': 'caixa',
    'banco do brasil': 'bb',
    'banco brasil': 'bb',
  };
  
  const key = aliases[normalized] || normalized;
  return bankLogos[key] || null;
}
`;

  return header + bankLogosObject + getBankLogoSvgFunction;
}

// Execução principal
console.log('🔍 Procurando arquivos SVG em:', banksDir);

const svgFiles = findSvgFiles();
console.log(`📁 Encontrados ${svgFiles.length} arquivos SVG`);

const svgMap = {};
const foundBanks = new Set();

// Inicializa o mapa com null para todos os bancos esperados
expectedBanks.forEach(bank => {
  svgMap[bank] = null;
});

// Processa cada arquivo SVG encontrado
svgFiles.forEach(file => {
  const filePath = path.join(banksDir, file);
  const bankKey = bankMapping[file.toLowerCase()];
  
  if (bankKey) {
    const svgContent = readSvgFile(filePath);
    if (svgContent) {
      svgMap[bankKey] = svgContent;
      foundBanks.add(bankKey);
      console.log(`✅ Processado: ${file} → ${bankKey}`);
    } else {
      console.log(`⚠️  Erro ao ler: ${file}`);
    }
  } else {
    console.log(`⚠️  Arquivo não mapeado: ${file} (adicione ao bankMapping se necessário)`);
  }
});

// Trata caixa e caixabank como o mesmo
if (svgMap.caixa) {
  svgMap.caixabank = svgMap.caixa;
}

// Gera o arquivo JavaScript
const jsContent = generateBankLogosJs(svgMap);
fs.writeFileSync(outputFile, jsContent, 'utf8');

console.log(`\n✅ Arquivo atualizado: ${outputFile}`);
console.log(`📊 Bancos com SVG: ${foundBanks.size}/${expectedBanks.length}`);

if (foundBanks.size < expectedBanks.length) {
  const missing = expectedBanks.filter(bank => !foundBanks.has(bank) && bank !== 'caixabank');
  if (missing.length > 0) {
    console.log(`\n⚠️  Bancos sem SVG: ${missing.join(', ')}`);
    console.log('   Adicione os arquivos SVG na pasta e execute o script novamente.');
  }
}

console.log('\n✨ Pronto! Os SVGs estão prontos para uso.');

