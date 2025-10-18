import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  LogOut, 
  Settings, 
  Bell, 
  Users, 
  Share2,
  BarChart3,
  Receipt,
  Download,
  Copy,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

export default function ConfigPage() {
  const router = useRouter();
  const { organization, user: orgUser, loading: orgLoading, error: orgError } = useOrganization();
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      generateInviteLink();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const generateInviteLink = () => {
    if (organization?.invite_code) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${baseUrl}/invite/${organization.invite_code}`);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const configSections = [
    {
      title: "Usuários e Convites",
      description: "Gerenciar membros da organização",
      icon: Users,
      color: "bg-green-500",
      actions: [
        {
          title: "Convidar Usuários",
          description: "Adicionar novos membros",
          href: "/dashboard/users/invite",
          icon: Users
        },
        {
          title: "Compartilhar Link",
          description: "Link de convite da organização",
          action: "share",
          icon: Share2
        }
      ]
    },
    {
      title: "Categorias e Centros de Custo",
      description: "Gerenciar categorias e centros de custo",
      icon: Settings,
      color: "bg-gray-500",
      actions: [
        {
          title: "Centros de Custo",
          description: "Gerenciar categorias",
          href: "/dashboard/cost-centers",
          icon: Settings
        },
        {
          title: "Categorias",
          description: "Personalizar categorias",
          href: "/dashboard/categories",
          icon: Settings
        }
      ]
    },
    {
      title: "Relatórios e Análises",
      description: "Relatórios detalhados e análises",
      icon: BarChart3,
      color: "bg-blue-500",
      actions: [
        {
          title: "Relatórios",
          description: "Análises detalhadas",
          href: "/dashboard/reports",
          icon: BarChart3
        },
        {
          title: "Extratos",
          description: "Histórico completo",
          href: "/dashboard/statements",
          icon: Receipt
        }
      ]
    },
    {
      title: "Notificações",
      description: "Configurar alertas e notificações",
      icon: Bell,
      color: "bg-orange-500",
      actions: [
        {
          title: "Configurar Notificações",
          description: "Alertas e lembretes",
          action: "notifications",
          icon: Bell
        }
      ]
    },
    {
      title: "Exportar Dados",
      description: "Baixar dados da organização",
      icon: Download,
      color: "bg-purple-500",
      actions: [
        {
          title: "Exportar Despesas",
          description: "Download em CSV/Excel",
          action: "export",
          icon: Download
        }
      ]
    }
  ];

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <Button onClick={() => router.push('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Button>
              </Link>
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="text-sm text-gray-600">{organization?.name || 'FinTrack'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Organization Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <span>Informações da Organização</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome da Organização</label>
                <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Código de Convite</label>
                <p className="text-lg font-semibold text-gray-900 font-mono">{organization?.invite_code || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configSections.map((section, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <section.icon className="h-4 w-4 text-white" />
                  </div>
                  <span>{section.title}</span>
                </CardTitle>
                <p className="text-sm text-gray-600">{section.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.actions.map((action, actionIndex) => (
                  <div key={actionIndex}>
                    {action.href ? (
                      <Link href={action.href}>
                        <Button variant="outline" className="w-full justify-start">
                          <action.icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{action.title}</div>
                            <div className="text-xs text-gray-600">{action.description}</div>
                          </div>
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => {
                          if (action.action === 'share') {
                            copyInviteLink();
                          } else if (action.action === 'notifications') {
                            // TODO: Implementar modal de notificações
                            alert('Modal de notificações será implementado em breve!');
                          } else if (action.action === 'export') {
                            // TODO: Implementar exportação
                            alert('Funcionalidade de exportação será implementada em breve!');
                          }
                        }}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-xs text-gray-600">{action.description}</div>
                        </div>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invite Link Modal */}
        {inviteLink && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                  <Share2 className="h-4 w-4 text-white" />
                </div>
                <span>Link de Convite</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button
                  onClick={copyInviteLink}
                  variant={copied ? "default" : "outline"}
                  className={copied ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Compartilhe este link para convidar novos membros para a organização.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
