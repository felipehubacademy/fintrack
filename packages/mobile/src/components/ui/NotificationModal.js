import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { X, Check, Trash2, Bell, AlertCircle, Clock, Info, CheckCircle } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text, Title2, Callout, Caption, Subheadline } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { useOrganization } from '../../hooks/useOrganization';
import { formatBrazilDayMonthNumeric } from '../../utils/date';

const { height } = Dimensions.get('window');

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent':
      return { bg: colors.error.bg, text: colors.error.main, border: colors.error.main };
    case 'high':
      return { bg: colors.warning.bg, text: colors.warning.main, border: colors.warning.main };
    case 'normal':
      return { bg: colors.brand.bg, text: colors.brand.primary, border: colors.brand.primary };
    case 'low':
      return { bg: colors.neutral[100], text: colors.text.secondary, border: colors.border.light };
    default:
      return { bg: colors.neutral[100], text: colors.text.secondary, border: colors.border.light };
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'bill_reminder':
      return '🔔';
    case 'investment_reminder':
      return '🎯';
    case 'budget_alert':
      return '⚠️';
    case 'daily_reminder':
      return '📊';
    case 'weekly_report':
      return '📈';
    case 'monthly_report':
      return '📊';
    case 'insight':
      return '💡';
    case 'expense_confirmation':
      return '✅';
    case 'system_alert':
      return '🚨';
    default:
      return '📢';
  }
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return formatBrazilDayMonthNumeric(dateString);
};

export default function NotificationModal({ visible, onClose }) {
  const { user, organization } = useOrganization();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useInAppNotifications(user?.id, organization?.id);

  const displayNotifications = notifications.slice(0, 20);

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Bell size={24} color={colors.text.primary} />
              <View style={styles.headerTitle}>
                <Title2 weight="semiBold">Notificações</Title2>
                {unreadCount > 0 && (
                  <Caption color="secondary">
                    {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
                  </Caption>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllAsRead}
                  style={styles.markAllButton}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={18} color={colors.brand.primary} />
                  <Caption style={{ color: colors.brand.primary, marginLeft: spacing[0.5] }}>
                    Todas
                  </Caption>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.emptyContainer}>
                <Text color="secondary">Carregando notificações...</Text>
              </View>
            ) : displayNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bell size={48} color={colors.text.tertiary} />
                <Text color="secondary" style={{ marginTop: spacing[2] }}>
                  Nenhuma notificação
                </Text>
              </View>
            ) : (
              displayNotifications.map((notification) => {
                const isUnread = !notification.read_at;
                const priorityColors = getPriorityColor(notification.priority || 'normal');

                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      isUnread && styles.notificationItemUnread,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isUnread) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationLeft}>
                        <Text style={styles.notificationIcon}>
                          {getTypeIcon(notification.type)}
                        </Text>
                        <View style={styles.notificationText}>
                          <Subheadline weight="semiBold" numberOfLines={2}>
                            {notification.title}
                          </Subheadline>
                          <Caption color="secondary" numberOfLines={2} style={{ marginTop: spacing[0.5] }}>
                            {notification.message}
                          </Caption>
                          <View style={styles.notificationFooter}>
                            <Caption color="tertiary" style={{ fontSize: 11 }}>
                              {formatTime(notification.created_at)}
                            </Caption>
                            <View
                              style={[
                                styles.priorityBadge,
                                {
                                  backgroundColor: priorityColors.bg,
                                  borderColor: priorityColors.border,
                                },
                              ]}
                            >
                              <Caption style={{ color: priorityColors.text, fontSize: 10 }}>
                                {notification.priority || 'normal'}
                              </Caption>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={styles.notificationActions}>
                        {isUnread && (
                          <TouchableOpacity
                            onPress={() => markAsRead(notification.id)}
                            style={styles.actionButton}
                            activeOpacity={0.7}
                          >
                            <Check size={16} color={colors.success.main} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => deleteNotification(notification.id)}
                          style={styles.actionButton}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color={colors.error.main} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
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
    zIndex: 10000,
    elevation: 10000,
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '95%',
    maxHeight: height * 0.8,
    ...shadows.lg,
    zIndex: 10001,
    elevation: 10001,
    overflow: 'hidden',
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
  headerTitle: {
    marginLeft: spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[1],
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    maxHeight: height * 0.8 - 100, // Altura total menos header
  },
  contentContainer: {
    padding: spacing[2],
    flexGrow: 1,
  },
  emptyContainer: {
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationItem: {
    padding: spacing[2],
    marginBottom: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
  },
  notificationItemUnread: {
    backgroundColor: colors.brand.bg,
  },
  notificationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: spacing[2],
  },
  notificationText: {
    flex: 1,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    gap: spacing[1.5],
  },
  priorityBadge: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: spacing[1],
    marginLeft: spacing[1],
  },
  actionButton: {
    padding: spacing[1],
  },
});

