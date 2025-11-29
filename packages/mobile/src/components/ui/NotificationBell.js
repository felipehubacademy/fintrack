import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Caption } from './Text';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { useOrganization } from '../../hooks/useOrganization';
import NotificationModal from './NotificationModal';

export function NotificationBell() {
  const { user, organization } = useOrganization();
  const { unreadCount, loading } = useInAppNotifications(user?.id, organization?.id);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={styles.bellButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={unreadCount > 0 ? `Notificações: ${unreadCount} não lidas` : "Notificações"}
        accessibilityHint="Ver notificações"
      >
        <Bell size={24} color={colors.text.secondary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationModal visible={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: spacing[1],
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error.main,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  badgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

