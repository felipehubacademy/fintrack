import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, X, MessageCircle } from 'lucide-react-native';
import { detectDeviceLocale } from '@fintrack/shared/i18n';
import { zulChatLink } from '@fintrack/shared/config';
import { supabase } from '../services/supabase';
import { spacing, radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Title1, Body, Headline, Caption, Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { legalUrl } from '../components/settings/accountApi';
import {
  COUNTRIES,
  defaultCountryFor,
  toE164,
  formatPhoneForDisplay,
  isValidOtp,
  cleanOtp,
  authErrorKey,
} from '../components/onboarding/phoneLogin';

const RESEND_SECONDS = 30;
const WHATSAPP_GREEN = '#25D366';

const logoSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0.00 0.00 512.00 512.00">
<path fill="#1A6AFF" d="
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
  Z"/>
</svg>`;

/**
 * Login: phone number -> 6-digit code that arrives on WhatsApp (Supabase
 * phone OTP; the backend's Send SMS Hook delivers it through WhatsApp).
 * Email + password stays as a fallback. People without an account start on
 * WhatsApp, because accounts are created by chatting with Zul.
 */
export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const [mode, setMode] = useState('phone'); // 'phone' | 'code' | 'email'
  const [country, setCountry] = useState(() => defaultCountryFor(detectDeviceLocale()));
  const [showCountries, setShowCountries] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState(null); // E.164 the code was sent to
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // key under auth.errors
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sortedCountries = useMemo(() => {
    const name = (c) => t(`auth.countries.${c.code}`);
    const [first, ...rest] = COUNTRIES;
    return [first, ...rest.sort((a, b) => name(a).localeCompare(name(b)))];
  }, [t]);

  const showError = (key) => {
    setError(key);
    showToast(t(`auth.errors.${key}`), 'error');
  };

  async function sendCode({ resend = false } = {}) {
    setError(null);
    const target = resend ? phone : toE164(country.code, phoneInput);
    if (!target) return showError('invalidPhone');
    if (!supabase) return showError('generic');

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: target,
        // Accounts are created on WhatsApp, never from the login screen.
        options: { shouldCreateUser: false },
      });
      if (err) throw err;
      setPhone(target);
      setCode('');
      setMode('code');
      setResendIn(RESEND_SECONDS);
      if (resend) showToast(t('auth.code.resent'), 'success');
    } catch (err) {
      showError(authErrorKey(err));
    } finally {
      setLoading(false);
    }
    return undefined;
  }

  async function verifyCode(value = code) {
    setError(null);
    if (!isValidOtp(value)) return showError('invalidCode');
    if (!supabase || !phone) return showError('generic');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: value, type: 'sms' });
      if (err) throw err;
      // AppNavigator switches to the app on the auth state change.
    } catch (err) {
      const key = authErrorKey(err);
      showError(key === 'generic' ? 'wrongCode' : key);
    } finally {
      setLoading(false);
    }
    return undefined;
  }

  async function signInWithEmail() {
    setError(null);
    if (!email.trim() || !password) return showError('fillEmail');
    if (!supabase) return showError('generic');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
    } catch (err) {
      showError(authErrorKey(err));
    } finally {
      setLoading(false);
    }
    return undefined;
  }

  const onCodeChange = (value) => {
    const clean = cleanOtp(value);
    setCode(clean);
    if (clean.length === 6 && !loading) verifyCode(clean);
  };

  const openUrl = (url) => Linking.openURL(url).catch(() => showToast(t('auth.errors.generic'), 'error'));
  const startOnWhatsApp = () => Linking.openURL(zulChatLink(t('auth.noAccount.greeting')))
    .catch(() => showToast(t('auth.errors.openWhatsApp'), 'error'));

  const cardStyle = [styles.formCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }];
  const errorText = error ? (
    <Caption style={[styles.errorText, { color: colors.error.main }]} accessibilityLiveRegion="polite">
      {t(`auth.errors.${error}`)}
    </Caption>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={isDark ? [colors.brand.primaryDark, colors.background.primary] : [colors.brand.primary, colors.brand.primaryLight]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SvgXml xml={logoSvg} width={88} height={88} style={styles.logo} accessibilityLabel={t('auth.logoLabel')} />
          <Title1 style={[styles.title, { color: '#FFFFFF' }]}>{t('navigation.appName')}</Title1>
          <Body style={[styles.subtitle, { color: 'rgba(255,255,255,0.85)' }]}>{t('auth.tagline')}</Body>
        </LinearGradient>

        {mode === 'phone' && (
          <View style={cardStyle}>
            <Headline style={[styles.formTitle, { color: colors.text.primary }]}>{t('auth.phone.title')}</Headline>
            <Caption style={[styles.formSubtitle, { color: colors.text.secondary }]}>{t('auth.phone.subtitle')}</Caption>

            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={[styles.countryButton, { borderColor: colors.border.light, backgroundColor: colors.background.primary }]}
                onPress={() => setShowCountries(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('auth.phone.countryLabel')}: ${t(`auth.countries.${country.code}`)} +${country.dial}`}
              >
                <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{`${country.code} +${country.dial}`}</Text>
                <ChevronDown size={16} color={colors.text.secondary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder={t('auth.phone.placeholder')}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  accessibilityLabel={t('auth.phone.placeholder')}
                  onSubmitEditing={() => sendCode()}
                />
              </View>
            </View>
            {errorText}

            <Button
              title={loading ? t('auth.phone.sending') : t('auth.phone.send')}
              onPress={() => sendCode()}
              loading={loading}
              disabled={loading || !phoneInput.trim()}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.button}
            />
            <TouchableOpacity onPress={() => { setError(null); setMode('email'); }} style={styles.linkButton} accessibilityRole="button">
              <Caption style={{ color: colors.brand.primary, fontWeight: '600', textAlign: 'center' }}>{t('auth.email.useEmail')}</Caption>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'code' && (
          <View style={cardStyle}>
            <Headline style={[styles.formTitle, { color: colors.text.primary }]}>{t('auth.code.title')}</Headline>
            <Caption style={[styles.formSubtitle, { color: colors.text.secondary }]}>
              {t('auth.code.subtitle', { phone: formatPhoneForDisplay(phone) })}
            </Caption>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={onCodeChange}
              placeholder={t('auth.code.placeholder')}
              placeholderTextColor={colors.text.tertiary}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              maxLength={6}
              autoFocus
              accessibilityLabel={t('auth.code.title')}
              style={[styles.codeInput, { color: colors.text.primary, borderColor: colors.border.light, backgroundColor: colors.background.primary }]}
            />
            {errorText}
            <Button
              title={loading ? t('auth.code.verifying') : t('auth.code.verify')}
              onPress={() => verifyCode()}
              loading={loading}
              disabled={loading || code.length !== 6}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.button}
            />
            <View style={styles.codeLinks}>
              <TouchableOpacity onPress={() => { setError(null); setMode('phone'); }} accessibilityRole="button">
                <Caption style={{ color: colors.brand.primary, fontWeight: '600' }}>{t('auth.code.changeNumber')}</Caption>
              </TouchableOpacity>
              {resendIn > 0 ? (
                <Caption style={{ color: colors.text.tertiary }}>{t('auth.code.resendIn', { seconds: resendIn })}</Caption>
              ) : (
                <TouchableOpacity onPress={() => sendCode({ resend: true })} disabled={loading} accessibilityRole="button">
                  <Caption style={{ color: colors.brand.primary, fontWeight: '600' }}>{t('auth.code.resend')}</Caption>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {mode === 'email' && (
          <View style={cardStyle}>
            <Headline style={[styles.formTitle, { color: colors.text.primary }]}>{t('auth.email.title')}</Headline>
            <Input
              placeholder={t('auth.email.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
            <Input
              placeholder={t('auth.email.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              style={styles.input}
              onSubmitEditing={signInWithEmail}
            />
            {errorText}
            <Button
              title={t('auth.email.submit')}
              onPress={signInWithEmail}
              loading={loading}
              disabled={loading}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.button}
            />
            <TouchableOpacity onPress={() => { setError(null); setMode('phone'); }} style={styles.linkButton} accessibilityRole="button">
              <Caption style={{ color: colors.brand.primary, fontWeight: '600', textAlign: 'center' }}>{t('auth.email.usePhone')}</Caption>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.newHere}>
          <Caption style={{ color: colors.text.secondary, textAlign: 'center' }}>{t('auth.noAccount.question')}</Caption>
          <TouchableOpacity style={styles.whatsappButton} onPress={startOnWhatsApp} accessibilityRole="link">
            <MessageCircle size={18} color="#FFFFFF" />
            <Text style={styles.whatsappText}>{t('auth.noAccount.cta')}</Text>
          </TouchableOpacity>
          <Caption style={{ color: colors.text.tertiary, textAlign: 'center' }}>{t('auth.noAccount.hint')}</Caption>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Caption style={{ color: colors.text.tertiary, textAlign: 'center', lineHeight: 20 }}>
          {t('auth.legal.prefix')}
        </Caption>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => openUrl(legalUrl('terms', language))} accessibilityRole="link">
            <Caption style={{ color: colors.text.link, fontWeight: '600', textDecorationLine: 'underline' }}>{t('auth.legal.terms')}</Caption>
          </TouchableOpacity>
          <Caption style={{ color: colors.text.tertiary }}>{` ${t('auth.legal.and')} `}</Caption>
          <TouchableOpacity onPress={() => openUrl(legalUrl('privacy', language))} accessibilityRole="link">
            <Caption style={{ color: colors.text.link, fontWeight: '600', textDecorationLine: 'underline' }}>{t('auth.legal.privacy')}</Caption>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showCountries} animationType="slide" transparent onRequestClose={() => setShowCountries(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background.secondary }]}>
            <View style={styles.sheetHeader}>
              <Headline style={{ color: colors.text.primary }}>{t('auth.phone.countryPickerTitle')}</Headline>
              <TouchableOpacity onPress={() => setShowCountries(false)} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <X size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sortedCountries.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.countryRow, { borderBottomColor: colors.border.light }]}
                  onPress={() => { setCountry(c); setShowCountries(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: c.code === country.code }}
                >
                  <Text style={{ color: colors.text.primary, flex: 1, fontWeight: c.code === country.code ? '700' : '400' }}>
                    {t(`auth.countries.${c.code}`)}
                  </Text>
                  <Text style={{ color: colors.text.secondary }}>{`+${c.dial}`}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing[3] },
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logo: { marginBottom: spacing[2] },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: spacing[3] },
  formCard: {
    marginHorizontal: spacing[2],
    marginTop: -24,
    borderRadius: radius.xl,
    padding: spacing[3],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: { textAlign: 'center', marginBottom: spacing[1], fontSize: 20, fontWeight: '600' },
  formSubtitle: { textAlign: 'center', marginBottom: spacing[3] },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1] },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  codeLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] },
  input: { marginBottom: spacing[1.5] },
  button: { marginTop: spacing[2] },
  linkButton: { marginTop: spacing[2], paddingVertical: spacing[1] },
  errorText: { marginTop: spacing[1] },
  newHere: { alignItems: 'center', gap: spacing[1], marginTop: spacing[3], paddingHorizontal: spacing[3] },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  whatsappText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  footer: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], alignItems: 'center' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
