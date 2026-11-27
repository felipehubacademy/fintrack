import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import {
  Bell,
  Users,
  Tag,
  Trash2,
  LogOut,
  FileText,
  Shield,
  MessageCircle,
  HelpCircle,
  User,
  ChevronRight,
  Globe,
  Coins,
  Crown,
  CreditCard,
  RotateCcw,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { spacing, radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { MemberManagementModal } from '../components/settings/MemberManagementModal';
import { CategoryManagementModal } from '../components/settings/CategoryManagementModal';
import { NotificationSettingsModal } from '../components/settings/NotificationSettingsModal';
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal';
import { ProfileModal } from '../components/settings/ProfileModal';
import { LanguagePickerModal, CurrencyPickerModal, currencyLabel } from '../components/settings/LocalePickers';
import { legalUrl, deleteMyAccount } from '../components/settings/accountApi';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { useBilling } from '../hooks/useBilling';
import { openManageSubscriptions } from '../services/billing';
import { planStatusText, canManageInStore } from '../components/billing/planStatus';

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language, currency, locale, setLanguage, setCurrency, formatDate } = useI18n();
  const billing = useBilling();
  const { organization, user, isSoloUser, refetch } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();

  const [modal, setModal] = useState(null); // 'members' | 'categories' | 'notifications' | 'profile' | 'delete' | 'language' | 'currency'
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const closeModal = () => setModal(null);

  const openLegal = (kind) => {
    Linking.openURL(legalUrl(kind, language)).catch(() => showToast(t('settings.openLinkError'), 'error'));
  };

  const handleLogout = async () => {
    try {
      await confirm({
        title: t('settings.logout.title'),
        message: t('settings.logout.message'),
        type: 'warning',
        confirmText: t('settings.logout.confirm'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          await supabase?.auth.signOut();
        },
      });
    } catch (error) {
      // cancelled
    }
  };

  // Deletes everything server-side (data + Auth user) through the web API,
  // then signs out locally. Works for admins and members alike.
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteMyAccount(supabase);
      setModal(null);
      showToast(t('settings.deleteAccount.success'), 'success');
    } catch (error) {
      const key = error?.status === 0
        ? 'network'
        : (error?.status === 401 || error?.status === 403 ? 'session' : 'generic');
      setDeleteError(t(`settings.deleteAccount.errors.${key}`));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const restorePurchases = async () => {
    const result = await billing.restore();
    if (result.ok && result.restored) showToast(t('billing.paywall.restored'), 'success');
    else if (result.ok) showToast(t('billing.paywall.nothingToRestore'), 'info');
    else showToast(t('billing.paywall.unavailable'), 'error');
  };

  const manageSubscription = () => {
    openManageSubscriptions(billing.managementURL).catch(() => showToast(t('settings.openLinkError'), 'error'));
  };

  // Plan (7-day trial, then Plus). Hidden when the paywall flag is off.
  const planSection = isFeatureEnabled('paywall') ? [{
    key: 'plan',
    title: t('billing.plan.section'),
    items: [
      {
        key: 'plan',
        icon: Crown,
        label: t('billing.plan.label'),
        description: planStatusText(billing, t, formatDate),
        onPress: billing.isPlus ? (canManageInStore(billing) ? manageSubscription : undefined) : billing.showPaywall,
        noChevron: billing.isPlus && !canManageInStore(billing),
      },
      ...(canManageInStore(billing) ? [{
        key: 'manage',
        icon: CreditCard,
        label: t('billing.plan.manage'),
        description: t(Platform.OS === 'android' ? 'billing.plan.manageAndroid' : 'billing.plan.manageIos'),
        onPress: manageSubscription,
      }] : []),
      {
        key: 'restore',
        icon: RotateCcw,
        label: billing.restoring ? t('billing.paywall.restoring') : t('billing.plan.restore'),
        description: t('billing.plan.restoreDescription'),
        onPress: restorePurchases,
        noChevron: true,
      },
    ],
  }] : [];

  const sections = [
    ...planSection,
    {
      key: 'preferences',
      title: t('settings.sections.preferences'),
      items: [
        {
          key: 'language',
          icon: Globe,
          label: t('settings.language.label'),
          description: t(`common.languages.${language}`),
          onPress: () => setModal('language'),
        },
        {
          key: 'currency',
          icon: Coins,
          label: t('settings.currency.label'),
          description: currencyLabel(t, currency, locale),
          onPress: () => setModal('currency'),
        },
        {
          key: 'notifications',
          icon: Bell,
          label: t('settings.notifications.label'),
          description: t('settings.notifications.description'),
          onPress: () => setModal('notifications'),
        },
      ],
    },
    {
      key: 'account',
      title: t('settings.sections.account'),
      items: [
        {
          key: 'profile',
          icon: User,
          label: t('settings.profile.label'),
          description: t('settings.profile.description'),
          onPress: () => setModal('profile'),
        },
        ...(!isSoloUser ? [{
          key: 'members',
          icon: Users,
          label: t('settings.members.label'),
          description: t('settings.members.description'),
          onPress: () => setModal('members'),
        }] : []),
        {
          key: 'categories',
          icon: Tag,
          label: t('settings.categories.label'),
          description: t('settings.categories.description'),
          onPress: () => setModal('categories'),
        },
      ],
    },
    {
      key: 'help',
      title: t('settings.sections.help'),
      items: [
        {
          key: 'help',
          icon: HelpCircle,
          label: t('settings.help.label'),
          description: t('settings.help.description'),
          onPress: () => navigation.navigate('Help'),
        },
        {
          key: 'support',
          icon: MessageCircle,
          label: t('settings.support.label'),
          description: t('settings.support.description'),
          onPress: () => navigation.navigate('Support'),
        },
        {
          key: 'privacy',
          icon: Shield,
          label: t('settings.privacy.label'),
          description: t('settings.privacy.description'),
          onPress: () => openLegal('privacy'),
        },
        {
          key: 'terms',
          icon: FileText,
          label: t('settings.terms.label'),
          description: t('settings.terms.description'),
          onPress: () => openLegal('terms'),
        },
      ],
    },
    {
      key: 'session',
      title: t('settings.sections.session'),
      items: [
        {
          key: 'logout',
          icon: LogOut,
          label: t('settings.logout.label'),
          description: t('settings.logout.description'),
          onPress: handleLogout,
          noChevron: true,
        },
        {
          key: 'delete',
          icon: Trash2,
          label: t('settings.deleteAccount.label'),
          description: t('settings.deleteAccount.description'),
          danger: true,
          noChevron: true,
          onPress: () => { setDeleteError(null); setModal('delete'); },
        },
      ],
    },
  ];

  const version = Constants.expoConfig?.version || '1.0.0';
  const appName = t('navigation.appName');
  const danger = colors.error?.main || '#F04438';

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScreenHeader user={user} title={t('settings.title')} showBackButton />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.profileRow, { backgroundColor: colors.background.secondary }]}
          onPress={() => setModal('profile')}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={[styles.avatar, { backgroundColor: `${colors.brand.primary}1A` }]}>
            <User size={24} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Title2 weight="bold">{user?.name || t('settings.userFallback')}</Title2>
            {organization?.name ? <Caption color="secondary">{organization.name}</Caption> : null}
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Caption color="secondary" weight="semiBold" style={styles.sectionTitle}>
              {section.title}
            </Caption>
            <Card style={styles.menuCard}>
              {section.items.map((item, index) => {
                const tint = item.danger ? danger : colors.brand.primary;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.menuItem,
                      index < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.light },
                    ]}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: `${tint}14` }]}>
                      <item.icon size={22} color={tint} />
                    </View>
                    <View style={styles.menuInfo}>
                      <Callout weight="medium" style={item.danger ? { color: danger } : null}>{item.label}</Callout>
                      <Caption color="secondary">{item.description}</Caption>
                    </View>
                    {!item.noChevron && <ChevronRight size={20} color={colors.text.tertiary} />}
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        ))}

        <View style={styles.appInfo}>
          <Caption color="secondary" align="center">{`${appName} · ${t('settings.version', { version })}`}</Caption>
          <Caption color="tertiary" align="center" style={{ marginTop: spacing[0.5] }}>
            {t('settings.copyright', { year: new Date().getFullYear(), appName })}
          </Caption>
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>

      <ProfileModal
        visible={modal === 'profile'}
        onClose={closeModal}
        user={user}
        organization={organization}
        onRefresh={refetch}
      />
      <MemberManagementModal
        visible={modal === 'members'}
        onClose={closeModal}
        organization={organization}
        orgUser={user}
      />
      <CategoryManagementModal
        visible={modal === 'categories'}
        onClose={closeModal}
        organization={organization}
      />
      <NotificationSettingsModal
        visible={modal === 'notifications'}
        onClose={closeModal}
        organization={organization}
        user={user}
      />
      <LanguagePickerModal
        visible={modal === 'language'}
        value={language}
        onSelect={setLanguage}
        onClose={closeModal}
      />
      <CurrencyPickerModal
        visible={modal === 'currency'}
        value={currency}
        onSelect={setCurrency}
        onClose={closeModal}
      />
      <DeleteAccountModal
        visible={modal === 'delete'}
        onClose={closeModal}
        onConfirm={handleDeleteAccount}
        loading={isDeletingAccount}
        errorMessage={deleteError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[2] },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[2],
    borderRadius: 12,
    marginBottom: spacing[3],
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: spacing[3] },
  sectionTitle: { marginBottom: spacing[1], paddingHorizontal: spacing[1] },
  menuCard: { padding: 0, overflow: 'hidden', borderRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing[2], gap: spacing[2] },
  menuIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, gap: spacing[0.5] },
  appInfo: { marginTop: spacing[2], alignItems: 'center' },
});
