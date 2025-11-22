import { useState } from 'react';
import { textColorForBg } from '../lib/colors';

/**
 * Componente Avatar com suporte a imagem ou placeholder com iniciais
 * @param {string} src - URL da imagem do avatar (opcional)
 * @param {string} name - Nome para gerar iniciais se não houver imagem
 * @param {string} size - Tamanho: 'sm', 'md', 'lg', 'xl' ou número em pixels
 * @param {string} className - Classes CSS adicionais
 * @param {string} color - Cor do cost center do usuário (usado no placeholder se não houver imagem)
 * @param {function} onClick - Callback ao clicar no avatar
 */
export default function Avatar({ 
  src, 
  name = 'Usuário', 
  size = 'md',
  className = '',
  color = null, // Cor do cost center
  onClick
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl'
  };

  const sizeValue = typeof size === 'number' ? size : sizeClasses[size] || sizeClasses.md;
  
  // Usar cor do cost center se fornecida, senão usar azul primário como padrão
  // Cor padrão: azul primário (#3B82F6)
  const defaultColor = '#3B82F6'; // Azul primário
  
  const bgColor = color || defaultColor;
  const textColor = textColorForBg(bgColor);

  const hasImage = src && !imageError && imageLoaded;
  const initials = getInitials(name);

  const baseStyles = typeof size === 'number' 
    ? { width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.4}px` }
    : {};

  const avatarClasses = `
    ${typeof size === 'number' ? '' : sizeValue}
    rounded-full
    flex items-center justify-center
    font-semibold
    flex-shrink-0
    ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      className={avatarClasses}
      style={{
        ...baseStyles,
        backgroundColor: hasImage ? 'transparent' : bgColor,
        color: hasImage ? undefined : textColor,
        backgroundImage: hasImage ? `url(${src})` : undefined,
        backgroundSize: hasImage ? 'cover' : undefined,
        backgroundPosition: hasImage ? 'center' : undefined,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {!hasImage && (
        <span>{initials}</span>
      )}
      {src && !imageError && (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}

