/**
 * Belvo Connections Manager
 * Displays and manages Belvo bank connections
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { 
  Link as LinkIcon, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import BelvoWidgetModal from './BelvoWidgetModal';

const STATUS_CONFIG = {
  pending_sync: {
    label: 'Aguardando Sincronização',
    color: 'text-yellow-600 bg-yellow-50',
    icon: Clock
  },
  synced: {
    label: 'Sincronizado',
    color: 'text-green-600 bg-green-50',
    icon: CheckCircle
  },
  expired: {
    label: 'Consentimento Expirado',
    color: 'text-red-600 bg-red-50',
    icon: AlertCircle
  },
  error: {
    label: 'Erro',
    color: 'text-red-600 bg-red-50',
    icon: XCircle
  }
};

export default function BelvoConnectionsManager({ organizationId, userId, onConnectionsChange }) {
  const { success, error: showError, warning } = useNotificationContext();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWidget, setShowWidget] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (organizationId) {
      loadLinks();
    }
  }, [organizationId]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/belvo/links?organizationId=${organizationId}`);
      const data = await response.json();

      if (response.ok) {
        setLinks(data.links || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading Belvo links:', error);
      showError('Erro ao carregar conexões bancárias');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (linkId) => {
    setSyncing(linkId);
    try {
      const response = await fetch(`/api/belvo/links/${linkId}/sync`, {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        success('Sincronização iniciada! Aguarde alguns segundos...');
        // Reload after a delay
        setTimeout(() => {
          loadLinks();
          onConnectionsChange?.();
        }, 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error syncing link:', error);
      showError('Erro ao sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (linkId, institutionName) => {
    if (!confirm(`Deseja desconectar de ${institutionName}? Todas as contas e transações sincronizadas serão desativadas.`)) {
      return;
    }

    setDeleting(linkId);
    try {
      const response = await fetch(`/api/belvo/links/${linkId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        success(`Desconectado de ${institutionName}`);
        loadLinks();
        onConnectionsChange?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      showError('Erro ao desconectar');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleWidgetSuccess = () => {
    loadLinks();
    onConnectionsChange?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-500" />
                Conexões Bancárias (Belvo)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Sincronize automaticamente suas contas e transações
              </p>
            </div>
            <Button
              onClick={() => setShowWidget(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Conectar Banco
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {links.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma conexão bancária
              </h3>
              <p className="text-gray-600 mb-6">
                Conecte sua conta bancária para sincronizar automaticamente suas transações
              </p>
              <Button
                onClick={() => setShowWidget(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Conectar Primeiro Banco
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => {
                const StatusIcon = STATUS_CONFIG[link.status]?.icon || AlertCircle;
                const statusConfig = STATUS_CONFIG[link.status] || STATUS_CONFIG.error;

                return (
                  <div
                    key={link.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">
                            {link.institution_name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color} flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          {link.last_sync_at && (
                            <p>Última sincronização: {formatDate(link.last_sync_at)}</p>
                          )}
                          {link.consent_expiration && (
                            <p>Consentimento expira em: {formatDate(link.consent_expiration)}</p>
                          )}
                          {link.error_message && (
                            <p className="text-red-600">Erro: {link.error_message}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {link.status !== 'error' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(link.id)}
                            disabled={syncing === link.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncing === link.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(link.id, link.institution_name)}
                          disabled={deleting === link.id}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 pt-6 border-t">
                <a
                  href={`https://meuportal.belvo.com/?mode=custom&app_id=${process.env.NEXT_PUBLIC_BELVO_APP_ID || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Gerenciar consentimentos no portal Belvo
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BelvoWidgetModal
        isOpen={showWidget}
        onClose={() => setShowWidget(false)}
        userId={userId}
        organizationId={organizationId}
        onSuccess={handleWidgetSuccess}
      />
    </>
  );
}
