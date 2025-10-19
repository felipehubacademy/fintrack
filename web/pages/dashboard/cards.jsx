import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import CardModal from '../../components/CardModal';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';
import Header from '../../components/Header';
import { 
  CreditCard, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  LogOut,
  Settings,
  Bell,
  
  Wifi,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function CardsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [usageByCardId, setUsageByCardId] = useState({});

  const computeClosingDay = (bestDay) => {
    if (!bestDay || typeof bestDay !== 'number') return null;
    if (bestDay <= 1) return 30; // fallback para melhor dia = 1
    return bestDay - 1;
  };

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchCards();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  // Buscar cartões reais da tabela cards
  const fetchCards = async () => {
    try {
      let query = supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;
      if (!error) {
        setCards(data || []);
        // calcular uso após carregar
        if (data && data.length) {
          await calculateAllCardsUsage(data);
        } else {
          setUsageByCardId({});
        }
      } else {
        console.error('Error fetching cards:', error);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  // Calcular uso por cartão no ciclo de faturamento atual
  const calculateAllCardsUsage = async (cardsList) => {
    const today = new Date();
    const refDate = today.toISOString().split('T')[0];

    const entries = await Promise.all(
      cardsList.map(async (card) => {
        if (card.type !== 'credit') {
          return [card.id, { used: 0, percentage: 0, status: 'ok' }];
        }

        // obter ciclo de faturamento; fallback para mês corrente
        let startDate, endDate;
        try {
          const { data: cycle } = await supabase.rpc('get_billing_cycle', {
            card_uuid: card.id,
            reference_date: refDate
          });
          if (cycle && cycle.length) {
            startDate = cycle[0].start_date;
            endDate = cycle[0].end_date;
          }
        } catch {}
        if (!startDate || !endDate) {
          const y = today.getFullYear();
          const m = today.getMonth();
          const start = new Date(y, m, 1);
          const end = new Date(y, m + 1, 0);
          startDate = start.toISOString().split('T')[0];
          endDate = end.toISOString().split('T')[0];
        }

        // somar despesas confirmadas desse cartão no ciclo
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('payment_method', 'credit_card')
          .eq('card_id', card.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        const used = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const limit = Number(card.credit_limit || 0);
        const percentage = limit > 0 ? (used / limit) * 100 : 0;
        const status = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'ok';
        return [card.id, { used, percentage, status }];
      })
    );

    setUsageByCardId(Object.fromEntries(entries));
  };

  // Agregados: limite total de crédito e uso total no ciclo
  const totalCreditLimit = cards
    .filter(c => c.type === 'credit')
    .reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  const totalCreditUsed = cards
    .filter(c => c.type === 'credit')
    .reduce((sum, c) => sum + Number(usageByCardId[c.id]?.used || 0), 0);
  const totalCreditUsagePct = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Funções CRUD para cartões
  const handleAddCard = async (cardData) => {
    try {
      const { error } = await supabase
        .from('cards')
        .insert([{
          ...cardData,
          organization_id: organization.id,
          owner_id: orgUser.id,
          is_active: true,
          available_limit: cardData.credit_limit,
          type: 'credit'
        }]);
      
      if (!error) {
        await fetchCards();
        setShowModal(false);
      } else {
        console.error('Error adding card:', error);
      }
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  const handleEditCard = async (cardData) => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          ...cardData,
          // Em modo "gestão", não calculamos uso aqui; alinhar available ao novo limite
          available_limit: cardData.credit_limit
        })
        .eq('id', editingCard.id);
      
      if (!error) {
        await fetchCards();
        setShowModal(false);
        setEditingCard(null);
      } else {
        console.error('Error editing card:', error);
      }
    } catch (error) {
      console.error('Error editing card:', error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
    
    try {
      const { error } = await supabase
        .from('cards')
        .update({ is_active: false })
        .eq('id', cardId);
      
      if (!error) {
        await fetchCards();
      } else {
        console.error('Error deleting card:', error);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const openAddModal = () => {
    setEditingCard(null);
    setShowModal(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setShowModal(true);
  };


  

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando cartões...</p>
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
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Cartões"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Actions (consistentes com /finance) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h2 className="text-lg font-semibold text-gray-900">Gestão de Cartões</h2>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={openAddModal}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Cartões</p>
                  <p className="text-2xl font-bold text-gray-900">{cards.length}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Limite Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cartões Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {cards.filter(c => c.is_active).length}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Uso Total de Crédito</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCreditUsagePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    R$ {totalCreditUsed.toLocaleString('pt-BR')} de R$ {totalCreditLimit.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingDown className={`h-5 w-5 ${totalCreditUsagePct >= 90 ? 'text-red-600' : totalCreditUsagePct >= 70 ? 'text-yellow-600' : 'text-green-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const limit = card.credit_limit || 0;
            
            return (
              <Card key={card.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card Visual */}
                <div className={`h-36 bg-gradient-to-r ${card.color} p-6 text-white relative`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xl font-bold">{card.name} - {card.bank || 'Banco'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-70 mb-1">Titular</p>
                        <p className="text-sm font-semibold">{card.holder_name || 'TITULAR'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70 mb-1">Vencimento</p>
                        <p className="text-sm font-semibold">{card.billing_day || '—'}</p>
                        {card.best_day && (
                          <>
                            <p className="text-xs opacity-70 mb-1 mt-2">Melhor dia de compra</p>
                            <p className="text-sm font-semibold">{card.best_day}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <CardContent className="p-6 space-y-4">
                  {/* Usage Progress (only for credit cards) */}
                  {/* Uso do limite (apenas cartões de crédito) */}
                  {card.type === 'credit' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uso do Limite</span>
                        <span className="font-medium">{(usageByCardId[card.id]?.percentage || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (usageByCardId[card.id]?.status === 'danger') ? 'bg-red-500' :
                            (usageByCardId[card.id]?.status === 'warning') ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usageByCardId[card.id]?.percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Financial Info */}
                  <div className="space-y-2">
                    {card.type === 'credit' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Limite:</span>
                          <span className="font-semibold">R$ {limit.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Limite Disponível:</span>
                          <span className="font-semibold">
                            {(() => {
                              const used = Number(usageByCardId[card.id]?.used || 0);
                              const available = Math.max(0, Number(limit) - used);
                              return `R$ ${available.toLocaleString('pt-BR')}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Dia de Fechamento:</span>
                          <span className="font-semibold">{computeClosingDay(card.best_day) ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`font-semibold ${card.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {card.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">Cartão de Débito</p>
                        <p className="text-lg font-semibold">Sem limite definido</p>
                      </div>
                    )}
                  </div>


                  {/* Actions */}
                  <div className="flex justify-center space-x-2 pt-4 border-t">
                    <Link href={`/dashboard/expenses?card=${card.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Ver Despesas
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditModal(card)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {cards.length === 0 && (
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cartão cadastrado</h3>
              <p className="text-gray-600 mb-6">Adicione seus cartões para ter controle total sobre seus gastos e limites.</p>
              <Button 
                onClick={openAddModal}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card Modal */}
        <CardModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCard(null);
          }}
          onSave={editingCard ? handleEditCard : handleAddCard}
          editingCard={editingCard}
        />
      </main>
    </div>
  );
}