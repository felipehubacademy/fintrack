import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { 
  User,
  Bell,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Settings,
  CreditCard,
  Target,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  FileCheck,
  BarChart3,
  DollarSign,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { colors, spacing, radius, shadows } from '../theme';
import { Text, Headline, Callout, Caption } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useAlert } from '../components/ui/AlertProvider';
import { ProfileModal } from '../components/settings/ProfileModal';

export default function MoreScreen({ navigation }) {
  const { organization, user, refetch } = useOrganization();
  const { confirm } = useConfirmation();
  const { alert } = useAlert();
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
    } catch (error) {
      // Usuário cancelou
    }
  };

  const menuSections = [
    {
      items: [
        {
          icon: Calendar,
          label: 'Fechamento Mensal',
          description: 'Alocações vs Despesas do mês',
          color: colors.brand.primary,
          onPress: () => navigation.navigate('Closing'),
        },
        {
          icon: FileCheck,
          label: 'Contas a Pagar',
          description: 'Gerencie suas contas e vencimentos',
          color: colors.warning.main,
          onPress: () => navigation.navigate('Bills'),
        },
        {
          icon: Target,
          label: 'Orçamentos',
          description: 'Defina limites por categoria',
          color: colors.success.main,
          onPress: () => navigation.navigate('Budgets'),
        },
        {
          icon: BarChart3,
          label: 'Análises',
          description: 'Insights e tendências financeiras',
          color: colors.info.main,
          onPress: () => navigation.navigate('Insights'),
        },
        {
          icon: Target,
          label: 'Metas',
          description: 'Acompanhe seus objetivos financeiros',
          color: colors.brand.secondary,
          onPress: () => navigation.navigate('Goals'),
        },
        {
          icon: TrendingUp,
          label: 'Investimentos',
          description: 'Gerencie sua carteira de investimentos',
          color: colors.success.dark,
          onPress: () => navigation.navigate('Investments'),
        },
      ],
    },
    {
      title: 'Conta e Configurações',
      items: [
        {
          icon: User,
          label: 'Meu Perfil',
          description: 'Edite suas informações',
          color: colors.text.primary,
          onPress: () => setShowProfileModal(true),
        },
        {
          icon: Settings,
          label: 'Configurações',
          description: 'Preferências do aplicativo',
          color: colors.text.primary,
          onPress: () => navigation.navigate('Settings'),
        },
      ],
    },
    {
      title: 'Suporte',
      items: [
        {
          icon: HelpCircle,
          label: 'Ajuda e Suporte',
          description: 'Tire suas dúvidas',
          color: colors.text.primary,
          onPress: () => navigation.navigate('Help'),
        },
        {
          icon: FileText,
          label: 'Termos de Uso',
          description: 'Leia nossos termos',
          color: colors.text.primary,
          onPress: () => navigation.navigate('TermsOfService'),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Mais"
        showLogo={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title && (
              <Caption 
                color="secondary" 
                weight="semiBold" 
                style={styles.sectionTitle}
              >
                {section.title}
              </Caption>
            )}

            <Card style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                    <item.icon size={24} color={item.color} />
                  </View>
                  <View style={styles.menuInfo}>
                    <Callout weight="medium">{item.label}</Callout>
                    <Caption color="secondary">{item.description}</Caption>
                  </View>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={colors.error.main} />
          <Text variant="callout" weight="semiBold" style={{ color: colors.error.main }}>
            Sair da Conta
          </Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Caption color="secondary" align="center">
            MeuAzulão v1.0.0
          </Caption>
          <Caption color="secondary" align="center">
            © 2024 MeuAzulão
          </Caption>
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Profile Modal */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing[3],
  },

  section: {
    marginBottom: spacing[3],
  },

  sectionTitle: {
    marginBottom: spacing[1.5],
    paddingHorizontal: spacing[1],
  },

  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    gap: spacing[2],
  },

  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuInfo: {
    flex: 1,
    gap: spacing[0.5],
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    padding: spacing[2.5],
    borderRadius: radius.lg,
    backgroundColor: colors.error.bg,
    marginTop: spacing[2],
  },

  appInfo: {
    marginTop: spacing[4],
    gap: spacing[0.5],
  },
});
