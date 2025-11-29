import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Upload, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption, Callout } from '../ui/Text';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { useOrganization } from '../../hooks/useOrganization';
import { supabase } from '../../services/supabase';
import { WhatsAppVerificationModal } from './WhatsAppVerificationModal';

const { height } = Dimensions.get('window');
const AVATAR_BUCKET = 'avatar';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Usar ScrollView nativo no Android para melhor detecção de scroll
const ScrollView = Platform.OS === 'android' ? RNScrollView : GHScrollView;

// Lazy import do ImagePicker para evitar erro se módulo nativo não estiver disponível
let ImagePicker = null;
const getImagePicker = async () => {
  if (!ImagePicker) {
    try {
      // Import dinâmico do módulo
      const module = await import('expo-image-picker');
      // expo-image-picker exporta tudo como named exports, então usamos o módulo diretamente
      ImagePicker = module;
      return ImagePicker;
    } catch (error) {
      console.error('expo-image-picker não disponível:', error);
      return null;
    }
  }
  return ImagePicker;
};

// Paleta de cores disponíveis
const PROFILE_COLORS = [
  '#3B82F6', // Azul primário (padrão)
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316',
  '#14B8A6', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E'
];

export function ProfileModal({ visible, onClose, user, organization, onRefresh }) {
  const { showToast } = useToast();
  const { costCenters, refetch } = useOrganization();
  const insets = useSafeAreaInsets();
  // Safe area apenas no Android
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, spacing[2]) : 0;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: null,
    cost_center_color: '#3B82F6',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Buscar cost center do usuário
  const userCostCenter = costCenters?.find(cc => cc.user_id === user?.id);

  useEffect(() => {
    if (user && visible) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar_url: user.avatar_url || null,
        cost_center_color: userCostCenter?.color || '#3B82F6',
      });
    }
  }, [user, visible, userCostCenter]);

  const ensureBucketExists = async () => {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError && listError.message?.includes('permission denied')) {
        // Bucket existe mas não temos permissão de listar - tudo bem
        return;
      }

      const bucketExists = buckets?.some(b => b.name === AVATAR_BUCKET);
      
      if (!bucketExists) {
        // Tentar criar bucket (pode falhar se não tiver permissão - ok)
        await supabase.storage.createBucket(AVATAR_BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        });
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar/criar bucket:', error);
    }
  };

  const handleImagePicker = async () => {
    try {
      const ImagePickerModule = await getImagePicker();
      if (!ImagePickerModule) {
        showToast('Funcionalidade de imagem não disponível', 'error');
        return;
      }

      // Solicitar permissão
      const { status } = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar suas fotos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Abrir seletor de imagem
      const result = await ImagePickerModule.launchImageLibraryAsync({
        mediaTypes: ImagePickerModule.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      
      // Validar tamanho
      if (asset.fileSize > MAX_FILE_SIZE) {
        showToast('Arquivo muito grande. Máximo 2MB.', 'warning');
        return;
      }

      await handleUploadAvatar(asset.uri);
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast('Erro ao selecionar imagem', 'error');
    }
  };

  const handleUploadAvatar = async (imageUri) => {
    setUploading(true);

    try {
      await ensureBucketExists();

      // Converter URI para blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Gerar nome único
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      // Deletar avatar antigo se existir
      if (user.avatar_url) {
        try {
          const urlParts = user.avatar_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === AVATAR_BUCKET);
          if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(bucketIndex + 1).join('/');
            if (oldPath && oldPath !== filePath) {
              await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([oldPath]);
            }
          }
        } catch (removeError) {
          console.warn('⚠️ Não foi possível remover avatar antigo:', removeError);
        }
      }

      showToast('Avatar atualizado com sucesso!', 'success');
      if (onRefresh) onRefresh();
      if (refetch) refetch();
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      showToast('Erro ao fazer upload: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar_url) return;

    setUploading(true);

    try {
      // Extrair path do avatar antigo do URL
      const urlParts = user.avatar_url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === AVATAR_BUCKET);
      
      if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        
        // Remover do storage
        await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([filePath]);
      }

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: null }));
      showToast('Avatar removido!', 'success');

      if (onRefresh) onRefresh();
      if (refetch) refetch();
    } catch (error) {
      console.error('❌ Erro ao remover avatar:', error);
      showToast('Erro ao remover avatar.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('Nome é obrigatório', 'warning');
      return;
    }

    setSaving(true);

    try {
      // Atualizar nome do usuário
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Atualizar cor do cost center se mudou e se existe cost center
      if (userCostCenter && formData.cost_center_color !== userCostCenter.color) {
        const { error: costCenterError } = await supabase
          .from('cost_centers')
          .update({
            color: formData.cost_center_color
          })
          .eq('id', userCostCenter.id);

        if (costCenterError) {
          console.error('⚠️ Erro ao atualizar cor do cost center:', costCenterError);
          // Não falhar o save se apenas a cor do cost center falhar
        }
      }

      showToast('Perfil atualizado com sucesso!', 'success');
      
      if (onRefresh) onRefresh();
      if (refetch) refetch();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      showToast('Erro ao salvar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={[styles.modal, { marginBottom: safeBottom }]}>
            {/* Header */}
            <View style={styles.header}>
              <Title2 weight="bold">Meu Perfil</Title2>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.contentContainer,
                { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, spacing[4]) : spacing[4] }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
            >
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <Avatar
                  src={formData.avatar_url}
                  name={formData.name || user?.name}
                  size="xl"
                  color={formData.cost_center_color}
                />
                
                <View style={styles.avatarActions}>
                  <Button
                    title={uploading ? 'Enviando...' : 'Alterar Foto'}
                    variant="outline"
                    size="sm"
                    onPress={handleImagePicker}
                    disabled={uploading}
                    icon={<Upload size={16} color={colors.brand.primary} />}
                    style={{ marginBottom: spacing[1] }}
                  />

                  {formData.avatar_url && (
                    <Button
                      title="Remover Foto"
                      variant="ghost"
                      size="sm"
                      onPress={handleRemoveAvatar}
                      disabled={uploading}
                      style={{ marginBottom: spacing[1] }}
                    />
                  )}

                  <Caption color="tertiary" align="center">
                    JPG, PNG ou WebP. Máximo 2MB.
                  </Caption>
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.formFields}>
                <Input
                  label="Nome Completo *"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Seu nome completo"
                />

                <View style={styles.field}>
                  <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                    Email
                  </Caption>
                  <View style={styles.disabledInput}>
                    <Text>{formData.email}</Text>
                  </View>
                  <Caption color="tertiary" style={{ marginTop: spacing[0.5] }}>
                    O email não pode ser alterado
                  </Caption>
                </View>

                {organization && (
                  <View style={styles.field}>
                    <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[1] }}>
                      Organização
                    </Caption>
                    <View style={styles.disabledInput}>
                      <Text>{organization.name}</Text>
                    </View>
                  </View>
                )}

                {userCostCenter && (
                  <View style={styles.field}>
                    <Caption color="secondary" weight="medium" style={{ marginBottom: spacing[2] }}>
                      Cor do Perfil
                    </Caption>
                    <View style={styles.colorPicker}>
                      {PROFILE_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            {
                              backgroundColor: color,
                              borderWidth: formData.cost_center_color === color ? 3 : 1,
                              borderColor: formData.cost_center_color === color ? colors.text.primary : colors.border.light,
                              transform: formData.cost_center_color === color ? [{ scale: 1.1 }] : [{ scale: 1 }],
                            },
                          ]}
                          onPress={() => setFormData(prev => ({ ...prev, cost_center_color: color }))}
                        />
                      ))}
                    </View>
                    <Caption color="tertiary" style={{ marginTop: spacing[1] }}>
                      Esta cor será usada para identificar você em gráficos e análises
                    </Caption>
                  </View>
                )}

                {/* WhatsApp Section */}
                <View style={styles.whatsappSection}>
                  <View style={styles.whatsappHeader}>
                    <View style={styles.whatsappHeaderLeft}>
                      <MessageCircle
                        size={20}
                        color={user?.phone_verified ? colors.success.main : colors.text.tertiary}
                      />
                      <Caption weight="medium" style={{ marginLeft: spacing[1] }}>
                        WhatsApp
                        {user?.phone_verified && (
                          <View style={styles.verifiedBadge}>
                            <CheckCircle2 size={12} color={colors.success.main} />
                            <Caption style={{ color: colors.success.main, marginLeft: spacing[0.5] }}>
                              Verificado
                            </Caption>
                          </View>
                        )}
                      </Caption>
                    </View>
                    <Button
                      title={user?.phone_verified ? 'Alterar' : 'Verificar'}
                      size="sm"
                      onPress={() => setShowWhatsAppModal(true)}
                      style={{
                        backgroundColor: user?.phone_verified ? colors.success.main : colors.brand.primary,
                      }}
                    />
                  </View>
                  {user?.phone_verified && user?.phone ? (
                    <Caption color="secondary" style={{ marginTop: spacing[1] }}>
                      Número verificado: {user.phone.replace('55', '')}
                    </Caption>
                  ) : (
                    <Caption color="tertiary" style={{ marginTop: spacing[1] }}>
                      Configure seu número para usar o Zul
                    </Caption>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={onClose}
                disabled={saving}
                style={{ flex: 1, marginRight: spacing[2] }}
              />
              <Button
                title={saving ? 'Salvando...' : 'Salvar'}
                onPress={handleSave}
                disabled={saving || !formData.name.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Verification Modal */}
      <WhatsAppVerificationModal
        visible={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        user={user}
        onVerified={() => {
          if (onRefresh) onRefresh();
          if (refetch) refetch();
          setShowWhatsAppModal(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    width: '100%',
    maxHeight: height * 0.95,
    minHeight: height * 0.75,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexShrink: 0,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[3],
    paddingBottom: spacing[4],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatarActions: {
    alignItems: 'center',
    marginTop: spacing[2],
  },
  formFields: {
    gap: spacing[3],
  },
  field: {
    marginTop: spacing[2],
  },
  disabledInput: {
    padding: spacing[2],
    backgroundColor: colors.neutral[100],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  whatsappSection: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  whatsappHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  whatsappHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
