import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Users, Mail, Calendar, Trash2, X, Plus, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotificationContext } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';

export default function UserManagementModal({ isOpen, onClose, organization }) {
  const { success, showError } = useNotificationContext();
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');

  useEffect(() => {
    if (isOpen && organization) {
      fetchMembers();
    }
  }, [isOpen, organization]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Buscar membros ativos da organização (tabela users)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar convites pendentes
      const { data: invitesData, error: invitesError } = await supabase
        .from('pending_invites')
        .select('id, email, name, role, created_at, expires_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      setMembers(usersData || []);
      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const sendInvite = async () => {
    if (!validateEmail(email)) {
      showError('Por favor, insira um email válido');
      return;
    }

    if (!name.trim()) {
      showError('Por favor, insira o nome da pessoa');
      return;
    }

    setInviting(true);

    try {
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          name: name.trim(),
          role: role,
          organizationId: organization.id,
          invitedBy: organization.currentUser?.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        success('Convite enviado com sucesso!');
        setEmail('');
        setName('');
        setRole('member');
        setShowInviteForm(false);
        await fetchMembers(); // Recarregar listas
      } else {
        showError(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      showError('Erro ao enviar convite. Tente novamente.');
    } finally {
      setInviting(false);
    }
  };

  const removeUser = (userId) => {
    setActionToConfirm('removeUser');
    setItemToDelete(userId);
    setShowConfirmModal(true);
  };

  const confirmRemoveUser = async () => {
    if (!itemToDelete) return;

    try {
      // Remover organization_id do usuário (desvincula da org)
      const { error } = await supabase
        .from('users')
        .update({ organization_id: null })
        .eq('id', itemToDelete);

      if (error) throw error;

      await fetchMembers();
      success('Usuário removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      showError('Erro ao remover usuário: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setActionToConfirm(null);
      setItemToDelete(null);
    }
  };

  const deletePendingInvite = (inviteId) => {
    setActionToConfirm('deleteInvite');
    setItemToDelete(inviteId);
    setShowConfirmModal(true);
  };

  const confirmDeleteInvite = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;

      await fetchMembers();
      success('Convite cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      showError('Erro ao cancelar convite: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setActionToConfirm(null);
      setItemToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Membro';
      case 'viewer':
        return 'Visualizador';
      default:
        return role;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">Gerenciar Usuários</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">

            {/* Invite Form */}
            {showInviteForm && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Convidar Novo Membro</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    placeholder="usuario@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nível de Acesso
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('viewer')}
                      className={`px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                        role === 'viewer'
                          ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Visualizador
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={`px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                        role === 'member'
                          ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Membro
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                        role === 'admin'
                          ? 'border-[#207DFF] bg-[#207DFF]/5 text-[#207DFF]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {role === 'viewer' && 'Apenas visualiza despesas e relatórios'}
                    {role === 'member' && 'Pode criar despesas e gerenciar seu centro de custo'}
                    {role === 'admin' && 'Acesso total: gerenciar usuários, configurações e despesas'}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setShowInviteForm(false);
                      setEmail('');
                      setName('');
                      setRole('member');
                      setMessage({ type: '', text: '' });
                    }}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={sendInvite}
                    disabled={inviting}
                    className="bg-flight-blue hover:bg-flight-blue/90 text-white"
                  >
                    {inviting ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </div>
              </div>
            )}

            {/* Invite Button */}
            {!showInviteForm && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar Novo Membro
                </Button>
              </div>
            )}

            {/* Members List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Membros Ativos ({members.length})</h3>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum membro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-flight-blue/30 transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.name || 'Sem nome'}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Entrou em {formatDate(member.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge className={`${getRoleBadgeColor(member.role)} border-0`}>
                          {getRoleLabel(member.role)}
                        </Badge>
                        
                        {member.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUser(member.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Convites Pendentes ({pendingInvites.length})</h3>
                <div className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50/30 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {invite.name?.charAt(0)?.toUpperCase() || invite.email?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {invite.name || 'Sem nome'}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{invite.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Convidado em {formatDate(invite.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Badge className={`${getRoleBadgeColor(invite.role)} border-0`}>
                          {getRoleLabel(invite.role)}
                        </Badge>
                        <Badge className="bg-orange-100 text-orange-800 border-0">
                          Pendente
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePendingInvite(invite.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
        
        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setActionToConfirm(null);
          setItemToDelete(null);
        }}
        onConfirm={actionToConfirm === 'removeUser' ? confirmRemoveUser : confirmDeleteInvite}
        title={actionToConfirm === 'removeUser' ? "Confirmar remoção" : "Confirmar cancelamento"}
        message={
          actionToConfirm === 'removeUser' 
            ? "Tem certeza que deseja remover este usuário da organização? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja cancelar este convite? Esta ação não pode ser desfeita."
        }
        confirmText={actionToConfirm === 'removeUser' ? "Remover" : "Cancelar"}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
