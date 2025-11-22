import { useState, useEffect } from 'react';
import { X, Link2, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import LoadingLogo from './LoadingLogo';
import ConfirmationModal from './ConfirmationModal';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function OpenFinanceManagementModal({ 
  isOpen, 
  onClose, 
  organization,
  onRefresh
}) {
  const { success, error: showError } = useNotificationContext();
  const [belvoLinks, setBelvoLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingLinkId, setDisconnectingLinkId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  useEffect(() => {
    if (isOpen && organization) {
      fetchBelvoLinks();
    }
  }, [isOpen, organization]);

  const fetchBelvoLinks = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/belvo/links/index?organization_id=${organization.id}`);
      const data = await response.json();

      if (data.success && data.links) {
        // Group accounts by link_id
        const linksMap = {};
        data.links.forEach(link => {
          if (!linksMap[link.link_id]) {
            linksMap[link.link_id] = {
              ...link,
              accountCount: 0,
              cardCount: 0
            };
          }
          if (link.account_type) {
            linksMap[link.link_id].accountCount++;
          }
          if (link.card_type) {
            linksMap[link.link_id].cardCount++;
          }
        });

        setBelvoLinks(Object.values(linksMap));
      }
    } catch (error) {
      console.error('Error fetching Belvo links:', error);
      showError('Erro ao carregar conexões Open Finance');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectBank = async (link) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desconectar banco inteiro',
      message: `Deseja desconectar ${link.institution_name}?\n\nEsta ação irá:\n• Revogar o acesso aos dados bancários\n• Desativar TODAS as contas e cartões deste banco (${link.accountCount + link.cardCount} no total)\n• Parar a sincronização automática\n\nEsta ação não pode ser desfeita.`,
      type: 'danger',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        setDisconnectingLinkId(link.link_id);

        try {
          const response = await fetch(`/api/belvo/links/${link.link_id}?organization_id=${organization.id}`, {
            method: 'DELETE'
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Erro ao desconectar');
          }

          success('Banco desconectado com sucesso!');
          await fetchBelvoLinks();
          onRefresh?.();
        } catch (error) {
          console.error('Erro ao desconectar:', error);
          showError('Erro ao desconectar o banco. Tente novamente.');
        } finally {
          setDisconnectingLinkId(null);
        }
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
                Gerenciar Open Finance
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Gerencie suas conexões bancárias via Open Finance
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingLogo className="h-12 w-12" />
              </div>
            ) : belvoLinks.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma conexão Open Finance
                </h3>
                <p className="text-gray-600 mb-6">
                  Conecte suas contas bancárias em "Contas Bancárias" ou "Cartões"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {belvoLinks.map((link) => (
                  <Card key={link.link_id} className="border border-flight-blue/20 bg-white shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-flight-blue/10 flex items-center justify-center flex-shrink-0">
                            <Link2 className="w-5 h-5 text-flight-blue" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {link.institution_name || 'Instituição'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              {link.accountCount} {link.accountCount === 1 ? 'conta' : 'contas'} • {' '}
                              {link.cardCount} {link.cardCount === 1 ? 'cartão' : 'cartões'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Sincronizado: {new Date(link.last_sync_at || link.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            {link.status === 'expired' && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                <span>Consentimento expirado</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnectBank(link)}
                            disabled={disconnectingLinkId === link.link_id}
                            className="text-red-600 border-red-200 hover:bg-red-50 min-w-[120px]"
                          >
                            {disconnectingLinkId === link.link_id ? (
                              <LoadingLogo className="h-4 w-4 mr-2" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 min-h-[44px]"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />
    </>
  );
}

