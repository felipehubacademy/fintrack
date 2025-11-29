import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { HelpCircle, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Callout, Caption } from '../ui/Text';
import { Card } from '../ui/Card';

export function Tooltip({ 
  title, 
  content, 
  iconSize = 16, 
  iconColor = colors.text.tertiary,
  style 
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.iconButton, style]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`Informação sobre ${title || 'conteúdo'}`}
        accessibilityHint="Toque para ver informações adicionais"
      >
        <HelpCircle size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />
          <View style={styles.tooltipContainer}>
            <Card style={styles.tooltipCard}>
              <View style={styles.header}>
                <Callout weight="semiBold">{title}</Callout>
                <TouchableOpacity 
                  onPress={() => setVisible(false)} 
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  accessibilityHint="Fechar dica"
                >
                  <X size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              <Caption color="secondary" style={styles.content}>
                {content}
              </Caption>
            </Card>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: spacing[0.5],
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.neutral[900] + '99', // 60% opacity
  },

  tooltipContainer: {
    width: '100%',
    maxWidth: 400,
  },

  tooltipCard: {
    ...shadows.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  closeButton: {
    padding: spacing[0.5],
  },

  content: {
    lineHeight: 20,
  },
});

