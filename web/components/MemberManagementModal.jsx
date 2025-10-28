import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Users, X, Plus, Trash2, Mail, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotificationContext } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';
import HelpTooltip from './ui/HelpTooltip';

export default function MemberManagementModal({ isOpen, onClose, organization, orgUser }) {
  const { success, showError, warning } = useNotificationContext();
  
  // Estados principais
  const [members, setMembers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do formulário de convite
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
    splitPercentage: 50,
    color: '#6366F1'
  });
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [editablePercentages, setEditablePercentages] = useState({});
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [stillShowsError, setStillShowsError] = useState(false);

  // Zerar split percentage quando role é viewer
  useEffect(() => {
    if (showInviteForm && formData.role === 'viewer') {
      setFormData(prev => ({ ...prev, splitPercentage: 0 }));
    } else if (showInviteForm && formData.role !== 'viewer' && formData.splitPercentage === 0) {
      // Se mudou de viewer para member/admin, restaurar 50%
      setFormData(prev => ({ ...prev, splitPercentage: 50 }));
    }
  }, [formData.role, showInviteForm]);

  // Verificar email com debounce
  useEffect(() => {
    if (!showInviteForm || !formData.email) {
      setEmailError('');
      return;
    }

    const timeoutId = setTimeout(() => {
      checkEmail(formData.email);
    }, 800); // Debounce de 800ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.email, showInviteForm]);

  // Recalcular total quando percentuais mudam
  useEffect(() => {
    if (!showInviteForm) {
      setCalculatedTotal(0);
      setStillShowsError(false);
      return;
    }

    const currentTotal = costCenters.reduce((sum, cc) => {
      const value = editablePercentages[cc.id] !== undefined ? editablePercentages[cc.id] : cc.default_split_percentage;
      return sum + (parseFloat(value) || 0);
    }, 0);
    const newTotal = currentTotal + parseFloat(formData.splitPercentage || 0);
    
    setCalculatedTotal(newTotal);
    // Mostrar modal de rebalanceamento se o total não for exatamente 100% (exceto viewer)
    setStillShowsError(Math.abs(newTotal - 100) > 0.01 && formData.role !== 'viewer');
  }, [editablePercentages, formData.splitPercentage, showInviteForm, costCenters]);
  
  // Estados de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316'
  ];

  useEffect(() => {
    if (isOpen && organization) {
      fetchData();
    }
  }, [isOpen, organization]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar membros ativos
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Buscar cost centers
      const { data: costCentersData, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('id, name, user_id, default_split_percentage, color, is_active')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (costCentersError) throw costCentersError;

      // Buscar convites pendentes
      const { data: invitesData, error: invitesError } = await supabase
        .from('pending_invites')
        .select('id, email, name, role, created_at, expires_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      setMembers(usersData || []);
      setCostCenters(costCentersData || []);
      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      showError('Erro ao carregar dados da organização');
    } finally {
      setLoading(false);
    }
  };

  // Calcular total de split atual
  const getCurrentSplitTotal = () => {
    return costCenters
      .filter(cc => formData.email ? true : true) // Considerar todos
      .reduce((sum, cc) => sum + (parseFloat(cc.default_split_percentage) || 0), 0);
  };

  // Verificar se o split total passou de 100%
  const getSplitValidation = () => {
    // Se for viewer, não precisa validar split (já é 0%)
    if (formData.role === 'viewer') {
      return {
        currentTotal: 0,
        newTotal: 0,
        exceeds100: false,
        diffFrom100: 100,
        canAutoRebalance: false,
        newSplit: 0
      };
    }
    
    const currentTotal = getCurrentSplitTotal();
    const newSplit = parseFloat(formData.splitPercentage) || 0;
    const newTotal = currentTotal + newSplit;
    const exceeds100 = newTotal > 100;
    const diffFrom100 = 100 - currentTotal;
    
    return {
      currentTotal,
      newTotal,
      exceeds100,
      diffFrom100,
      canAutoRebalance: diffFrom100 >= 0,
      newSplit
    };
  };

  // Função para rebalancear todos os cost centers proporcionalmente
  const handleAutoRebalance = () => {
    const validation = getSplitValidation();
    
    if (!validation.canAutoRebalance) return;
    
    // Se o total + novo split = 100%, não precisa rebalancear
    if (validation.newTotal === 100) return;
    
    // Calcular o que restará para distribuir
    const remaining = 100 - parseFloat(formData.splitPercentage);
    
    // Redistribuir proporcionalmente entre os cost centers existentes
    const newCostCenters = costCenters.map(cc => ({
      ...cc,
      default_split_percentage: ((cc.default_split_percentage / validation.currentTotal) * remaining).toFixed(2)
    }));
    
    // Atualizar cost centers no banco
    newCostCenters.forEach(async (cc) => {
      await supabase
        .from('cost_centers')
        .update({ default_split_percentage: parseFloat(cc.default_split_percentage) })
        .eq('id', cc.id);
    });
    
    success('Responsáveis rebalanceados automaticamente!');
  };

  const sendInvite = async () => {
    if (!formData.email.trim()) {
      warning('Email é obrigatório');
      return;
    }
    
    if (!formData.name.trim()) {
      warning('Nome é obrigatório');
      return;
    }

    // Validar se temos orgUser.id
    if (!orgUser?.id) {
      showError('Erro: usuário não identificado. Por favor, recarregue a página.');
      return;
    }

    // Validar se o total é exatamente 100% (exceto viewer que não precisa)
    if (formData.role !== 'viewer' && Math.abs(calculatedTotal - 100) > 0.01) {
      if (calculatedTotal > 100) {
        warning(`A soma dos percentuais ultrapassa 100% (${calculatedTotal.toFixed(1)}%). Ajuste os valores para totalizar exatamente 100%.`);
      } else {
        warning(`A soma dos percentuais está abaixo de 100% (${calculatedTotal.toFixed(1)}%). Ajuste os valores para totalizar exatamente 100%.`);
      }
      return;
    }

    try {
      setInviting(true);
      
      console.log('📤 Enviando convite com dados:', {
        organizationId: organization?.id,
        email: formData.email.trim(),
        name: formData.name.trim(),
        invitedBy: orgUser?.id,
        role: formData.role,
        splitPercentage: formData.splitPercentage,
        color: formData.color
      });
      
      // Enviar convite via API
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          email: formData.email.trim(),
          name: formData.name.trim(),
          invitedBy: orgUser.id,
          role: formData.role,
          splitPercentage: formData.splitPercentage,
          color: formData.color
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Mostrar erro mais detalhado se disponível
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}${data.hint ? ` (${data.hint})` : ''}`
          : data.error || 'Erro ao enviar convite';
        throw new Error(errorMessage);
      }

      // Atualizar cost centers existentes se o usuário editou os percentuais
      if (Object.keys(editablePercentages).length > 0) {
        const updates = Object.entries(editablePercentages).map(([id, percentage]) => ({
          id,
          default_split_percentage: parseFloat(percentage)
        }));

        for (const update of updates) {
          await supabase
            .from('cost_centers')
            .update({ default_split_percentage: update.default_split_percentage })
            .eq('id', update.id);
        }
      }

      success('Convite enviado com sucesso! O cost center será criado quando o usuário aceitar.');
      
      // Resetar form
      setFormData({
        name: '',
        email: '',
        role: 'member',
        splitPercentage: 50,
        color: '#6366F1'
      });
      setEditablePercentages({});
      setShowInviteForm(false);
      
      // Recarregar dados
      fetchData();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showError(error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (userId) => {
    setActionToConfirm('remove-member');
    setItemToDelete({ id: userId });
    setShowConfirmModal(true);
  };

  const confirmRemoveMember = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', itemToDelete.id);

      if (error) throw error;

      success('Usuário removido com sucesso');
      fetchData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      showError('Erro ao remover membro');
    } finally {
      setShowConfirmModal(false);
      setActionToConfirm(null);
      setItemToDelete(null);
    }
  };

  const handleCancelInvite = (inviteId) => {
    setActionToConfirm('cancel-invite');
    setItemToDelete({ id: inviteId });
    setShowConfirmModal(true);
  };

  const confirmCancelInvite = async () => {
    try {
      const { error } = await supabase
        .from('pending_invites')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      success('Convite cancelado com sucesso');
      fetchData();
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      showError('Erro ao cancelar convite');
    } finally {
      setShowConfirmModal(false);
      setActionToConfirm(null);
      setItemToDelete(null);
    }
  };

  const handleConfirm = () => {
    if (actionToConfirm === 'remove-member') {
      confirmRemoveMember();
    } else if (actionToConfirm === 'cancel-invite') {
      confirmCancelInvite();
    }
  };

  // Verificar email em tempo real
  const checkEmail = useCallback(async (email) => {
    if (!email || email.length < 5) {
      setEmailError('');
      return;
    }

    try {
      setCheckingEmail(true);
      const response = await fetch('/api/auth/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (data.checks?.email?.exists) {
        const existingUser = data.checks.email.user;
        
        // Verificar se é da mesma organização
        if (existingUser?.organization_id === organization?.id) {
          setEmailError('Este email já é membro desta organização');
        } else {
          setEmailError('Este email já está cadastrado em outra organização');
        }
      } else if (data.checks?.organizationEmail?.exists) {
        setEmailError('Este email já é usado como email da organização');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      setEmailError('');
    } finally {
      setCheckingEmail(false);
    }
  }, [organization?.id]);

  const getCostCenterForUser = (userId) => {
    return costCenters.find(cc => cc.user_id === userId);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
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

  if (!isOpen) return null;

  const validation = getSplitValidation();

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
          {/* Header */}
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
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-[#207DFF]/30 border-t-[#207DFF] rounded-full animate-spin"></div>
              </div>
            ) : !showInviteForm ? (
              <>
                {/* Lista de Usuários Ativos */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-gray-900">Usuários Ativos ({members.length})</h3>
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum usuário cadastrado ainda</p>
                    </div>
                  ) : (
                    members.map((member) => {
                      const costCenter = getCostCenterForUser(member.id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{ backgroundColor: costCenter?.color || '#6366F1' }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={getRoleBadgeColor(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                            {costCenter && (
                              <span className="text-sm font-medium text-gray-700">
                                {costCenter.default_split_percentage}%
                              </span>
                            )}
                            {orgUser?.role === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Convites Pendentes */}
                {pendingInvites.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h3 className="font-semibold text-gray-900">Convites Pendentes ({pendingInvites.length})</h3>
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-yellow-600" />
                          <div>
                            <div className="font-medium text-gray-900">{invite.name || invite.email}</div>
                            <div className="text-sm text-gray-500">{invite.email}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Formulário de Convite */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Convidar Novo Usuário</h3>
                  
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Convidado
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: João Silva"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#207DFF]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        emailError 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-[#207DFF]'
                      }`}
                    />
                    {emailError && (
                      <p className="text-sm text-red-600 mt-1">{emailError}</p>
                    )}
                    {checkingEmail && !emailError && (
                      <p className="text-sm text-gray-500 mt-1">Verificando email...</p>
                    )}
                  </div>

                    {/* Role e Split Percentage lado a lado */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                          <span>Função</span>
                          <HelpTooltip 
                            content={
                              <div>
                                <div><strong>Membro:</strong> Pode criar e editar transações.</div>
                                <div><strong>Visualizador:</strong> Apenas visualiza dados.</div>
                                <div><strong>Admin:</strong> Controle total da organização.</div>
                              </div>
                            } 
                          />
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            // Se viewer, zerar split percentage
                            if (newRole === 'viewer') {
                              setFormData({ ...formData, role: newRole, splitPercentage: 0 });
                            } else {
                              setFormData({ ...formData, role: newRole });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#207DFF]"
                        >
                          <option value="member">Membro</option>
                          <option value="viewer">Visualizador</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {/* Split Percentage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-2">
                          <span>Percentual Padrão (%)</span>
                          <HelpTooltip 
                            wide={true}
                            position="left"
                            content="Este é o percentual que será aplicado automaticamente quando este membro criar transações compartilhadas (despesas ou receitas). Por exemplo, 50% significa que 50% do valor será atribuído a este membro e 50% aos outros." 
                          />
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formData.splitPercentage}
                          onChange={(e) => setFormData({ ...formData, splitPercentage: e.target.value })}
                          disabled={formData.role === 'viewer'}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#207DFF] ${
                            formData.role === 'viewer' ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                        />
                        {formData.role === 'viewer' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Visualizadores não recebem percentual
                          </p>
                        )}
                      </div>
                    </div>

                  {/* Alerta de Split */}
                  {stillShowsError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 mb-2">
                            {calculatedTotal > 100 
                              ? `A soma dos percentuais ultrapassa 100% (${calculatedTotal.toFixed(1)}%).`
                              : `A soma dos percentuais está abaixo de 100% (${calculatedTotal.toFixed(1)}%).`
                            }
                          </p>
                          <p className="text-sm text-red-700">
                            Ajuste os percentuais abaixo para totalizar exatamente 100%:
                          </p>
                        </div>
                      </div>
                      
                      {/* Lista editável de percentuais existentes */}
                      <div className="space-y-2">
                        {costCenters.map((cc) => {
                          const costCenterMember = members.find(m => m.id === cc.user_id);
                          const value = editablePercentages[cc.id] !== undefined 
                            ? editablePercentages[cc.id] 
                            : cc.default_split_percentage;
                          
                          return (
                            <div key={cc.id} className="flex items-center justify-between bg-white rounded border border-red-200 p-2">
                              <span className="text-sm font-medium text-gray-700">
                                {costCenterMember?.name || cc.name}
                              </span>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={value}
                                  onChange={(e) => setEditablePercentages({
                                    ...editablePercentages,
                                    [cc.id]: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#207DFF]"
                                />
                                <span className="text-sm text-gray-600">%</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total (inclui novo membro no cálculo) */}
                        <div className="flex items-center justify-between pt-2 border-t border-red-200">
                          <span className="text-sm font-semibold text-gray-900">
                            Total (incluindo novo membro)
                          </span>
                          <span className={`text-sm font-semibold ${
                            Math.abs(calculatedTotal - 100) <= 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {calculatedTotal.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                      <span>Cor do Perfil</span>
                      <HelpTooltip content="Esta cor será usada para identificar este membro em gráficos, cards e análises visuais da organização." />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full transition-all ${
                            formData.color === color ? 'ring-2 ring-gray-400 scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer com botões */}
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            {!showInviteForm ? (
              <Button
                onClick={() => setShowInviteForm(true)}
                className="bg-[#207DFF] hover:bg-[#207DFF]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Convidar Novo Usuário
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setShowInviteForm(false);
                    setFormData({
                      name: '',
                      email: '',
                      role: 'member',
                      splitPercentage: 50,
                      color: '#6366F1'
                    });
                    setEditablePercentages({});
                  }}
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={sendInvite}
                  disabled={
                    inviting || 
                    !!emailError || 
                    (formData.role !== 'viewer' && Math.abs(calculatedTotal - 100) > 0.01)
                  }
                  className="bg-[#207DFF] hover:bg-[#207DFF]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setActionToConfirm(null);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirm}
        title="Confirmar ação"
        message={
          actionToConfirm === 'remove-member'
            ? 'Tem certeza que deseja remover este membro?'
            : actionToConfirm === 'cancel-invite'
            ? 'Tem certeza que deseja cancelar este convite?'
            : ''
        }
      />
    </>
  );
}
