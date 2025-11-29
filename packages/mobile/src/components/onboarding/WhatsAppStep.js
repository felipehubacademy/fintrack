import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { MessageCircle, CheckCircle, AlertCircle } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { WhatsAppVerificationModal } from '../settings/WhatsAppVerificationModal';

export default function WhatsAppStep({ user, onComplete, onDataChange }) {
  const [showModal, setShowModal] = useState(false);
  const [isVerified, setIsVerified] = useState(user?.phone_verified || false);

  const handleVerified = () => {
    setIsVerified(true);
    if (onDataChange) {
      onDataChange({ phone_verified: true });
    }
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <MessageCircle size={64} color={colors.brand.primary} />
        </View>

        <Title2 style={styles.title}>
          Conecte seu WhatsApp
        </Title2>

        <Text style={styles.description}>
          Receba notificações importantes sobre suas finanças diretamente no WhatsApp
        </Text>

        {isVerified ? (
          <View style={styles.verifiedContainer}>
            <CheckCircle size={24} color={colors.success.main} />
            <Text style={styles.verifiedText}>
              WhatsApp verificado com sucesso!
            </Text>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <AlertCircle size={20} color={colors.warning.main} />
            <Caption style={styles.infoText}>
              Você pode pular esta etapa e configurar depois
            </Caption>
          </View>
        )}

        <Button
          title={isVerified ? "Continuar" : "Verificar WhatsApp"}
          onPress={() => {
            if (isVerified) {
              onComplete();
            } else {
              setShowModal(true);
            }
          }}
          style={styles.button}
        />
      </ScrollView>

      <WhatsAppVerificationModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        user={user}
        onVerified={handleVerified}
      />
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing[6],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  description: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.bg,
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
  },
  verifiedText: {
    marginLeft: spacing[2],
    color: colors.success.main,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.bg,
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[4],
  },
  infoText: {
    marginLeft: spacing[2],
    color: colors.warning.main,
  },
  button: {
    marginTop: spacing[4],
  },
});

