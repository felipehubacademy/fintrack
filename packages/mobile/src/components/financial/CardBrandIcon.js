import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { colors } from '../../theme';

/**
 * CardBrandIcon - Exibe o logo da bandeira do cartão
 * Detecta automaticamente a bandeira pelo nome do cartão
 * 
 * Para usar logos reais:
 * 1. Baixe os logos oficiais das bandeiras
 * 2. Coloque em packages/mobile/src/assets/card-brands/
 * 3. Nomeie como: visa.png, mastercard.png, elo.png, etc.
 */
export function CardBrandIcon({ cardName, size = 40, style }) {
  const brand = detectCardBrand(cardName);
  
  // Se não detectar bandeira, mostra ícone genérico
  if (!brand) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <CreditCard size={size * 0.6} color={colors.text.secondary} />
      </View>
    );
  }

  // Tentar carregar imagem local do logo
  // Se não existir, mostra ícone com cor da bandeira
  try {
    // Require dinâmico da imagem (se existir)
    const imageSource = getBrandImageSource(brand);
    
    if (imageSource) {
      return (
        <View style={[styles.container, { width: size, height: size }, style]}>
          <Image
            source={imageSource}
            style={{ width: size, height: size * 0.4 }}
            resizeMode="contain"
          />
        </View>
      );
    }
  } catch (error) {
    // Se imagem não existir, continua para fallback
  }

  // Fallback: ícone genérico com cor da bandeira
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <CreditCard size={size * 0.6} color={getBrandColor(brand)} />
    </View>
  );
}

/**
 * Retorna o source da imagem do logo (se existir)
 * Você precisa adicionar as imagens em assets/card-brands/
 * 
 * IMPORTANTE: Descomente os requires abaixo quando adicionar as imagens!
 */
function getBrandImageSource(brand) {
  // TODO: Descomente quando adicionar as imagens
  // Por enquanto, retorna null para usar fallback
  return null;
  
  /* 
  // Descomente quando adicionar as imagens:
  const imageMap = {
    visa: require('../../assets/card-brands/visa.png'),
    mastercard: require('../../assets/card-brands/mastercard.png'),
    amex: require('../../assets/card-brands/amex.png'),
    elo: require('../../assets/card-brands/elo.png'),
    hipercard: require('../../assets/card-brands/hipercard.png'),
    diners: require('../../assets/card-brands/diners.png'),
    discover: require('../../assets/card-brands/discover.png'),
    jcb: require('../../assets/card-brands/jcb.png'),
  };
  
  return imageMap[brand] || null;
  */
}

/**
 * Detecta bandeira do cartão pelo nome
 */
function detectCardBrand(cardName) {
  if (!cardName) return null;
  
  const name = cardName.toLowerCase();
  
  // Visa
  if (name.includes('visa')) return 'visa';
  
  // Mastercard
  if (name.includes('master') || name.includes('mastercard')) return 'mastercard';
  
  // American Express
  if (name.includes('amex') || name.includes('american express') || name.includes('americanexpress')) return 'amex';
  
  // Elo
  if (name.includes('elo')) return 'elo';
  
  // Hipercard
  if (name.includes('hipercard') || name.includes('hiper')) return 'hipercard';
  
  // Diners Club
  if (name.includes('diners') || name.includes('diners club')) return 'diners';
  
  // Discover
  if (name.includes('discover')) return 'discover';
  
  // JCB
  if (name.includes('jcb')) return 'jcb';
  
  // Nubank (cartão roxo)
  if (name.includes('nubank') || name.includes('roxinho')) return 'nubank';
  
  // C6 Bank
  if (name.includes('c6')) return 'c6';
  
  // Inter
  if (name.includes('inter')) return 'inter';
  
  // Itaú
  if (name.includes('itau') || name.includes('itaú')) return 'itau';
  
  // Bradesco
  if (name.includes('bradesco')) return 'bradesco';
  
  // Banco do Brasil
  if (name.includes('banco do brasil') || name.includes('bb')) return 'bb';
  
  // Santander
  if (name.includes('santander')) return 'santander';
  
  return null;
}

/**
 * Retorna cor da bandeira
 */
function getBrandColor(brand) {
  const colors = {
    visa: '#1434CB', // Azul Visa
    mastercard: '#EB001B', // Vermelho Mastercard
    amex: '#006FCF', // Azul Amex
    elo: '#FFCB05', // Amarelo Elo
    hipercard: '#DF1C3F', // Vermelho Hipercard
    diners: '#0079BE', // Azul Diners
    discover: '#FF6000', // Laranja Discover
    jcb: '#0E4C96', // Azul JCB
    nubank: '#8A05BE', // Roxo Nubank
    c6: '#000000', // Preto C6
    inter: '#FF7A00', // Laranja Inter
    itau: '#FF7A00', // Laranja Itaú
    bradesco: '#CC092F', // Vermelho Bradesco
    bb: '#FEDD00', // Amarelo BB
    santander: '#EC0000', // Vermelho Santander
  };
  
  return colors[brand] || '#6366F1';
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

