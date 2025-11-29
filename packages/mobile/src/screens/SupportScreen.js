import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { MessageCircle, Mail, Send, CheckCircle } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { Text, Headline, Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { APP_CONFIG } from '@fintrack/shared/constants';

export default function SupportScreen({ navigation }) {
  const { user } = useOrganization();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      showToast('Por favor, preencha todos os campos', 'warning');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showToast('Por favor, insira um e-mail válido', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Obter token de autenticação se disponível
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Chamar API de suporte do web
      const apiUrl = `${APP_CONFIG.API_URL}/support/send`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      setSubmitted(true);
      showToast('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');

      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: '',
      });

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      showToast(error.message || 'Erro ao enviar mensagem. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Suporte"
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.badge}>
            <MessageCircle size={16} color={colors.brand.primary} />
            <Caption style={{ color: colors.brand.primary, marginLeft: spacing[1] }}>
              Entre em Contato
            </Caption>
          </View>
          <Headline weight="bold" style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
            Fale conosco
          </Headline>
          <Caption color="secondary" align="center">
            Tem alguma dúvida, sugestão ou precisa de suporte? Estamos aqui para ajudar!
          </Caption>
        </Card>

        {submitted ? (
          <Card style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color={colors.success.main} />
            </View>
            <Headline weight="bold" align="center" style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
              Mensagem enviada!
            </Headline>
            <Callout color="secondary" align="center">
              Entraremos em contato em breve.
            </Callout>
          </Card>
        ) : (
          <>
            {/* Contact Info */}
            <Card style={styles.infoCard}>
              <Title2 weight="bold" style={{ marginBottom: spacing[2] }}>
                Informações de Contato
              </Title2>
              <Callout color="secondary" style={{ marginBottom: spacing[3] }}>
                Nossa equipe está sempre pronta para ajudar. Responderemos sua mensagem o mais rápido possível.
              </Callout>

              <View style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: colors.brand.bg }]}>
                  <Mail size={24} color={colors.brand.primary} />
                </View>
                <View style={styles.contactInfo}>
                  <Callout weight="semiBold" style={{ marginBottom: spacing[0.5] }}>
                    E-mail
                  </Callout>
                  <TouchableOpacity onPress={() => Linking.openURL('mailto:contato@meuazulao.com.br')}>
                    <Callout style={{ color: colors.brand.primary }}>
                      contato@meuazulao.com.br
                    </Callout>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: colors.success.bg }]}>
                  <MessageCircle size={24} color={colors.success.main} />
                </View>
                <View style={styles.contactInfo}>
                  <Callout weight="semiBold" style={{ marginBottom: spacing[0.5] }}>
                    WhatsApp
                  </Callout>
                  <Callout color="secondary">
                    Converse com o Zul pelo WhatsApp
                  </Callout>
                </View>
              </View>

              <View style={styles.hoursInfo}>
                <Caption color="tertiary">
                  Horário de atendimento:{'\n'}
                  Segunda a Sexta, 9h às 18h (horário de Brasília)
                </Caption>
              </View>
            </Card>

            {/* Contact Form */}
            <Card style={styles.formCard}>
              <Title2 weight="bold" style={{ marginBottom: spacing[3] }}>
                Enviar Mensagem
              </Title2>

              <Input
                label="Nome completo *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Seu nome"
                editable={!isSubmitting}
              />

              <Input
                label="E-mail *"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSubmitting}
              />

              <Input
                label="Assunto *"
                value={formData.subject}
                onChangeText={(text) => setFormData({ ...formData, subject: text })}
                placeholder="Qual o motivo do contato?"
                editable={!isSubmitting}
              />

              <View style={styles.field}>
                <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                  Mensagem *
                </Caption>
                <TextInput
                  style={styles.textArea}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  placeholder="Descreva sua dúvida, sugestão ou problema..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />
              </View>

              <Button
                title={isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                onPress={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()}
                icon={!isSubmitting ? <Send size={20} color={colors.neutral[0]} /> : null}
                style={{ marginTop: spacing[2] }}
              />
            </Card>
          </>
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[3],
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    backgroundColor: colors.brand.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  infoCard: {
    marginBottom: spacing[3],
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  contactInfo: {
    flex: 1,
  },
  hoursInfo: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  formCard: {
    marginBottom: spacing[3],
  },
  field: {
    marginTop: spacing[2],
  },
  textArea: {
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 120,
    fontSize: 16,
    color: colors.text.primary,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.success.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

