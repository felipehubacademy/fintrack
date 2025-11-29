import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Settings,
  Bell,
  Users,
  Tag,
  Trash2,
  LogOut,
  FileText,
  MessageCircle,
  Link2,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { colors, spacing, radius } from '../theme';
import { Text, Headline, Callout, Caption, Title2 } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { MemberManagementModal } from '../components/settings/MemberManagementModal';
import { CategoryManagementModal } from '../components/settings/CategoryManagementModal';
import { NotificationSettingsModal } from '../components/settings/NotificationSettingsModal';
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal';
import { ProfileModal } from '../components/settings/ProfileModal';
import Logo from '../components/ui/Logo';

export default function SettingsScreen({ navigation }) {
  const { organization, user, isSoloUser, refetch } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (!user || !organization) return;

    setIsDeletingAccount(true);
    try {
      const isAdmin = user.role === 'admin' || organization.admin_id === user.id;

      if (isAdmin) {
        // Admin precisa deletar via API (não implementado no mobile ainda)
        showToast('Exclusão de conta de admin requer ação no web', 'warning');
        setIsDeletingAccount(false);
        return;
      }

      // Deletar dados do usuário (mesma lógica do web)
      const { data: userExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', user.id);

      if (userExpenses && userExpenses.length > 0) {
        const expenseIds = userExpenses.map(e => e.id);
        await supabase
          .from('expense_splits')
          .delete()
          .in('expense_id', expenseIds);
      }

      const { data: userIncomes } = await supabase
        .from('incomes')
        .select('id')
        .eq('user_id', user.id);

      if (userIncomes && userIncomes.length > 0) {
        const incomeIds = userIncomes.map(i => i.id);
        await supabase
          .from('income_splits')
          .delete()
          .in('income_id', incomeIds);
      }

      await supabase.from('bills').delete().eq('user_id', user.id);
      await supabase.from('expenses').delete().eq('user_id', user.id);
      await supabase.from('incomes').delete().eq('user_id', user.id);
      await supabase.from('cards').delete().eq('owner_id', user.id);
      await supabase.from('bank_account_transactions').delete().eq('user_id', user.id);
      await supabase.from('bank_accounts').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
      await supabase.from('cost_centers').delete().eq('user_id', user.id);
      await supabase.from('verification_codes').delete().eq('user_id', user.id);
      await supabase.from('user_tours').delete().eq('user_id', user.id);
      await supabase.from('investment_contributions').delete().eq('user_id', user.id);
      await supabase.from('investment_goals').delete().eq('user_id', user.id);
      await supabase.from('onboarding_progress').delete().eq('user_id', user.id);
      await supabase.from('pending_invites').delete().eq('invited_email', user.email);

      await supabase.from('users').delete().eq('id', user.id);
      await supabase.auth.signOut();
    } catch (error) {showToast('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const settingsSections = [
    {
      title: 'Configurações',
      items: [
        ...(!isSoloUser ? [{
          icon: Users,
          label: 'Gerenciar Membros',
          description: 'Adicionar, remover e gerenciar membros',
          color: colors.brand.primary,
          onPress: () => setShowMemberModal(true),
        }] : []),
        {
          icon: Bell,
          label: 'Notificações',
          description: 'Configurar alertas e relatórios',
          color: colors.brand.primary,
          onPress: () => setShowNotificationModal(true),
        },
        {
          icon: Tag,
          label: 'Categorias',
          description: 'Personalizar categorias de despesas e receitas',
          color: colors.brand.primary,
          onPress: () => setShowCategoryModal(true),
        },
        {
          icon: Link2,
          label: 'Open Finance',
          description: 'Gerenciar conexões bancárias',
          color: colors.brand.primary,
          onPress: () => showToast('Em breve', 'info'),
        },
      ],
    },
    {
      title: 'Legal e Suporte',
      items: [
        {
          icon: FileText,
          label: 'Política de Privacidade',
          description: 'Como tratamos seus dados',
          color: colors.text.primary,
          onPress: () => navigation.navigate('PrivacyPolicy'),
        },
        {
          icon: FileText,
          label: 'Termos de Uso',
          description: 'Condições de utilização',
          color: colors.text.primary,
          onPress: () => navigation.navigate('TermsOfService'),
        },
        {
          icon: MessageCircle,
          label: 'Suporte',
          description: 'Entre em contato conosco',
          color: colors.text.primary,
          onPress: () => navigation.navigate('Support'),
        },
      ],
    },
    {
      title: 'Conta e Sessão',
      items: [
        {
          icon: LogOut,
          label: 'Encerrar Sessão',
          description: 'Fazer logout da sua conta',
          color: colors.text.primary,
          onPress: handleLogout,
        },
        {
          icon: Trash2,
          label: 'Excluir Conta',
          description: 'Remover permanentemente sua conta',
          color: colors.error.main,
          onPress: () => setShowDeleteAccountModal(true),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Configurações"
        showLogo={true}
        rightIcon={
          <TouchableOpacity
            onPress={() => setShowProfileModal(true)}
            style={{ padding: spacing[1] }}
          >
            <User size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Organization Info */}
        <Card style={styles.orgCard}>
          <View style={styles.orgHeader}>
            <View>
              <Caption color="secondary" weight="medium">Informações da Organização</Caption>
              <Headline weight="bold" style={{ marginTop: spacing[1] }}>
                {organization?.name || 'N/A'}
              </Headline>
            </View>
          </View>
        </Card>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Caption
              color="secondary"
              weight="semiBold"
              style={styles.sectionTitle}
            >
              {section.title}
            </Caption>

            <Card style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder,
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
                  {item.label !== 'Excluir Conta' && item.label !== 'Encerrar Sessão' && (
                    <ChevronRight size={20} color={colors.text.tertiary} />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* App Info Section */}
        <Card style={styles.appInfoCard}>
          <View style={styles.appInfoContent}>
            <Logo size="medium" />
            <View style={styles.appInfoText}>
              <Title2 weight="semiBold" align="center">
                MeuAzulão
              </Title2>
              <Caption color="secondary" align="center" style={styles.appVersion}>
                Versão 1.0.0
              </Caption>
              <Caption color="tertiary" align="center" style={styles.appCopyright}>
                © 2024 MeuAzulão. Todos os direitos reservados.
              </Caption>
            </View>
          </View>
        </Card>

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Modals */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        organization={organization}
        onRefresh={refetch}
      />

      <MemberManagementModal
        visible={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        organization={organization}
        orgUser={user}
      />

      <CategoryManagementModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        organization={organization}
      />

      <NotificationSettingsModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        organization={organization}
        user={user}
      />

      <DeleteAccountModal
        visible={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        loading={isDeletingAccount}
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
  orgCard: {
    marginBottom: spacing[3],
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  appInfoCard: {
    marginTop: spacing[4],
    padding: spacing[4],
  },

  appInfoContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  appInfoText: {
    marginTop: spacing[3],
    alignItems: 'center',
  },

  appVersion: {
    marginTop: spacing[1],
  },

  appCopyright: {
    marginTop: spacing[2],
    fontSize: 11,
  },
});

