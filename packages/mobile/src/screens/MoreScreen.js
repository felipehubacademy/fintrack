import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  User,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Settings,
  Calendar,
  FileCheck,
  Target,
  BarChart3,
  TrendingUp,
  Shield,
  Flag,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Text } from '../components/ui/Text';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { ProfileModal } from '../components/settings/ProfileModal';
import { legalUrl } from '../components/settings/accountApi';
import { shortDisplayName } from '../components/financial/contactDisplay';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { buildMoreSections } from '../navigation/routes';

const ICONS = {
  calendar: Calendar,
  bills: FileCheck,
  target: Target,
  chart: BarChart3,
  goal: Flag,
  trending: TrendingUp,
  user: User,
  settings: Settings,
  help: HelpCircle,
  file: FileText,
  shield: Shield,
};

export default function MoreScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const { organization, user, refetch } = useOrganization();
  const { confirm } = useConfirmation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    try {
      await confirm({
        title: t('navigation.logout.title'),
        message: t('navigation.logout.message'),
        type: 'warning',
        confirmText: t('navigation.logout.confirm'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          await supabase?.auth.signOut();
        },
      });
    } catch (error) {
      // cancelled
    }
  };

  const handleItem = (item) => {
    if (item.action === 'profile') return setShowProfileModal(true);
    if (item.action === 'terms' || item.action === 'privacy') {
      return Linking.openURL(legalUrl(item.action, language)).catch(() => {});
    }
    return navigation.navigate(item.screen);
  };

  // Never derived from a WhatsApp placeholder email (wa<digits>@phone...).
  const firstName = shortDisplayName(user);
  const sections = buildMoreSections(t, isFeatureEnabled);
  const version = Constants.expoConfig?.version || '1.0.0';

  const bg = isDark ? '#0B0F17' : '#F5F7FB';
  const cardBg = isDark ? '#141A24' : '#FFFFFF';
  const borderColor = isDark ? '#232B38' : '#E5E8EF';
  const textPrimary = isDark ? '#F4F6FA' : '#0B1220';
  const textSecondary = isDark ? '#9AA3B2' : '#5B6475';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>{t('navigation.more.title')}</Text>
          {firstName ? (
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              {t('navigation.more.greeting', { name: firstName })}
            </Text>
          ) : null}
        </View>

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {section.items.map((item, ii) => {
                const Icon = ICONS[item.icon] || FileText;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.row,
                      ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                    ]}
                    onPress={() => handleItem(item)}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={[styles.iconBox, { backgroundColor: `${item.color}14` }]}>
                      <Icon size={20} color={item.color} />
                    </View>
                    <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.label}</Text>
                    <ChevronRight size={18} color={isDark ? '#5B6475' : '#B4BBC8'} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: cardBg }]}
          onPress={handleLogout}
          activeOpacity={0.6}
          accessibilityRole="button"
        >
          <LogOut size={18} color={colors.error?.main || '#F04438'} />
          <Text style={[styles.logoutText, { color: colors.error?.main || '#F04438' }]}>
            {t('navigation.more.logout')}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondary }]}>
            {t('navigation.more.version', { appName: t('navigation.appName'), version })}
          </Text>
        </View>
      </ScrollView>

      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        organization={organization}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },

  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 12 },
});
