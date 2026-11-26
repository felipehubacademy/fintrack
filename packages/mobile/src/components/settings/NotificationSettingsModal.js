import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { X, Bell, Mail, MessageSquare, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../contexts/I18nContext';

const { height } = Dimensions.get('window');

// Keys match user_preferences.settings; labels in settings.notificationsModal.types.
const NOTIFICATION_TYPES = [
  { key: 'emailNotifications', icon: Mail },
  { key: 'whatsappNotifications', icon: MessageSquare },
  { key: 'budgetWarnings', icon: AlertTriangle },
  { key: 'expenseAlerts', icon: Bell },
  { key: 'weeklyReports', icon: Mail },
  { key: 'monthlyReports', icon: Mail },
];

export function NotificationSettingsModal({ visible, onClose, organization, user }) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    whatsappNotifications: true,
    budgetWarnings: true,
    expenseAlerts: true,
    weeklyReports: false,
    monthlyReports: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      fetchSettings();
    }
  }, [visible, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (data && data.settings) {
        setSettings({ ...settings, ...data.settings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          organization_id: organization.id,
          settings: settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      showToast(t('settings.notificationsModal.saved'), 'success');
      onClose();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      showToast(t('settings.notificationsModal.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top || spacing[4], paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modal,
            { maxHeight: Math.min(height * 0.85, height - (insets.top + insets.bottom) - spacing[6]) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Title2 weight="bold">{t('settings.notificationsModal.title')}</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Caption color="secondary">{t('settings.notificationsModal.loading')}</Caption>
              </View>
            ) : (
              <>
                <Caption color="secondary" style={{ marginBottom: spacing[3] }}>
                  {t('settings.notificationsModal.intro')}
                </Caption>

                {NOTIFICATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <View key={type.key} style={styles.notificationItem}>
                      <View style={styles.notificationLeft}>
                        <View style={styles.iconContainer}>
                          <Icon size={20} color={colors.brand.primary} />
                        </View>
                        <View style={styles.notificationInfo}>
                          <Callout weight="medium">{t(`settings.notificationsModal.types.${type.key}.title`)}</Callout>
                          <Caption color="secondary">{t(`settings.notificationsModal.types.${type.key}.description`)}</Caption>
                        </View>
                      </View>
                      <Switch
                        value={settings[type.key]}
                        onValueChange={() => toggleSetting(type.key)}
                        trackColor={{ false: colors.neutral[300], true: colors.brand.primary }}
                        thumbColor={colors.neutral[0]}
                      />
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <Button
              title={saving ? t('settings.notificationsModal.saving') : t('common.save')}
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    width: '100%',
    minHeight: height * 0.5,
    flexDirection: 'column',
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
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  contentContainer: {
    padding: spacing[3],
    flexGrow: 1,
  },
  loadingContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    marginBottom: spacing[2],
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  notificationInfo: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

