import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Button } from '../ui/Button';

const { height } = Dimensions.get('window');

export function DeleteAccountModal({ visible, onClose, onConfirm, loading = false }) {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'Deletar minha conta';
  const isConfirmed = confirmText.trim() === requiredText;

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
            <View style={styles.headerLeft}>
              <AlertTriangle size={24} color={colors.error.main} />
              <Title2 weight="bold" style={{ marginLeft: spacing[2] }}>
                Excluir Conta Permanentemente
              </Title2>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={loading}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
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
            {/* Warning */}
            <View style={styles.warningBox}>
              <Callout weight="bold" style={{ color: colors.error.dark, marginBottom: spacing[1] }}>
                Esta ação é irreversível
              </Callout>
              <Caption style={{ color: colors.error.dark }}>
                Ao excluir sua conta, <Text weight="bold">todos os seus dados serão permanentemente removidos</Text> do sistema.
              </Caption>
              <Caption style={{ color: colors.error.main, marginTop: spacing[2], fontWeight: '600' }}>
                Esta ação não pode ser desfeita.
              </Caption>
            </View>

            {/* Confirmation Input */}
            <View style={styles.field}>
              <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                Digite <Text style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>"{requiredText}"</Text> para confirmar:
              </Caption>
              <TextInput
                style={styles.input}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={requiredText}
                editable={!loading}
                autoFocus
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => {
                setConfirmText('');
                onClose();
              }}
              disabled={loading}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={loading ? 'Excluindo...' : 'Excluir Conta Permanentemente'}
              onPress={() => {
                if (isConfirmed) {
                  onConfirm();
                }
              }}
              disabled={!isConfirmed || loading}
              style={[
                { flex: 1 },
                { backgroundColor: colors.error.main },
              ]}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '90%',
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
  },
  warningBox: {
    backgroundColor: colors.error.bg,
    borderRadius: radius.md,
    padding: spacing[2],
    borderWidth: 2,
    borderColor: colors.error.main,
    marginBottom: spacing[3],
  },
  field: {
    marginBottom: spacing[3],
  },
  input: {
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border.main,
    fontSize: 16,
    color: colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

