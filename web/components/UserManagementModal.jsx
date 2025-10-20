import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Users, Mail, Calendar, Trash2, X, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function UserManagementModal({ isOpen, onClose, organization }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && organization) {
      fetchMembers();
    }
  }, [isOpen, organization]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      // Buscar membros da organização
      const { data, error } = await supabase
        .from('organization_users')
        .select(`
          *,
          user:user_id (
            id,
            email,
            created_at,
            user_metadata
          )
        `)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = () => {
    if (organization?.invite_code) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      return `${baseUrl}/invite/${organization.invite_code}`;
    }
    return '';
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(generateInviteLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const removeUser = async (userId) => {
    if (!confirm('Tem certeza que deseja remover este usuário da organização?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('organization_id', organization.id)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchMembers(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      alert('Erro ao remover usuário');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] overflow-hidden border border-flight-blue/20">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-flight-blue/5 rounded-t-xl">
            <CardTitle className="flex items-center space-x-3">
              <span className="text-gray-900 font-semibold">Gerenciar Usuários</span>
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-700 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Invite Link Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Link de Convite</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={generateInviteLink()}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-mono focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
                <Button
                  onClick={copyInviteLink}
                  variant={copied ? "default" : "outline"}
                  className={copied ? "bg-green-600 hover:bg-green-700" : "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"}
                  size="sm"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Compartilhe este link para convidar novos membros para a organização.
              </p>
            </div>

            {/* Members List */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Membros ({members.length})</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando membros...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum membro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {member.user?.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.user?.user_metadata?.name || member.user?.email || 'Usuário'}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>{member.user?.email}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>Entrou em {formatDate(member.joined_at || member.user?.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={`${
                          member.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        } border-0`}>
                          {member.role === 'admin' ? 'Administrador' : 'Membro'}
                        </Badge>
                        
                        {member.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUser(member.user_id)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
