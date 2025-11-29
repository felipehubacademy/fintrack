import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { UserPlus, Mail } from 'lucide-react-native';
import { colors, spacing } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

export default function InviteStep({ organization, user, onComplete, onDataChange }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSendInvite = async () => {
    if (!validateEmail(email)) {
      showToast('Por favor, insira um email válido', 'warning');
      return;
    }

    if (!name.trim()) {
      showToast('Por favor, insira o nome da pessoa', 'warning');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implementar chamada à API de convites quando disponível
      // Por enquanto, apenas simula o sucesso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onDataChange) {
        onDataChange({ invites_sent: 1 });
      }
      
      showToast('Convite enviado com sucesso!', 'success');
      
      // Avançar automaticamente após enviar
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 800);
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showToast('Erro ao enviar convite. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <UserPlus size={64} color={colors.brand.primary} />
        </View>

        <Title2 style={styles.title}>
          Convidar familiar
        </Title2>

        <Text style={styles.description}>
          Convide pessoas da sua família para gerenciar as finanças juntos
        </Text>

        <View style={styles.form}>
          <Input
            label="Nome"
            value={name}
            onChangeText={setName}
            placeholder="Nome da pessoa"
            autoCapitalize="words"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.emailInput}
          />
        </View>

        <Caption style={styles.hint}>
          Você pode convidar mais pessoas depois nas configurações
        </Caption>

        <Button
          title="Enviar Convite"
          onPress={handleSendInvite}
          loading={loading}
          disabled={!email || !name.trim()}
          style={styles.button}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  description: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing[4],
  },
  emailInput: {
    marginTop: spacing[3],
  },
  hint: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginBottom: spacing[4],
  },
  button: {
    marginTop: spacing[2],
  },
});

