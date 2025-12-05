import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption, Callout } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { supabase } from '../../services/supabase';
import { APP_CONFIG } from '@fintrack/shared/constants';

const { height } = Dimensions.get('window');

// Função de formatação de telefone
function formatPhone(value) {
  // Remove tudo que não é número
  let numbers = value.replace(/\D/g, '');
  
  // Remove o código do país se foi digitado (55)
  if (numbers.startsWith('55') && numbers.length > 11) {
    numbers = numbers.substring(2);
  }
  
  // Limita a 11 dígitos (DDD + número)
  numbers = numbers.slice(0, 11);
  
  // Formata: (11) 99999-9999
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  
  return numbers;
}

// Remove formatação do telefone do usuário para exibição
const normalizePhone = (phone) => {
  if (!phone) return '';
  const numbers = phone.replace(/\D/g, '');
  // Se começa com 55 e tem mais de 11 dígitos, remove o 55
  if (numbers.startsWith('55') && numbers.length > 11) {
    return numbers.substring(2);
  }
  return numbers;
};

export function WhatsAppVerificationModal({ visible, onClose, user, onVerified }) {
  const { showToast } = useToast();
  const userPhoneNormalized = normalizePhone(user?.phone);
  
  const [phone, setPhone] = useState(userPhoneNormalized ? formatPhone(userPhoneNormalized) : '');
  const [registeredPhone, setRegisteredPhone] = useState(userPhoneNormalized);
  const [isVerified, setIsVerified] = useState(user?.phone_verified || false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState(1); // 1: phone, 2: code, 3: success

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset modal state when opened
  useEffect(() => {
    if (visible) {
      setPhone(userPhoneNormalized ? formatPhone(userPhoneNormalized) : '');
      setRegisteredPhone(userPhoneNormalized);
      setIsVerified(user?.phone_verified || false);
      setVerificationCode('');
      setCodeSent(false);
      setError(null);
      setWarning(null);
      setCountdown(0);
      setStep(1);
    }
  }, [visible, user]);

  const handlePhoneChange = (text) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
    setError(null);
    
    // Verificar se o número é diferente do cadastrado
    if (registeredPhone && formatted.replace(/\D/g, '') !== registeredPhone.replace(/\D/g, '') && formatted.replace(/\D/g, '').length === 11) {
      setWarning('Este número é diferente do seu cadastro. Ao enviar o código, seu número será atualizado automaticamente.');
    } else {
      setWarning(null);
    }
  };

  const handleSendCode = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 11) {
      setError('Digite um telefone válido');
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      // Normalizar telefone (apenas números)
      const normalizedPhone = phone.replace(/\D/g, '');
      
      // Normalizar número (garantir que comece com 55)
      const normalizedNew = normalizedPhone.startsWith('55') 
        ? normalizedPhone 
        : `55${normalizedPhone}`;
      
      // Se o número é diferente do cadastrado, atualizar no banco primeiro
      const normalizedRegistered = registeredPhone ? registeredPhone.replace(/\D/g, '') : '';
      
      if (!registeredPhone || normalizedNew !== normalizedRegistered) {
        // Atualizar telefone e resetar verificação
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            phone: normalizedNew,
            phone_verified: false,
            phone_verified_at: null
          })
          .eq('id', user?.id);

        if (updateError) {
          throw new Error('Erro ao atualizar telefone');
        }
        
        setRegisteredPhone(normalizedNew);
        setIsVerified(false);
      }

      const apiUrl = `${APP_CONFIG.API_URL}/send-verification-code`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          userPhone: normalizedNew
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          const minutes = Math.ceil(retryAfter / 60);
          
          if (minutes >= 60) {
            const hours = Math.ceil(minutes / 60);
            setError(`⏰ Muitas tentativas. Aguarde ${hours} hora${hours > 1 ? 's' : ''} para tentar novamente.`);
          } else if (minutes > 1) {
            setError(`⏰ Muitas tentativas. Aguarde ${minutes} minutos para tentar novamente.`);
          } else {
            setError(`⏰ Aguarde ${retryAfter} segundos para tentar novamente.`);
          }
          
          setCountdown(retryAfter);
        } else {
          setError(data.error || `Erro ao enviar código (${response.status})`);
        }
        return;
      }

      setCodeSent(true);
      setStep(2);
      setCountdown(60);
      showToast('Código enviado! Verifique seu WhatsApp', 'success');
    } catch (err) {
      console.error('❌ Erro na requisição:', err);
      setError(err.message || 'Erro ao enviar código. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code = verificationCode) => {
    if (!code || code.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = `${APP_CONFIG.API_URL}/verify-code`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.id,
          code: code 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      setIsVerified(true);
      setStep(3);
      showToast('WhatsApp verificado com sucesso!', 'success');
      
      if (onVerified) {
        setTimeout(() => {
          onVerified();
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            {/* Progress Steps */}
            <View style={styles.progressSteps}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
              <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
            </View>

            {/* Header Content */}
            <View style={styles.headerContent}>
              <View style={[styles.iconContainer, step === 3 && styles.iconContainerSuccess]}>
                {step === 3 ? (
                  <CheckCircle2 size={32} color={colors.neutral[0]} />
                ) : (
                  <MessageCircle size={32} color={colors.neutral[0]} />
                )}
              </View>
              <Title2 weight="bold" align="center" style={{ marginTop: spacing[2] }}>
                {step === 1 && (isVerified && registeredPhone ? 'Alterar WhatsApp' : 'Verificar WhatsApp')}
                {step === 2 && 'Digite o Código'}
                {step === 3 && 'Tudo Pronto!'}
              </Title2>
              <Caption color="secondary" align="center" style={{ marginTop: spacing[1] }}>
                {step === 1 && (isVerified && registeredPhone 
                  ? 'Digite um novo número para alterar sua verificação'
                  : 'Informe seu número para conversar com o Zul')}
                {step === 2 && 'Enviamos um código de 6 dígitos no WhatsApp'}
                {step === 3 && 'Seu WhatsApp está verificado e pronto para uso'}
              </Caption>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
          >
            {step === 3 ? (
              /* Success State */
              <View style={styles.successContainer}>
                <Text style={{ fontSize: 48, marginBottom: spacing[2] }}>🎉</Text>
                <View style={styles.successCard}>
                  <Callout weight="semiBold" style={{ color: colors.success.dark, marginBottom: spacing[1] }}>
                    WhatsApp Verificado com Sucesso!
                  </Callout>
                  <Caption style={{ color: colors.success.main }}>
                    Número: <Text weight="bold">{phone}</Text>
                  </Caption>
                </View>
                <View style={styles.infoCard}>
                  <MessageCircle size={20} color={colors.brand.primary} />
                  <View style={{ flex: 1, marginLeft: spacing[2] }}>
                    <Callout weight="semiBold" style={{ color: colors.brand.primary, marginBottom: spacing[0.5] }}>
                      Agora você pode usar o Zul!
                    </Callout>
                    <Caption color="secondary">
                      Envie mensagens via WhatsApp para registrar despesas, ver relatórios e muito mais.
                    </Caption>
                  </View>
                </View>
                <Button
                  title="Entendido"
                  onPress={onClose}
                  style={{ marginTop: spacing[3] }}
                />
              </View>
            ) : step === 2 ? (
              /* Code Input State */
              <View style={styles.codeContainer}>
                <View style={styles.codeInputContainer}>
                  <Caption weight="semiBold" align="center" style={{ marginBottom: spacing[2] }}>
                    Código de Verificação
                  </Caption>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    value={verificationCode}
                    onChangeText={(text) => {
                      const numbers = text.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(numbers);
                      setError(null);
                      if (numbers.length === 6) {
                        verifyCode(numbers);
                      }
                    }}
                    maxLength={6}
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <Caption color="tertiary" align="center" style={{ marginTop: spacing[1] }}>
                    Código enviado para <Text weight="semiBold">{phone}</Text>
                  </Caption>
                </View>

                {error && (
                  <View style={styles.errorCard}>
                    <AlertCircle size={20} color={colors.error.main} />
                    <Callout style={{ color: colors.error.dark, marginLeft: spacing[1] }}>
                      {error}
                    </Callout>
                  </View>
                )}

                <Button
                  title={loading ? 'Verificando...' : 'Verificar Código'}
                  onPress={() => verifyCode()}
                  disabled={loading || verificationCode.length !== 6}
                  icon={loading ? <ActivityIndicator size="small" color={colors.neutral[0]} /> : <CheckCircle2 size={20} color={colors.neutral[0]} />}
                  style={{ marginTop: spacing[2] }}
                />

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={countdown > 0 || loading}
                  style={styles.resendButton}
                >
                  {countdown > 0 ? (
                    <View style={styles.resendButtonContent}>
                      <RefreshCw size={16} color={colors.text.secondary} />
                      <Caption color="tertiary">
                        Reenviar em {countdown}s
                      </Caption>
                    </View>
                  ) : (
                    <Caption color="secondary" weight="medium">
                      Não recebeu? Reenviar código
                    </Caption>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setStep(1);
                    setCodeSent(false);
                    setVerificationCode('');
                    setError(null);
                  }}
                  style={styles.backButton}
                >
                  <Caption color="secondary" weight="medium">
                    ← Voltar para o número
                  </Caption>
                </TouchableOpacity>
              </View>
            ) : (
              /* Phone Input State */
              <View style={styles.phoneContainer}>
                {isVerified && registeredPhone && (
                  <View style={styles.verifiedCard}>
                    <CheckCircle2 size={20} color={colors.success.main} />
                    <View style={{ flex: 1, marginLeft: spacing[2] }}>
                      <Callout weight="semiBold" style={{ color: colors.success.dark, marginBottom: spacing[0.5] }}>
                        Número Atual Verificado
                      </Callout>
                      <Caption style={{ color: colors.success.main }}>
                        Número atual: <Text weight="bold">{formatPhone(registeredPhone)}</Text>
                      </Caption>
                      <Caption style={{ color: colors.success.main, marginTop: spacing[0.5] }}>
                        Digite um novo número abaixo para alterar
                      </Caption>
                    </View>
                  </View>
                )}

                <View style={styles.phoneInputContainer}>
                  <Caption weight="semiBold" style={{ marginBottom: spacing[1] }}>
                    {isVerified ? 'Novo Número do WhatsApp' : 'Número do WhatsApp'}
                  </Caption>
                  <View style={styles.phoneInputWrapper}>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      autoFocus
                    />
                    <MessageCircle size={20} color={colors.text.tertiary} />
                  </View>
                  {warning && (
                    <View style={styles.warningCard}>
                      <AlertCircle size={16} color={colors.warning.main} />
                      <Caption style={{ color: colors.warning.dark, marginLeft: spacing[1], flex: 1 }}>
                        {warning}
                      </Caption>
                    </View>
                  )}
                </View>

                {error && (
                  <View style={styles.errorCard}>
                    <AlertCircle size={20} color={colors.error.main} />
                    <Callout style={{ color: colors.error.dark, marginLeft: spacing[1] }}>
                      {error}
                    </Callout>
                  </View>
                )}

                <Button
                  title={loading ? 'Enviando...' : 'Enviar Código'}
                  onPress={handleSendCode}
                  disabled={loading || !phone || phone.replace(/\D/g, '').length < 11}
                  icon={loading ? <ActivityIndicator size="small" color={colors.neutral[0]} /> : <ArrowRight size={20} color={colors.neutral[0]} />}
                  style={{ marginTop: spacing[2] }}
                />

                <View style={styles.infoCard}>
                  <MessageCircle size={20} color={colors.brand.primary} />
                  <View style={{ flex: 1, marginLeft: spacing[2] }}>
                    <Callout weight="semiBold" style={{ color: colors.brand.primary, marginBottom: spacing[0.5] }}>
                      Como funciona?
                    </Callout>
                    <Caption color="secondary">
                      Enviaremos um código de 6 dígitos via WhatsApp. Você terá 10 minutos para validá-lo e começar a usar o Zul.
                    </Caption>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: height * 0.85,
  },
  header: {
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeButton: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 1,
    padding: spacing[1],
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colors.success.main,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.success.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSuccess: {
    backgroundColor: colors.success.main,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
  },
  successContainer: {
    alignItems: 'center',
  },
  successCard: {
    backgroundColor: colors.success.bg,
    borderRadius: radius.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.success.light,
    marginBottom: spacing[2],
    width: '100%',
  },
  codeContainer: {
    gap: spacing[2],
  },
  codeInputContainer: {
    marginBottom: spacing[2],
  },
  codeInput: {
    width: '100%',
    padding: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    fontSize: 24,
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.text.primary,
  },
  phoneContainer: {
    gap: spacing[2],
  },
  verifiedCard: {
    flexDirection: 'row',
    backgroundColor: colors.success.bg,
    borderRadius: radius.lg,
    padding: spacing[2],
    borderWidth: 2,
    borderColor: colors.success.light,
    marginBottom: spacing[2],
  },
  phoneInputContainer: {
    marginBottom: spacing[2],
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  phoneInput: {
    flex: 1,
    padding: spacing[2],
    fontSize: 18,
    color: colors.text.primary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.warning.bg,
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.warning.light,
    marginTop: spacing[1],
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: colors.error.bg,
    borderRadius: radius.lg,
    padding: spacing[2],
    borderWidth: 2,
    borderColor: colors.error.light,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.brand.bg,
    borderRadius: radius.lg,
    padding: spacing[2],
    borderWidth: 1,
    borderColor: colors.brand.primary,
    marginTop: spacing[2],
  },
  resendButton: {
    alignItems: 'center',
    padding: spacing[2],
    marginTop: spacing[1],
  },
  resendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  backButton: {
    alignItems: 'center',
    padding: spacing[2],
    marginTop: spacing[1],
  },
});












