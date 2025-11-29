#!/usr/bin/env node

/**
 * Script para gerar icon.png a partir do logo_flat.svg
 * 
 * Requisitos:
 * - Node.js instalado
 * - sharp: npm install sharp --save-dev
 * 
 * Uso:
 * node scripts/generate-icon.js
 */

const fs = require('fs');
const path = require('path');

// Verificar se sharp está instalado
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Erro: sharp não está instalado.');
  console.log('📦 Instale com: npm install sharp --save-dev');
  console.log('   ou: cd packages/mobile && npm install sharp --save-dev');
  process.exit(1);
}

const svgPath = path.join(__dirname, '../assets/logo_flat.svg');
const iconPath = path.join(__dirname, '../assets/icon.png');
const adaptiveIconPath = path.join(__dirname, '../assets/adaptive-icon.png');
const splashIconPath = path.join(__dirname, '../assets/splash-icon.png');

// Ler o SVG
let svgContent;
try {
  svgContent = fs.readFileSync(svgPath, 'utf8');
} catch (e) {
  console.error(`❌ Erro ao ler ${svgPath}`);
  console.error(e.message);
  process.exit(1);
}

// Criar versão com fundo branco para o ícone
const svgWithWhiteBg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
  <rect width="1024" height="1024" fill="#FFFFFF"/>
  <g transform="scale(2) translate(256, 256)">
    ${svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || ''}
  </g>
</svg>
`;

// Criar versão com fundo azul para adaptive-icon
const svgWithBlueBg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
  <rect width="1024" height="1024" fill="#2563EB"/>
  <g transform="scale(2) translate(256, 256)">
    ${svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || ''}
  </g>
</svg>
`;

async function generateIcons() {
  try {
    console.log('🎨 Gerando ícones...\n');

    // Gerar icon.png (iOS) - fundo branco
    await sharp(Buffer.from(svgWithWhiteBg))
      .resize(1024, 1024)
      .png()
      .toFile(iconPath);
    console.log('✅ icon.png criado (1024x1024, fundo branco)');

    // Gerar adaptive-icon.png (Android) - fundo azul
    await sharp(Buffer.from(svgWithBlueBg))
      .resize(1024, 1024)
      .png()
      .toFile(adaptiveIconPath);
    console.log('✅ adaptive-icon.png criado (1024x1024, fundo azul)');

    // Gerar splash-icon.png - fundo branco, logo menor
    const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
  <rect width="1024" height="1024" fill="#FFFFFF"/>
  <g transform="scale(1.5) translate(170, 170)">
    ${svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || ''}
  </g>
</svg>
`;
    await sharp(Buffer.from(splashSvg))
      .resize(1024, 1024)
      .png()
      .toFile(splashIconPath);
    console.log('✅ splash-icon.png criado (1024x1024, fundo branco)');

    console.log('\n✨ Todos os ícones foram gerados com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Verifique os arquivos em packages/mobile/assets/');
    console.log('   2. Teste visualmente se os ícones estão corretos');
    console.log('   3. Se necessário, ajuste o tamanho/posição do logo no SVG');
    
  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error.message);
    process.exit(1);
  }
}

generateIcons();

