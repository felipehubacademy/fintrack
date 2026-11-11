import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { useTheme } from '../contexts/ThemeContext';
import { Text } from '../components/ui/Text';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { ProfileModal } from '../components/settings/ProfileModal';

export default function MoreScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { organization, user, refetch } = useOrganization();
  const { confirm } = useConfirmation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    try {
      await confirm({
        title: 'Sair',
        message: 'Tem certeza que deseja sair?',
        type: 'warning',
        confirmText: 'Sair',
        onConfirm: async () => {
          await supabase.auth.signOut();
        },
      });
    } catch (error) {}
  };

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] || '';

  const sections = [
    {
      title: 'Ferramentas',
      items: [
        { icon: Calendar, label: 'Fechamento Mensal', color: '#1A6AFF', screen: 'Closing' },
        { icon: FileCheck, label: 'Contas a Pagar', color: '#F5A623', screen: 'Bills' },
        { icon: Target, label: 'Orçamentos', color: '#10B981', screen: 'Budgets' },
        { icon: BarChart3, label: 'Análises', color: '#0EA5E9', screen: 'Insights' },
        { icon: Target, label: 'Metas', color: '#A855F7', screen: 'Goals' },
        { icon: TrendingUp, label: 'Investimentos', color: '#059669', screen: 'Investments' },
      ],
    },
    {
      title: 'Conta',
      items: [
        { icon: User, label: 'Meu Perfil', color: '#6366F1', onPress: () => setShowProfileModal(true) },
        { icon: Settings, label: 'Configurações', color: '#78716C', screen: 'Settings' },
      ],
    },
    {
      title: 'Sobre',
      items: [
        { icon: HelpCircle, label: 'Ajuda e Suporte', color: '#0EA5E9', screen: 'Help' },
        { icon: FileText, label: 'Termos de Uso', color: '#78716C', screen: 'TermsOfService' },
        { icon: Shield, label: 'Política de Privacidade', color: '#78716C', screen: 'PrivacyPolicy' },
      ],
    },
  ];

  const bg = isDark ? '#0A0A0A' : '#F2F2F7';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#38383A' : '#E5E5EA';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#8E8E93' : '#6B7280';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>Mais</Text>
          {firstName ? (
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Olá, {firstName}
            </Text>
          ) : null}
        </View>

        {/* Sections */}
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.row,
                    ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                  ]}
                  onPress={item.onPress || (() => navigation.navigate(item.screen))}
                  activeOpacity={0.6}
                >
                  <View style={[styles.iconBox, { backgroundColor: `${item.color}14` }]}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <Text style={[styles.rowLabel, { color: textPrimary }]}>{item.label}</Text>
                  <ChevronRight size={18} color={isDark ? '#48484A' : '#C7C7CC'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
          onPress={handleLogout}
          activeOpacity={0.6}
        >
          <LogOut size={18} color="#FF3B30" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#48484A' : '#AEAEB2' }]}>
            MeuAzulão v1.0.0
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
  card: { borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#FF3B30' },

  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 12 },
});
