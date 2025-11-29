import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { Building2 } from 'lucide-react-native';
import { colors } from '../../theme';
import { getBankLogoSvgOrAppLogo } from '../../assets/banks/availableBanks';

/**
 * BankIcon - Exibe o logo do banco
 * Detecta automaticamente o banco pelo nome
 * 
 * PRIORIDADE:
 * 1. Imagens locais (packages/mobile/src/assets/banks/) - RECOMENDADO
 * 2. Simple Icons (apenas 4 bancos disponíveis)
 * 3. Fallback com cor do banco
 * 
 * Para adicionar logos dos principais bancos:
 * 1. Abra packages/mobile/src/assets/banks/bankLogos.js
 * 2. Cole o conteúdo SVG de cada banco no objeto bankLogos
 * 3. Os logos aparecerão automaticamente!
 */
export function BankIcon({ bankName, size = 40, style, light = false }) {
  // Se não tiver nome de banco ou for vazio, usa logo da app
  if (!bankName || bankName.trim() === '') {
    const logoSvg = getBankLogoSvgOrAppLogo('other');
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <SvgXml
          xml={logoSvg}
          width={size}
          height={size}
        />
      </View>
    );
  }

  const bank = detectBank(bankName);
  
  // Se não detectar banco, usa logo da app
  if (!bank) {
    const logoSvg = getBankLogoSvgOrAppLogo('other');
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <SvgXml
          xml={logoSvg}
          width={size}
          height={size}
        />
      </View>
    );
  }

  // PRIORIDADE 1: Tentar carregar SVG local ou logo da app
  const logoSvg = getBankLogoSvgOrAppLogo(bank);
  if (logoSvg) {
    // Para Neon e Nubank, aumentar o tamanho para compensar viewBox grande (2500x2500)
    // O conteúdo real ocupa menos espaço dentro do viewBox, então precisamos aumentar mais
    const needsScaleUp = bank === 'neon' || bank === 'nubank';
    const displaySize = needsScaleUp ? size * 1.5 : size; // 50% maior para Neon e Nubank
    
    // Para Mercado Pago, preservar cores originais mesmo com light=true
    // O SVG do Mercado Pago tem cores definidas em classes CSS, precisamos garantir que sejam aplicadas
    let processedSvg = logoSvg;
    
    // Se for Mercado Pago, garantir que as cores sejam preservadas
    // O SVG tem classes CSS (.st0, .st1, .st2) que definem cores, mas podem não ser aplicadas corretamente
    // Vamos substituir as classes por atributos fill diretos para garantir renderização correta
    if (bank === 'mercadopago') {
      // Substituir classes CSS por atributos fill diretos nos elementos
      // st0 = #28316b (azul escuro), st1 = #50b4e9 (azul claro), st2 = #fff (branco)
      processedSvg = logoSvg
        .replace(/class="st0"/g, 'fill="#28316b"') // Azul escuro
        .replace(/class="st1"/g, 'fill="#50b4e9"') // Azul claro
        .replace(/class="st2"/g, 'fill="#ffffff"'); // Branco
    } else if (light) {
      // Para outros bancos com light=true, tentar converter cores escuras para branco
      // Mas apenas se o SVG não tiver cores definidas em classes CSS
      if (!logoSvg.includes('<style>') && !logoSvg.includes('class=')) {
        // SVG simples sem classes CSS, pode tentar converter cores escuras para branco
        processedSvg = logoSvg.replace(/fill="#000000"/g, 'fill="#FFFFFF"')
                               .replace(/fill="#000"/g, 'fill="#FFF"')
                               .replace(/fill="#333"/g, 'fill="#FFF"')
                               .replace(/fill="#666"/g, 'fill="#FFF"');
      }
    }
    
    return (
      <View style={[styles.container, { width: displaySize, height: displaySize }, style]}>
        <SvgXml
          xml={processedSvg}
          width={displaySize}
          height={displaySize}
          preserveAspectRatio="xMidYMid meet"
        />
      </View>
    );
  }

  // PRIORIDADE 2: Simple Icons (apenas 4 bancos disponíveis)
  try {
    // eslint-disable-next-line import/no-unresolved
    const simpleIcons = require('simple-icons');
    const iconData = getSimpleIconData(bank, simpleIcons);
    
    if (iconData && iconData.path) {
      // Se light=true, usa branco para contraste em fundos escuros
      const fillColor = light ? '#FFFFFF' : `#${iconData.hex || '000000'}`;
      // Reduz o logo para 80% do tamanho para melhor crop (mais espaço ao redor)
      const scale = 0.8;
      const offset = (24 * (1 - scale)) / 2; // Centraliza o logo reduzido
      return (
        <View style={[styles.container, { width: size, height: size }, style]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <G transform={`translate(${offset}, ${offset}) scale(${scale})`}>
              <Path
                d={iconData.path}
                fill={fillColor}
              />
            </G>
          </Svg>
        </View>
      );
    }
  } catch (error) {
    // Simple Icons não disponível, continua para fallback
  }

  // Fallback FINAL: ícone genérico com cor do banco
  // Se light=true, usa branco para contraste em fundos escuros
  const iconColor = light ? colors.neutral[0] : getBankColor(bank);
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Building2 size={size * 0.6} color={iconColor} />
    </View>
  );
}


/**
 * Retorna dados do Simple Icons para o banco
 * APENAS 4 bancos disponíveis: Nubank, PicPay, Mercado Pago, CaixaBank
 */
function getSimpleIconData(bank, simpleIcons) {
  try {
    const iconMap = {
      nubank: simpleIcons.siNubank,
      picpay: simpleIcons.siPicpay,
      mercadopago: simpleIcons.siMercadopago,
      caixabank: simpleIcons.siCaixabank,
    };
    
    const icon = iconMap[bank];
    return icon || null;
  } catch (error) {
    return null;
  }
}

/**
 * Detecta banco pelo nome
 * Suporta variações comuns de nomes
 */
function detectBank(bankName) {
  if (!bankName) return null;
  
  const name = bankName.toLowerCase().trim();
  
  // Nubank
  if (name.includes('nubank') || name === 'nu') return 'nubank';
  
  // Itaú
  if (name.includes('itau') || name.includes('itaú') || name.includes('itau unibanco')) return 'itau';
  
  // Bradesco
  if (name.includes('bradesco')) return 'bradesco';
  
  // Banco do Brasil
  if (name.includes('banco do brasil') || name.includes('bb ') || name === 'bb' || name.includes('banco brasil')) return 'bb';
  
  // Santander
  if (name.includes('santander')) return 'santander';
  
  // Inter
  if (name.includes('inter') && !name.includes('internet')) return 'inter';
  if (name.includes('banco inter')) return 'inter';
  
  // C6 Bank
  if (name.includes('c6') || name.includes('c6 bank') || name.includes('c6bank')) return 'c6';
  
  // Caixa / CaixaBank
  if (name.includes('caixa') || name.includes('cef') || name.includes('caixa economica')) return 'caixabank';
  
  // BTG Pactual
  if (name.includes('btg') || name.includes('btg pactual')) return 'btg';
  
  // Original
  if (name.includes('original')) return 'original';
  
  // Neon
  if (name.includes('neon')) return 'neon';
  
  // PicPay
  if (name.includes('picpay') || name.includes('pic pay')) return 'picpay';
  
  // Mercado Pago
  if (name.includes('mercado pago') || name.includes('mercadopago') || name.includes('mercado pago')) return 'mercadopago';
  
  // XP Investimentos
  if (name.includes('xp') || name.includes('xp investimentos') || name.includes('xp invest')) return 'xp';
  
  return null;
}

/**
 * Retorna cor do banco (para fallback)
 */
function getBankColor(bank) {
  const bankColors = {
    nubank: '#8A05BE', // Roxo Nubank
    itau: '#FF7A00', // Laranja Itaú
    bradesco: '#CC092F', // Vermelho Bradesco
    bb: '#FEDD00', // Amarelo BB
    santander: '#EC0000', // Vermelho Santander
    inter: '#FF7A00', // Laranja Inter
    c6: '#000000', // Preto C6
    caixabank: '#007EAE', // Azul CaixaBank
    btg: '#000000', // Preto BTG
    original: '#FF6B35', // Laranja Original
    neon: '#00D9FF', // Ciano Neon
    picpay: '#21C25E', // Verde PicPay
    mercadopago: '#009EE3', // Azul Mercado Pago
    xp: '#000000', // Preto XP Investimentos
  };
  
  return bankColors[bank] || colors.text.secondary;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
