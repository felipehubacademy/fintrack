import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows } from '../../theme';
import { Title2 } from '../ui/Text';
import { NotificationBell } from '../ui/NotificationBell';
import Logo from '../ui/Logo';

/**
 * ScreenHeader - Header consistente para todas as telas
 */
export function ScreenHeader({ 
  user, 
  title, 
  rightIcon,
  onRightIconPress,
  showBackButton = false,
  showNotifications = false,
  showLogo = false, // Nova prop para mostrar logo à esquerda
  showAvatarOnRight = false, // Nova prop para mostrar avatar à direita
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const renderAvatar = () => (
    <TouchableOpacity 
      style={styles.avatarContainer}
      accessibilityRole="button"
      accessibilityLabel={`Perfil de ${user?.email || 'usuário'}`}
      accessibilityHint="Abrir perfil do usuário"
    >
      {user?.avatar_url ? (
        <Image 
          source={{ uri: user.avatar_url }} 
          style={styles.avatar}
          accessibilityLabel="Foto do perfil"
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Title2 weight="semiBold" style={{ color: colors.neutral[0], fontSize: 16 }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </Title2>
        </View>
      )}
    </TouchableOpacity>
  );

  // Verificar se há logo à esquerda para balancear o layout
  const hasLogoLeft = showLogo && !showBackButton;

  // Safe area apenas no Android para o topo (notch/camera)
  // iOS mantém comportamento original
  const safeTop = Platform.OS === 'android' 
    ? Math.max(insets.top, spacing[3])
    : (Platform.OS === 'ios' ? 60 : spacing[3]);
  
  return (
    <View style={[styles.header, { paddingTop: safeTop }]}>
      <View style={styles.content}>
        {/* Back Button OU Logo OU Avatar */}
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            accessibilityHint="Voltar para a tela anterior"
          >
            <ChevronLeft size={28} color={colors.text.primary} />
          </TouchableOpacity>
        ) : showLogo ? (
          <View style={styles.logoContainer}>
            <Logo size="small" color="blue" />
          </View>
        ) : !showAvatarOnRight ? (
          renderAvatar()
        ) : null}

        {/* Title */}
        <View style={styles.titleContainer}>
          <Title2 weight="semiBold" style={styles.titleText}>{title}</Title2>
        </View>

        {/* Right Icons - Dentro de container invisível para balanceamento */}
        <View style={[
          styles.rightIcons,
          hasLogoLeft && styles.rightIconsBalanced
        ]}>
          {showNotifications && <NotificationBell />}
          {showAvatarOnRight && renderAvatar()}
          {rightIcon && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel="Ação adicional"
              accessibilityHint="Executar ação adicional"
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background.secondary,
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },

  avatarContainer: {
    ...shadows.sm,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },

  avatarPlaceholder: {
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleText: {
    textAlign: 'center',
  },

  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  
  rightIconsBalanced: {
    width: 40, // Mesma largura do logo para balancear
    justifyContent: 'flex-end', // Alinha os ícones à direita dentro do container
  },
  
  iconButton: {
    padding: spacing[1],
  },

  backButton: {
    padding: spacing[1],
    marginLeft: -spacing[1],
  },

  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40, // Mesma largura do logo small
  },
});

