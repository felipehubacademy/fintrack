import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Upload, Camera, User, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import Avatar from './Avatar';
import WhatsAppVerificationModal from './WhatsAppVerificationModal';

const AVATAR_BUCKET = 'avatar';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ProfileModal({ isOpen, onClose }) {
  const { user: orgUser, organization, refreshData, costCenters } = useOrganization();
  const { success, error: showError } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: null,
    cost_center_color: '#3B82F6'
  });
  const fileInputRef = useRef(null);
  
  // Paleta de cores disponíveis
  const colors = [
    '#3B82F6', // Azul primário (padrão)
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316',
    '#14B8A6', '#F43F5E', '#0EA5E9', '#A855F7', '#22C55E'
  ];
  
  // Buscar cost center do usuário
  const userCostCenter = costCenters?.find(cc => cc.user_id === orgUser?.id);

  useEffect(() => {
    if (isOpen && orgUser) {
      setFormData({
        name: orgUser.name || '',
        email: orgUser.email || '',
        avatar_url: orgUser.avatar_url || null,
        cost_center_color: userCostCenter?.color || '#3B82F6'
      });
    }
  }, [isOpen, orgUser, userCostCenter]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      showError('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploading(true);

    try {
      // Verificar/criar bucket
      await ensureBucketExists();

      // Gerar nome único - usar nome simples na raiz do bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${orgUser.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Permitir sobrescrever se já existir
          contentType: file.type
        });

      if (uploadError) {
        console.error('❌ Erro detalhado do upload:', {
          error: uploadError,
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          filePath,
          bucket: AVATAR_BUCKET
        });
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
        .eq('id', orgUser.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      // Deletar avatar antigo se existir
      if (orgUser.avatar_url) {
        try {
          // Extrair path do URL - pode ser na raiz ou em pasta
          const urlParts = orgUser.avatar_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === AVATAR_BUCKET);
          if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
            const oldPath = urlParts.slice(bucketIndex + 1).join('/');
            if (oldPath && oldPath !== filePath) {
              // Tentar remover - não falhar se já não existir
              await supabase.storage
                .from(AVATAR_BUCKET)
                .remove([oldPath]);
            }
          }
        } catch (removeError) {
          // Não falhar se não conseguir remover o avatar antigo
          console.warn('⚠️ Não foi possível remover avatar antigo:', removeError);
        }
      }

      success('Avatar atualizado com sucesso!');
      
      // Refetch user data
      if (refreshData) refreshData();
    } catch (error) {
      console.error('❌ Erro ao fazer upload:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      
      // Mensagens mais específicas baseadas no erro
      if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        showError('Erro de permissão. Verifique se as políticas RLS do bucket estão configuradas.');
      } else if (errorMessage.includes('bucket')) {
        showError('Bucket não encontrado. Verifique se o bucket "avatar" foi criado.');
      } else {
        showError(`Erro ao fazer upload: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const ensureBucketExists = async () => {
    // Verificar se bucket existe
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
        allowedMimeTypes: ALLOWED_TYPES
      });
    }
  };

  const handleRemoveAvatar = async () => {
    if (!orgUser?.avatar_url) return;

    setUploading(true);

    try {
      // Extrair path do avatar antigo do URL
      const urlParts = orgUser.avatar_url.split('/');
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
        .eq('id', orgUser.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: null }));
      success('Avatar removido!');

      if (refreshData) refreshData();
    } catch (error) {
      console.error('❌ Erro ao remover avatar:', error);
      showError('Erro ao remover avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Nome é obrigatório');
      return;
    }

    setLoading(true);

    try {
      // Atualizar nome do usuário
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name.trim()
        })
        .eq('id', orgUser.id);

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

      success('Perfil atualizado com sucesso!');
      
      if (refreshData) refreshData();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      showError('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-flight-blue/20 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">Meu Perfil</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar 
                src={formData.avatar_url} 
                name={formData.name || orgUser?.name} 
                size="xl"
                color={formData.cost_center_color}
              />
              
              <div className="flex flex-col items-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? 'Enviando...' : 'Alterar Foto'}</span>
                </Button>

                {formData.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remover Foto
                  </Button>
                )}

                <p className="text-xs text-gray-500 text-center max-w-xs">
                  JPG, PNG ou WebP. Máximo 2MB.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  O email não pode ser alterado
                </p>
              </div>

              {organization && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organização
                  </label>
                  <input
                    type="text"
                    value={organization.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              )}

              {userCostCenter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor do Perfil
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, cost_center_color: c }))}
                        className={`w-10 h-10 rounded-full transition-all ${
                          formData.cost_center_color === c 
                            ? 'ring-2 ring-gray-800 ring-offset-2 scale-110' 
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                        title={`Cor ${c}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta cor será usada para identificar você em gráficos e análises
                  </p>
                </div>
              )}

              {/* WhatsApp Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className={`h-5 w-5 ${orgUser?.phone_verified ? 'text-green-600' : 'text-gray-400'}`} />
                    <label className="block text-sm font-medium text-gray-700">
                      WhatsApp
                      {orgUser?.phone_verified && (
                        <span className="ml-2 text-xs text-green-600 font-normal flex items-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verificado
                        </span>
                      )}
                    </label>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowWhatsAppModal(true)}
                    size="sm"
                    className={orgUser?.phone_verified 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-flight-blue hover:bg-flight-blue/90 text-white'
                    }
                  >
                    {orgUser?.phone_verified ? 'Alterar' : 'Verificar'}
                  </Button>
                </div>
                {orgUser?.phone_verified && orgUser?.phone ? (
                  <p className="text-sm text-gray-600">
                    Número verificado: {orgUser.phone.replace('55', '')}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Configure seu número para usar o Zul
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* WhatsApp Verification Modal */}
      <WhatsAppVerificationModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        user={orgUser}
        onVerified={() => {
          if (refreshData) refreshData();
          setShowWhatsAppModal(false);
        }}
      />
    </div>
  );
}

