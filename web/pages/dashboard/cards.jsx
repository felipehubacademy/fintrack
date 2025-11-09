import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { getBrazilToday } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import CardModal from '../../components/CardModal';
import CardBulkTransactionsModal from '../../components/CardBulkTransactionsModal';
import CardInvoiceModal from '../../components/CardInvoiceModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';
import Header from '../../components/Header';
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
  HelpCircle,
  Wifi,
  Shield,
  Eye
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
  const [currentInvoiceByCardId, setCurrentInvoiceByCardId] = useState({});
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCardForInvoice, setSelectedCardForInvoice] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedCardForBulk, setSelectedCardForBulk] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [openTooltip, setOpenTooltip] = useState(null);

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
    // Usar fuso horário do Brasil
    const today = getBrazilToday();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const refDate = `${year}-${month}-${day}`;

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

        const limit = Number(card.credit_limit || 0);
        
        // Sempre calcular uso baseado nas despesas confirmadas
        // Incluir todas as despesas confirmadas do cartão (não filtrar por ciclo ainda)
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, date, installment_info')
          .eq('payment_method', 'credit_card')
          .eq('card_id', card.id)
          .eq('status', 'confirmed');
        
        const finalUsed = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        
        // Calcular fatura atual (despesas do ciclo atual)
        let currentInvoiceTotal = 0;
        if (startDate && endDate && expenses) {
          for (const expense of expenses) {
            // Verificar se é parcela
            if (expense.installment_info && 
                expense.installment_info.total_installments > 1) {
              // Para parcelas, verificar se a data da parcela está no ciclo atual
              const parcelDate = expense.date;
              if (parcelDate >= startDate && parcelDate <= endDate) {
                const installmentAmount = expense.installment_info.installment_amount || expense.amount || 0;
                currentInvoiceTotal += Number(installmentAmount);
              }
            } else {
              // Despesa à vista: verificar se está no ciclo atual
              if (expense.date >= startDate && expense.date <= endDate) {
                currentInvoiceTotal += Number(expense.amount || 0);
              }
            }
          }
        }
        
        // Atualizar available_limit no banco automaticamente baseado nas despesas
        const newAvailable = Math.max(0, limit - finalUsed);
        supabase
          .from('cards')
          .update({ available_limit: newAvailable })
          .eq('id', card.id)
          .then(() => console.log('✅ Updated available_limit for card:', card.id, 'to', newAvailable))
          .catch(err => console.warn('⚠️ Failed to update available_limit:', err));
        
        const percentage = limit > 0 ? (finalUsed / limit) * 100 : 0;
        const status = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'ok';
        return [card.id, { used: finalUsed, percentage, status, currentInvoice: currentInvoiceTotal }];
      })
    );

    const usageMap = Object.fromEntries(entries);
    setUsageByCardId(usageMap);
    
    // Extrair fatura atual de cada cartão
    const invoiceMap = {};
    entries.forEach(([cardId, data]) => {
      invoiceMap[cardId] = data.currentInvoice || 0;
    });
    setCurrentInvoiceByCardId(invoiceMap);
  };

  // Agregados: limite total de crédito e uso total no ciclo
  const totalCreditLimit = cards
    .filter(c => c.type === 'credit')
    .reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  const totalCreditUsed = cards
    .filter(c => c.type === 'credit')
    .reduce((sum, c) => sum + Number(usageByCardId[c.id]?.used || 0), 0);
  const totalCreditUsagePct = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;
  
  // Calcular soma de todas as faturas atuais
  const totalCurrentInvoices = cards
    .filter(c => c.type === 'credit')
    .reduce((sum, c) => sum + Number(currentInvoiceByCardId[c.id] || 0), 0);

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

      const creditLimit = cardData.credit_limit ? parseFloat(cardData.credit_limit) : 0;

      // Preparar dados para inserção, garantindo valores corretos
      // Não definir available_limit - será calculado automaticamente baseado nas despesas
      const insertData = {
        name: cardData.name?.trim() || '',
        bank: cardData.bank?.trim() || null,
        holder_name: cardData.holder_name?.trim() || null,
        billing_day: parseInt(cardData.billing_day) || null,
        closing_day: cardData.closing_day ? parseInt(cardData.closing_day) : null,
        best_day: cardData.best_day ? parseInt(cardData.best_day) : null,
        credit_limit: creditLimit || null,
        available_limit: null, // Sempre null - será calculado automaticamente das despesas
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

      const creditLimit = cardData.credit_limit ? parseFloat(cardData.credit_limit) : 0;

      // Preparar dados para atualização
      // Não atualizar available_limit - será calculado automaticamente baseado nas despesas
      const updateData = {
        name: cardData.name?.trim() || '',
        bank: cardData.bank?.trim() || null,
        holder_name: cardData.holder_name?.trim() || null,
        billing_day: cardData.billing_day ? parseInt(cardData.billing_day) : null,
        closing_day: cardData.closing_day ? parseInt(cardData.closing_day) : null,
        best_day: cardData.best_day ? parseInt(cardData.best_day) : null,
        credit_limit: creditLimit || null,
        // available_limit não é atualizado - permanece null ou será recalculado automaticamente
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

      // Forçar recálculo do uso após atualização
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
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Cartões"
      >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Limite Total
              </CardTitle>
              <div className="p-2 rounded-lg bg-gray-100">
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Limite Disponível
              </CardTitle>
              <div className="p-2 rounded-lg bg-gray-100">
                <DollarSign className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {(totalCreditLimit - totalCreditUsed).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Uso Total de Crédito
              </CardTitle>
              <div className="p-2 rounded-lg bg-gray-100">
                <TrendingDown className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {totalCreditUsagePct.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {totalCreditUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de R$ {totalCreditLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Card Faturas Atuais */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'current-invoices' ? null : 'current-invoices')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Faturas Atuais
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {totalCurrentInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total de faturas em aberto
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'current-invoices' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Faturas por Cartão</p>
              <div className="space-y-3">
                {(() => {
                  const creditCards = cards.filter(c => c.type === 'credit');
                  
                  if (creditCards.length === 0) {
                    return (
                      <p className="text-sm text-gray-500">Nenhum cartão de crédito cadastrado</p>
                    );
                  }
                  
                  const cardsWithInvoices = creditCards
                    .map(card => ({
                      card,
                      invoice: Number(currentInvoiceByCardId[card.id] || 0)
                    }))
                    .filter(item => item.invoice > 0)
                    .sort((a, b) => b.invoice - a.invoice);
                  
                  if (cardsWithInvoices.length === 0) {
                    return (
                      <p className="text-sm text-gray-500">Nenhuma fatura em aberto</p>
                    );
                  }
                  
                  const total = cardsWithInvoices.reduce((sum, item) => sum + item.invoice, 0);
                  
                  return (
                    <>
                      {cardsWithInvoices.map(({ card, invoice }) => {
                        const percentage = total > 0 ? ((invoice / total) * 100).toFixed(1) : 0;
                        const isHexColor = card.color && card.color.startsWith('#');
                        const cardColorStyle = isHexColor ? { backgroundColor: card.color } : {};
                        const cardColorClass = card.color && card.color.startsWith('bg-') ? card.color : 'bg-gray-400';
                        
                        return (
                          <div key={card.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center space-x-3 flex-1">
                              <div 
                                className={`w-4 h-4 rounded ${cardColorClass}`}
                                style={cardColorStyle}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {card.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {percentage}% do total
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                R$ {invoice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">Total</p>
                          <p className="text-sm font-bold text-gray-900">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

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
                          <span className="font-semibold">R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Limite Utilizado:</span>
                          <span className="font-semibold">
                            R$ {Number(usageByCardId[card.id]?.used || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Fatura Atual:</span>
                          <span className="font-semibold">
                            R$ {Number(currentInvoiceByCardId[card.id] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Limite Disponível:</span>
                          <span className="font-semibold">
                            {(() => {
                              const used = Number(usageByCardId[card.id]?.used || 0);
                              const available = Math.max(0, Number(limit) - used);
                              return `R$ ${available.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                        size="icon"
                        onClick={() => {
                          setSelectedCardForInvoice(card);
                          setShowInvoiceModal(true);
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        aria-label="Ver faturas"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => openEditModal(card)}
                      aria-label="Editar cartão"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setSelectedCardForBulk(card);
                        setShowBulkModal(true);
                      }}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      aria-label="Adicionar transações em massa"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      aria-label="Excluir cartão"
                    >
                      <Trash2 className="h-4 w-4" />
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

      {/* Mass Transactions Modal */}
      <CardBulkTransactionsModal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setSelectedCardForBulk(null);
        }}
        card={selectedCardForBulk}
        onSuccess={fetchCards}
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

      </Header>
    </>
  );
}