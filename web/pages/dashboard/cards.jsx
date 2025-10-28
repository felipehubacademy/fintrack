import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import CardModal from '../../components/CardModal';
import CardInvoiceModal from '../../components/CardInvoiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
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
  const { success, error: showError } = useNotificationContext();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [usageByCardId, setUsageByCardId] = useState({});
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCardForInvoice, setSelectedCardForInvoice] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

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
    setIsDataLoaded(false);
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
        setIsDataLoaded(true);
      } else {
        console.error('Error fetching cards:', error);
        setIsDataLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
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

        // somar TODAS as despesas confirmadas desse cartão (incluindo parcelas futuras)
        // pois o crédito é consumido imediatamente na compra parcelada
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('payment_method', 'credit_card')
          .eq('card_id', card.id)
          .eq('status', 'confirmed');

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
      // Converter cor CSS class para hex se necessário
      const colorMap = {
        'bg-blue-600': '#2563EB',
        'bg-orange-600': '#EA580C',
        'bg-purple-600': '#9333EA',
        'bg-green-600': '#16A34A',
        'bg-gray-600': '#4B5563',
        'bg-red-600': '#DC2626'
      };
      let color = cardData.color?.startsWith('#') 
        ? cardData.color 
        : (colorMap[cardData.color] || '#3B82F6');
      
      // Garantir que a cor tenha no máximo 7 caracteres (limite da coluna)
      if (color && color.length > 7) {
        color = color.substring(0, 7);
      }

      // Calcular limite disponível baseado em limite usado (se fornecido)
      const creditLimit = cardData.credit_limit ? parseFloat(cardData.credit_limit) : 0;
      const usedLimit = cardData.used_limit ? parseFloat(cardData.used_limit) : 0;
      const availableLimit = Math.max(0, creditLimit - usedLimit);

      // Preparar dados para inserção, garantindo valores corretos
      const insertData = {
        name: cardData.name?.trim() || '',
        bank: cardData.bank?.trim() || null,
        holder_name: cardData.holder_name?.trim() || null,
        billing_day: parseInt(cardData.billing_day) || null,
        closing_day: cardData.closing_day ? parseInt(cardData.closing_day) : null,
        best_day: cardData.best_day ? parseInt(cardData.best_day) : null,
        credit_limit: creditLimit || null,
        available_limit: availableLimit || creditLimit || null,
        color: color, // Máximo 7 caracteres
        type: 'credit',
        organization_id: organization.id,
        owner_id: orgUser.id,
        is_active: true
      };

      // Validações antes de inserir
      if (!insertData.name) {
        throw new Error('Nome do cartão é obrigatório');
      }
      if (!insertData.billing_day || insertData.billing_day < 1 || insertData.billing_day > 31) {
        throw new Error('Dia de vencimento deve ser entre 1 e 31');
      }

      console.log('📝 Inserindo cartão:', insertData);

      const { data, error } = await supabase
        .from('cards')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error('❌ Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('✅ Cartão criado:', data);

      await fetchCards();
      setShowModal(false);
      success('Cartão criado com sucesso!');
    } catch (error) {
      console.error('❌ Error adding card:', error);
      const errorMessage = error?.message || error?.details || 'Erro desconhecido';
      showError('Erro ao criar cartão: ' + errorMessage);
    }
  };

  const handleEditCard = async (cardData) => {
    try {
      // Converter cor CSS class para hex se necessário (mesmo tratamento do add)
      const colorMap = {
        'bg-blue-600': '#2563EB',
        'bg-orange-600': '#EA580C',
        'bg-purple-600': '#9333EA',
        'bg-green-600': '#16A34A',
        'bg-gray-600': '#4B5563',
        'bg-red-600': '#DC2626'
      };
      let color = cardData.color?.startsWith('#') 
        ? cardData.color 
        : (colorMap[cardData.color] || '#3B82F6');
      
      // Garantir que a cor tenha no máximo 7 caracteres (limite da coluna)
      if (color && color.length > 7) {
        color = color.substring(0, 7);
      }

      // Calcular limite disponível baseado em limite usado (se fornecido)
      const creditLimit = cardData.credit_limit ? parseFloat(cardData.credit_limit) : 0;
      const usedLimit = cardData.used_limit ? parseFloat(cardData.used_limit) : 0;
      const availableLimit = Math.max(0, creditLimit - usedLimit);

      // Preparar dados para atualização
      const updateData = {
        name: cardData.name?.trim() || '',
        bank: cardData.bank?.trim() || null,
        holder_name: cardData.holder_name?.trim() || null,
        billing_day: cardData.billing_day ? parseInt(cardData.billing_day) : null,
        closing_day: cardData.closing_day ? parseInt(cardData.closing_day) : null,
        best_day: cardData.best_day ? parseInt(cardData.best_day) : null,
        credit_limit: creditLimit || null,
        available_limit: availableLimit || creditLimit || null,
        color: color,
        type: cardData.type || 'credit'
      };

      console.log('📝 Atualizando cartão:', updateData);

      const { data, error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', editingCard.id)
        .select();
      
      if (error) {
        console.error('❌ Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('✅ Cartão atualizado:', data);

      await fetchCards();
      setShowModal(false);
      setEditingCard(null);
      success('Cartão atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Error editing card:', error);
      const errorMessage = error?.message || error?.details || 'Erro desconhecido';
      showError('Erro ao atualizar cartão: ' + errorMessage);
    }
  };

  const handleDeleteCard = (cardId) => {
    setCardToDelete(cardId);
    setShowConfirmModal(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      const { error } = await supabase
        .from('cards')
        .update({ is_active: false })
        .eq('id', cardToDelete);
      
      if (error) {
        throw error;
      }

      await fetchCards();
      success('Cartão excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting card:', error);
      showError('Erro ao excluir cartão: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setCardToDelete(null);
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


  

  if (orgLoading || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Cartões"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Gestão de Cartões</h2>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={openAddModal}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cartão
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Limite Total
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <TrendingUp className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Limite Disponível
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <DollarSign className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {(totalCreditLimit - totalCreditUsed).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Uso Total de Crédito
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <TrendingDown className={`h-4 w-4 ${totalCreditUsagePct >= 90 ? 'text-red-600' : totalCreditUsagePct >= 70 ? 'text-yellow-600' : 'text-flight-blue'}`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {totalCreditUsagePct.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {totalCreditUsed.toLocaleString('pt-BR')} de R$ {totalCreditLimit.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {cards.map((card) => {
            const limit = card.credit_limit || 0;
            
            // Determinar a cor do card: se for hex (#), usar inline style, senão usar classe CSS
            const isHexColor = card.color && card.color.startsWith('#');
            const isCssClass = card.color && card.color.startsWith('bg-');
            
            const cardColorStyle = isHexColor ? { backgroundColor: card.color } : {};
            const cardColorClass = isCssClass ? card.color : (isHexColor ? '' : 'bg-blue-600');
            
            return (
              <Card key={card.id} className="border border-flight-blue/20 bg-white shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
                {/* Card Visual */}
                <div 
                  className={`h-36 ${cardColorClass} p-6 text-white relative`}
                  style={cardColorStyle}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold">{card.name} - {card.bank || 'Banco'}</p>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-70 mb-1">Titular</p>
                        <p className="text-sm font-semibold">{card.holder_name || 'TITULAR'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <CardContent className="p-6 space-y-4 bg-flight-blue/5">
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
                        {card.best_day && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Melhor dia de compra:</span>
                            <span className="font-semibold">{card.best_day}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Dia de Fechamento:</span>
                          <span className="font-semibold">{computeClosingDay(card.best_day) ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Vencimento:</span>
                          <span className="font-semibold">{card.billing_day || '—'}</span>
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
                    {card.type === 'credit' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCardForInvoice(card);
                          setShowInvoiceModal(true);
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Ver Faturas
                      </Button>
                    )}
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
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cartão cadastrado</h3>
              <p className="text-gray-600 mb-6">Adicione seus cartões para ter controle total sobre seus gastos e limites.</p>
              <Button 
                onClick={openAddModal}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
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

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Card Invoice Modal */}
      <CardInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedCardForInvoice(null);
        }}
        card={selectedCardForInvoice}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setCardToDelete(null);
        }}
        onConfirm={confirmDeleteCard}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}