import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { colors } from '../../theme';

/**
 * Componente Avatar com suporte a imagem ou placeholder com iniciais
 * @param {string} src - URL da imagem do avatar (opcional)
 * @param {string} name - Nome para gerar iniciais se não houver imagem
 * @param {string|number} size - Tamanho: 'sm', 'md', 'lg', 'xl' ou número em pixels
 * @param {string} color - Cor do cost center do usuário (usado no placeholder se não houver imagem)
 * @param {function} onPress - Callback ao clicar no avatar
 */
export function Avatar({ 
  src, 
  name = 'Usuário', 
  size = 'md',
  color = '#3B82F6', // Azul primário padrão
  onPress,
  style,
}) {
  const [imageError, setImageError] = useState(false);

  // Extrair primeira e segunda iniciais
  const getInitials = (name) => {
    if (!name) return '??';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      // Primeira letra do primeiro nome + primeira letra do segundo nome
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      // Se só tiver um nome, pegar primeiras duas letras
      return parts[0].substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Tamanhos
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
  };

  const sizeValue = typeof size === 'number' ? size : sizeMap[size] || sizeMap.md;
  const fontSize = sizeValue * 0.4;
  
  // Usar cor do cost center se fornecida, senão usar azul primário como padrão
  const bgColor = color || '#3B82F6';
  
  // Determinar cor do texto baseado na cor de fundo
  const getTextColor = (bgColor) => {
    // Converter hex para RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calcular luminosidade
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Retornar branco ou preto baseado na luminosidade
    return luminance > 0.5 ? colors.text.primary : colors.neutral[0];
  };

  const textColor = getTextColor(bgColor);
  const hasImage = src && !imageError;
  const initials = getInitials(name);

  const avatarStyle = [
    styles.avatar,
    {
      width: sizeValue,
      height: sizeValue,
      borderRadius: sizeValue / 2,
      backgroundColor: hasImage ? 'transparent' : bgColor,
    },
    style,
  ];

  const content = (
    <View style={avatarStyle}>
      {hasImage ? (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
            },
          ]}
          onError={() => setImageError(true)}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize,
              color: textColor,
            },
          ]}
          weight="bold"
        >
          {initials}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    textAlign: 'center',
  },
});








