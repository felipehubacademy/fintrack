import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { colors, spacing, radius } from '../theme';
import { Title1, Body, Caption } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { useAlert } from '../components/ui/AlertProvider';
import { APP_CONFIG } from '@fintrack/shared/src/constants/config';

// Logo SVG - Versão Azul (para fundo branco)
const logoSvgBlue = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0.00 0.00 512.00 512.00">
<path stroke="#036ecb" stroke-width="2.00" fill="none" stroke-linecap="butt" vector-effect="non-scaling-stroke" d="
  M 157.12 374.41
  A 0.25 0.24 -42.9 0 0 157.10 374.86
  Q 188.84 389.37 223.12 382.36
  Q 235.63 379.80 245.14 376.36
  Q 257.69 371.82 273.63 362.38
  C 292.53 351.19 309.75 338.99 323.33 321.78
  C 342.62 297.34 349.00 266.30 342.69 235.77
  A 0.26 0.26 0.0 0 0 342.18 235.81
  C 341.70 248.30 339.02 260.39 333.74 272.20
  C 321.57 299.46 301.80 320.01 275.80 334.52
  Q 222.95 364.02 162.55 373.57
  C 160.46 373.90 158.76 373.78 157.12 374.41"/>
<path fill="#057bd9" d="
  M 113.00 377.89
  A 0.28 0.28 0.0 0 0 112.79 377.42
  Q 105.75 377.70 97.14 378.72
  C 89.02 379.68 73.26 380.25 70.67 371.16
  C 69.38 366.60 71.67 363.37 75.18 359.85
  Q 79.93 355.08 85.57 348.07
  Q 95.53 335.69 105.60 321.11
  Q 111.94 311.92 138.52 272.51
  Q 162.31 237.23 195.77 198.76
  C 207.70 185.04 220.98 174.50 231.91 161.93
  C 241.93 150.40 247.97 136.58 251.69 121.98
  C 257.03 100.98 261.56 79.44 276.03 62.39
  A 0.64 0.64 0.0 0 0 275.94 61.47
  Q 264.81 52.75 256.57 41.69
  C 254.43 38.81 250.60 32.96 255.20 30.31
  A 2.22 2.16 -62.2 0 1 256.03 30.04
  Q 259.80 29.68 262.00 30.03
  Q 278.91 32.74 294.13 38.25
  A 0.20 0.20 0.0 0 0 294.36 37.93
  C 287.36 29.29 281.03 18.54 278.59 7.67
  A 2.62 2.54 44.1 0 1 278.56 6.69
  Q 279.16 3.15 283.03 2.54
  Q 284.30 2.34 287.45 3.32
  Q 293.73 5.29 300.20 8.83
  Q 320.03 19.71 338.14 34.39
  Q 339.77 35.71 342.27 35.66
  Q 356.12 35.41 375.25 39.52
  C 395.36 43.84 413.64 52.47 424.82 70.20
  Q 432.72 82.72 435.71 96.93
  A 0.74 0.73 1.3 0 0 436.26 97.50
  Q 448.58 100.58 459.15 104.08
  Q 475.15 109.38 489.56 118.14
  Q 492.94 120.20 495.43 123.09
  Q 498.76 126.96 494.83 130.06
  Q 491.72 132.51 485.22 135.48
  Q 475.95 139.71 464.12 143.57
  Q 449.87 148.21 434.42 152.76
  A 2.79 2.79 0.0 0 0 432.76 154.11
  C 424.80 168.93 430.87 185.66 435.25 200.49
  Q 438.32 210.90 439.61 223.25
  Q 442.19 247.97 436.55 273.30
  C 429.93 303.04 411.13 330.03 388.11 349.86
  C 363.98 370.65 336.85 386.35 306.16 394.63
  A 0.53 0.53 0.0 0 0 305.83 395.38
  C 312.34 408.12 318.64 420.66 326.72 433.53
  C 330.66 439.79 335.76 447.37 341.64 451.28
  A 2.80 2.79 -25.7 0 0 342.96 451.74
  Q 353.22 452.55 356.06 452.54
  C 359.33 452.52 361.58 453.06 364.74 453.34
  Q 377.17 454.45 388.44 458.57
  C 393.36 460.36 404.88 465.35 402.87 471.95
  C 402.14 474.36 397.74 474.15 395.92 473.59
  Q 385.53 470.36 373.64 468.95
  A 0.31 0.31 0.0 0 0 373.46 469.54
  C 378.57 472.13 387.36 478.44 388.07 484.43
  C 388.85 490.97 381.07 488.69 377.68 487.32
  C 369.82 484.15 359.61 479.62 350.83 477.16
  Q 335.76 472.93 323.43 470.13
  Q 308.04 466.65 289.96 466.68
  C 287.14 466.68 283.64 466.50 281.00 465.49
  C 275.34 463.32 279.92 458.42 282.87 457.08
  Q 287.67 454.90 292.28 454.30
  Q 303.21 452.88 314.32 452.53
  A 0.34 0.34 0.0 0 0 314.59 452.00
  Q 298.66 427.53 279.79 402.18
  C 278.57 400.54 276.71 401.06 274.84 401.39
  Q 255.74 404.74 237.52 404.46
  A 1.11 1.11 0.0 0 0 236.60 404.95
  L 229.74 415.38
  A 0.93 0.90 54.4 0 0 229.63 416.12
  Q 234.97 434.42 240.00 448.50
  Q 243.47 458.22 248.21 467.05
  A 2.34 2.33 80.2 0 0 249.90 468.25
  Q 266.57 470.87 282.04 476.22
  C 290.50 479.14 302.66 484.86 307.30 492.61
  A 3.01 2.91 -67.2 0 1 307.64 493.49
  C 308.81 499.31 302.75 498.95 299.52 497.50
  Q 288.02 492.36 275.90 489.36
  A 0.49 0.48 -17.4 0 0 275.46 490.19
  C 279.94 494.07 283.36 498.31 284.66 504.06
  A 1.89 1.82 -43.9 0 1 284.62 505.06
  Q 283.81 507.52 281.27 508.27
  A 1.94 1.88 -45.9 0 1 280.31 508.30
  Q 276.70 507.45 273.40 505.68
  C 254.74 495.68 234.05 484.29 211.44 483.86
  C 205.67 483.75 200.27 484.91 193.84 485.86
  C 189.66 486.48 187.76 483.51 188.88 479.61
  Q 189.61 477.10 192.95 474.42
  C 198.50 469.98 205.25 468.92 212.44 467.88
  C 216.47 467.30 221.27 467.71 225.68 466.63
  A 0.50 0.49 -18.7 0 0 226.02 465.95
  Q 220.27 453.09 215.52 440.19
  C 209.93 424.99 205.47 413.80 200.10 401.92
  A 0.29 0.28 87.2 0 0 199.93 401.76
  L 178.58 395.01
  A 0.53 0.52 29.7 0 0 178.05 395.15
  Q 155.63 418.91 141.93 433.18
  Q 123.88 451.97 105.75 467.73
  C 91.84 479.82 77.29 489.88 59.79 494.84
  C 56.89 495.66 44.13 497.84 44.51 492.51
  Q 44.55 491.89 44.37 491.50
  A 0.60 0.58 -23.0 0 0 43.63 491.21
  C 36.93 493.71 23.96 495.40 18.59 490.02
  C 13.60 485.02 16.33 478.04 19.92 472.44
  Q 25.26 464.11 32.13 456.62
  C 54.42 432.32 91.20 399.43 107.98 382.98
  Q 111.48 379.56 113.00 377.89
  Z
  M 157.12 374.41
  A 0.25 0.24 -42.9 0 0 157.10 374.86
  Q 188.84 389.37 223.12 382.36
  Q 235.63 379.80 245.14 376.36
  Q 257.69 371.82 273.63 362.38
  C 292.53 351.19 309.75 338.99 323.33 321.78
  C 342.62 297.34 349.00 266.30 342.69 235.77
  A 0.26 0.26 0.0 0 0 342.18 235.81
  C 341.70 248.30 339.02 260.39 333.74 272.20
  C 321.57 299.46 301.80 320.01 275.80 334.52
  Q 222.95 364.02 162.55 373.57
  C 160.46 373.90 158.76 373.78 157.12 374.41
  Z"/>
<path fill="#ffffff" opacity="0.9" d="
  M 157.12 374.41
  C 158.76 373.78 160.46 373.90 162.55 373.57
  Q 222.95 364.02 275.80 334.52
  C 301.80 320.01 321.57 299.46 333.74 272.20
  C 339.02 260.39 341.70 248.30 342.18 235.81
  A 0.26 0.26 0.0 0 1 342.69 235.77
  C 349.00 266.30 342.62 297.34 323.33 321.78
  C 309.75 338.99 292.53 351.19 273.63 362.38
  Q 257.69 371.82 245.14 376.36
  Q 235.63 379.80 223.12 382.36
  Q 188.84 389.37 157.10 374.86
  A 0.25 0.24 -42.9 0 1 157.12 374.41
  Z"/>
<path fill="#0061bc" d="
  M 157.12 374.41
  C 158.76 373.78 160.46 373.90 162.55 373.57
  Q 222.95 364.02 275.80 334.52
  C 301.80 320.01 321.57 299.46 333.74 272.20
  C 339.02 260.39 341.70 248.30 342.18 235.81
  A 0.26 0.26 0.0 0 1 342.69 235.77
  C 349.00 266.30 342.62 297.34 323.33 321.78
  C 309.75 338.99 292.53 351.19 273.63 362.38
  Q 257.69 371.82 245.14 376.36
  Q 235.63 379.80 223.12 382.36
  Q 188.84 389.37 157.10 374.86
  A 0.25 0.24 -42.9 0 1 157.12 374.41
  Z"/>
</svg>`;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { showToast } = useToast();
  const { alert } = useAlert();

  async function handleAuth() {
    if (!email || !password) {
      showToast('Preencha email e senha', 'warning');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        alert({
          title: 'Sucesso',
          message: 'Verifique seu email para confirmar o cadastro',
          type: 'success',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      }
    } catch (error) {
      showToast(error.message || 'Erro ao autenticar', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.gradient}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Logo */}
            <SvgXml 
              xml={logoSvgBlue}
              width={120}
              height={120}
              style={styles.logo}
              accessibilityLabel="Logo MeuAzulão"
            />

            <Title1 color="primary" weight="bold" style={styles.title}>
              MeuAzulão
            </Title1>
            <Caption color="secondary" style={styles.subtitle}>
              Gestão Financeira Inteligente
            </Caption>
          </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
          />

          <Input
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            style={styles.input}
          />

          <Button
            title={isSignUp ? 'Criar Conta' : 'Entrar'}
            onPress={handleAuth}
            loading={loading}
            disabled={loading}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.button}
          />

          {isSignUp ? (
            <TouchableOpacity
              onPress={() => setIsSignUp(false)}
              style={styles.switchButton}
              accessibilityRole="button"
              accessibilityLabel="Já tem uma conta? Entrar"
              accessibilityHint="Alternar para tela de login"
            >
              <Caption color="secondary" align="center">
                Já tem uma conta? Entrar
              </Caption>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                const url = APP_CONFIG.BASE_URL;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  showToast('Não foi possível abrir a página', 'error');
                }
              }}
              style={styles.switchButton}
              accessibilityRole="button"
              accessibilityLabel="Não tem conta? Criar agora"
              accessibilityHint="Abre a página web para criar uma conta"
            >
              <Caption color="secondary" align="center">
                Não tem conta? Criar agora
              </Caption>
            </TouchableOpacity>
          )}
        </View>

        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Caption color="tertiary" align="center" style={styles.footerText}>
            Ao continuar, você concorda com nossos
          </Caption>
          <View style={styles.footerLinks}>
            <TouchableOpacity
              onPress={() => navigation?.navigate('TermsOfService')}
              style={styles.footerLink}
              accessibilityRole="button"
              accessibilityLabel="Ler Termos de Uso"
              accessibilityHint="Abre a tela com os termos de uso do aplicativo"
            >
              <Caption color="primary" weight="semiBold" style={styles.footerLinkText}>
                Termos de Uso
              </Caption>
            </TouchableOpacity>
            <Caption color="tertiary" style={styles.footerSeparator}>
              {' e '}
            </Caption>
            <TouchableOpacity
              onPress={() => navigation?.navigate('PrivacyPolicy')}
              style={styles.footerLink}
              accessibilityRole="button"
              accessibilityLabel="Ler Política de Privacidade"
              accessibilityHint="Abre a tela com a política de privacidade do aplicativo"
            >
              <Caption color="primary" weight="semiBold" style={styles.footerLinkText}>
                Política de Privacidade
              </Caption>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
    backgroundColor: colors.background.primary,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },

  logo: {
    marginBottom: spacing[4],
  },

  title: {
    marginBottom: spacing[1],
    fontSize: 32,
  },

  subtitle: {
    opacity: 0.9,
    fontSize: 16,
    marginTop: spacing[0.5],
  },

  // Form
  form: {
    width: '100%',
    marginBottom: spacing[4],
  },

  input: {
    marginBottom: spacing[2],
  },

  button: {
    marginTop: spacing[3],
  },

  switchButton: {
    marginTop: spacing[3],
    paddingVertical: spacing[2],
  },

  // Footer
  footer: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    alignItems: 'center',
  },

  footerText: {
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: spacing[1],
  },

  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  footerLink: {
    paddingVertical: spacing[0.5],
    paddingHorizontal: spacing[1],
    borderRadius: radius.sm,
  },

  footerLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
    opacity: 0.95,
  },

  footerSeparator: {
    opacity: 0.8,
    marginHorizontal: spacing[0.5],
  },
});
