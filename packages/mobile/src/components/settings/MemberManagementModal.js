import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { X, Users, Plus, Trash2, Mail, Calendar } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Callout, Caption } from '../ui/Text';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useConfirmation } from '../ui/ConfirmationProvider';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../contexts/I18nContext';
import { displayContact } from '../financial/contactDisplay';

const { height } = Dimensions.get('window');

export function MemberManagementModal({ visible, onClose, organization, orgUser }) {
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
  });

  useEffect(() => {
    if (visible && organization) {
      fetchData();
    }
  }, [visible, organization]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, phone, role, created_at')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const { data: invitesData, error: invitesError } = await supabase
        .from('pending_invites')
        .select('id, email, name, role, created_at, expires_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      setMembers(usersData || []);
      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      showToast(t('finances.settings.members.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!formData.email.trim() || !formData.name.trim()) {
      showToast(t('finances.settings.members.fillAll'), 'warning');
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase
        .from('pending_invites')
        .insert({
          organization_id: organization.id,
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: formData.role,
        });

      if (error) throw error;

      showToast(t('finances.settings.members.inviteSent'), 'success');
      setFormData({ name: '', email: '', role: 'member' });
      setShowInviteForm(false);
      await fetchData();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showToast(t('finances.settings.members.inviteError', { message: error.message || t('finances.settings.profile.unknownError') }), 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (member.id === orgUser.id) {
      showToast(t('finances.settings.members.cannotRemoveSelf'), 'warning');
      return;
    }

    try {
      await confirm({
        title: t('finances.settings.members.removeTitle'),
        message: t('finances.settings.members.removeMessage', { name: member.name }),
        type: 'danger',
        onConfirm: async () => {
          const { error } = await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', member.id);

          if (error) throw error;

          showToast(t('finances.settings.members.removed'), 'success');
          await fetchData();
        },
      });
    } catch (error) {
      // Usuário cancelou
    }
  };

  const handleCancelInvite = async (invite) => {
    try {
      await confirm({
        title: t('finances.settings.members.cancelInviteTitle'),
        message: t('finances.settings.members.cancelInviteMessage', { email: invite.email }),
        type: 'warning',
        onConfirm: async () => {
          const { error } = await supabase
            .from('pending_invites')
            .delete()
            .eq('id', invite.id);

          if (error) throw error;

          showToast(t('finances.settings.members.inviteCancelled'), 'success');
          await fetchData();
        },
      });
    } catch (error) {
      // Usuário cancelou
    }
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
            <Title2 weight="bold">{t('finances.settings.members.title')}</Title2>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
                <Caption color="secondary">{t('finances.settings.members.loading')}</Caption>
              </View>
            ) : (
              <>
                {/* Invite Form */}
                {showInviteForm ? (
                  <View style={styles.inviteForm}>
                    <Input
                      label={t('finances.settings.members.name')}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder={t('finances.settings.members.namePlaceholder')}
                    />
                    <Input
                      label={t('finances.settings.members.email')}
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder={t('finances.settings.members.emailPlaceholder')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View style={styles.formActions}>
                      <Button
                        title={t('finances.settings.members.cancel')}
                        variant="outline"
                        onPress={() => {
                          setShowInviteForm(false);
                          setFormData({ name: '', email: '', role: 'member' });
                        }}
                        style={{ flex: 1, marginRight: spacing[2] }}
                      />
                      <Button
                        title={inviting ? t('finances.settings.members.sending') : t('finances.settings.members.sendInvite')}
                        onPress={handleInvite}
                        disabled={inviting}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    title={t('finances.settings.members.inviteNew')}
                    onPress={() => setShowInviteForm(true)}
                    icon={<Plus size={20} color={colors.neutral[0]} />}
                    style={{ marginBottom: spacing[3] }}
                  />
                )}

                {/* Members List */}
                <View style={styles.section}>
                  <Caption color="secondary" weight="semiBold" style={{ marginBottom: spacing[2] }}>
                    {t('finances.settings.members.membersCount', { n: members.length })}
                  </Caption>
                  {members.map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <View style={styles.memberInfo}>
                        <Callout weight="medium">{member.name}</Callout>
                        {displayContact(member) ? (
                          <Caption color="secondary">{displayContact(member)}</Caption>
                        ) : null}
                        <Caption color="tertiary" style={{ marginTop: spacing[0.5] }}>
                          {member.role === 'admin' ? t('finances.settings.members.admin') : t('finances.settings.members.member')}
                        </Caption>
                      </View>
                      {member.id !== orgUser.id && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member)}
                          style={styles.removeButton}
                        >
                          <Trash2 size={18} color={colors.error.main} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                  <View style={styles.section}>
                    <Caption color="secondary" weight="semiBold" style={{ marginBottom: spacing[2] }}>
                      {t('finances.settings.members.pendingCount', { n: pendingInvites.length })}
                    </Caption>
                    {pendingInvites.map((invite) => (
                      <View key={invite.id} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <Callout weight="medium">{invite.name || invite.email}</Callout>
                          <Caption color="secondary">{invite.email}</Caption>
                          <Caption color="tertiary" style={{ marginTop: spacing[0.5] }}>
                            {t('finances.settings.members.pending')}
                          </Caption>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleCancelInvite(invite)}
                          style={styles.removeButton}
                        >
                          <X size={18} color={colors.text.secondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
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
    minHeight: height * 0.55,
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
  inviteForm: {
    marginBottom: spacing[3],
  },
  formActions: {
    flexDirection: 'row',
    marginTop: spacing[2],
  },
  section: {
    marginBottom: spacing[3],
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    marginBottom: spacing[1],
  },
  memberInfo: {
    flex: 1,
  },
  removeButton: {
    padding: spacing[1],
  },
});

