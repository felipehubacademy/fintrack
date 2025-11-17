/**
 * Belvo Widget Modal
 * Displays Belvo widget for bank connection
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function BelvoWidgetModal({ 
  isOpen, 
  onClose, 
  userId, 
  organizationId,
  onSuccess 
}) {
  const { success: showSuccess, error: showError } = useNotificationContext();
  const [loading, setLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [linkCreated, setLinkCreated] = useState(false);
  const [polling, setPolling] = useState(false);
  const [linkId, setLinkId] = useState(null);

  useEffect(() => {
    if (isOpen && !widgetUrl) {
      initializeWidget();
    }
    
    // Cleanup on close
    return () => {
      if (!isOpen) {
        setWidgetUrl(null);
        setAccessToken(null);
        setLinkCreated(false);
        setPolling(false);
        setLinkId(null);
      }
    };
  }, [isOpen]);

  const initializeWidget = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/belvo/widget-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          externalId: userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create widget session');
      }

      setAccessToken(data.access_token);
      setWidgetUrl(data.widget_url);
    } catch (error) {
      console.error('Error initializing Belvo widget:', error);
      showError('Erro ao inicializar conexão bancária');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Listen for widget events
  useEffect(() => {
    if (!isOpen || !widgetUrl) return;

    const handleMessage = async (event) => {
      // Belvo widget posts messages
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'success' || event.data.event === 'success') {
          const belvoLinkId = event.data.link_id || event.data.linkId;
          const institution = event.data.institution || event.data.institution_name || 'Banco';
          
          if (belvoLinkId) {
            await handleLinkSuccess(belvoLinkId, institution);
          }
        } else if (event.data.type === 'exit' || event.data.event === 'exit') {
          onClose();
        } else if (event.data.type === 'error' || event.data.event === 'error') {
          showError('Erro ao conectar com o banco. Tente novamente.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, widgetUrl]);

  const handleLinkSuccess = async (belvoLinkId, institutionName) => {
    try {
      // Create belvo_link record in database
      const response = await fetch('/api/belvo/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          linkId: belvoLinkId,
          institutionName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link');
      }

      setLinkId(data.link.id);
      setLinkCreated(true);
      showSuccess(`Conectado com ${institutionName}! Sincronizando dados...`);
      
      // Start polling for sync completion
      startPolling(data.link.id);
    } catch (error) {
      console.error('Error creating link:', error);
      showError('Erro ao salvar conexão bancária');
    }
  };

  const startPolling = (linkRecordId) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes (5s * 24)

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/belvo/links/${linkRecordId}`);
        const data = await response.json();

        if (data.link.status === 'synced') {
          clearInterval(pollInterval);
          setPolling(false);
          showSuccess('Sincronização concluída! Suas contas estão prontas.');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1500);
        } else if (data.link.status === 'error') {
          clearInterval(pollInterval);
          setPolling(false);
          showError('Erro na sincronização. Tente novamente.');
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setPolling(false);
          showError('Sincronização está demorando mais que o esperado. Verifique novamente em alguns minutos.');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">
              {linkCreated ? '🔄 Sincronizando...' : '🏦 Conectar Banco'}
            </CardTitle>
            <button
              onClick={onClose}
              disabled={loading || polling}
              className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600">Preparando conexão segura...</p>
            </div>
          )}

          {!loading && !linkCreated && widgetUrl && (
            <div className="relative w-full" style={{ height: '600px' }}>
              <iframe
                src={widgetUrl}
                className="w-full h-full border-0"
                title="Belvo Widget"
                allow="camera; microphone"
              />
            </div>
          )}

          {linkCreated && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              {polling ? (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-6" />
                  <h3 className="text-xl font-semibold mb-2">Sincronizando seus dados...</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Estamos buscando suas contas e transações dos últimos 12 meses.
                    <br />
                    Isso pode levar até 1 minuto.
                  </p>
                  <div className="mt-6 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Conexão estabelecida</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sincronizando contas e transações...</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
                  <h3 className="text-xl font-semibold mb-2">Conexão concluída!</h3>
                  <p className="text-gray-600 text-center">
                    Suas contas foram sincronizadas com sucesso.
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>

        {!loading && !linkCreated && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Conexão segura via Belvo</p>
                <p className="text-xs">
                  Suas credenciais bancárias são criptografadas e processadas diretamente pelo banco.
                  O FinTrack não tem acesso às suas senhas.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
