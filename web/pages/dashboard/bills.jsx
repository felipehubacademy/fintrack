import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import StatsCard from '../../components/ui/StatsCard';
import BillModal from '../../components/BillModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  Calendar, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Filter,
  Clock,
  CreditCard
} from 'lucide-react';

export default function BillsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const { success, showError, warning } = useNotificationContext();
  
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, paid, overdue
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [billToMarkAsPaid, setBillToMarkAsPaid] = useState(null);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchBills();
      fetchCategories();
      fetchCards();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const fetchBills = async () => {
    setIsDataLoaded(false);
    try {
      setLoading(true);
      
      let query = supabase
        .from('bills')
        .select(`
          *,
          category:budget_categories(name, color),
          cost_center:cost_centers(name, color),
          card:cards(name, bank)
        `)
        .eq('organization_id', organization.id)
        .order('due_date', { ascending: true });

      const { data, error } = await query;
      
      if (error) throw error;

      // Atualizar status overdue automaticamente
      const today = new Date().toISOString().split('T')[0];
      const updatedBills = data.map(bill => {
        if (bill.status === 'pending' && bill.due_date < today) {
          return { ...bill, status: 'overdue' };
        }
        return bill;
      });

      setBills(updatedBills);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
    }
  };

  const handleCreateBill = async (billData) => {
    try {
      const { error } = await supabase
        .from('bills')
        .insert({
          ...billData,
          organization_id: organization.id,
          user_id: orgUser.id,
          status: 'pending'
        });

      if (error) throw error;

      await fetchBills();
      setShowModal(false);
      success('Conta criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      showError('Erro ao criar conta: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleUpdateBill = async (billData) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update(billData)
        .eq('id', editingBill.id);

      if (error) throw error;

      await fetchBills();
      setShowModal(false);
      setEditingBill(null);
      success('Conta atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      showError('Erro ao atualizar conta: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleMarkAsPaid = (bill) => {
    if (!bill.payment_method) {
      warning('Por favor, edite a conta e defina um método de pagamento antes de marcar como paga.');
      return;
    }

    setBillToMarkAsPaid(bill);
    setShowConfirmModal(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!billToMarkAsPaid) return;

    try {
      // 1. Criar expense correspondente
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: bill.description,
          amount: bill.amount,
          date: new Date().toISOString().split('T')[0],
          category_id: bill.category_id,
          cost_center_id: bill.cost_center_id,
          payment_method: bill.payment_method,
          card_id: bill.card_id,
          status: 'confirmed',
          organization_id: organization.id,
          user_id: orgUser.id,
          source: 'manual'
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // 2. Atualizar bill
      const { error: billError } = await supabase
        .from('bills')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          expense_id: expense.id
        })
        .eq('id', bill.id);

      if (billError) throw billError;

      // 3. Se for recorrente, criar próxima conta
      if (bill.is_recurring) {
        await createRecurringBill(bill);
      }

      await fetchBills();
      success('Conta marcada como paga com sucesso!');
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      showError('Erro ao processar pagamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBillToMarkAsPaid(null);
    }
  };

  const createRecurringBill = async (bill) => {
    try {
      let nextDueDate = new Date(bill.due_date + 'T00:00:00');
      
      switch (bill.recurrence_frequency) {
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }

      const { error } = await supabase
        .from('bills')
        .insert({
          description: bill.description,
          amount: bill.amount,
          due_date: nextDueDate.toISOString().split('T')[0],
          category_id: bill.category_id,
          cost_center_id: bill.cost_center_id,
          is_recurring: true,
          recurrence_frequency: bill.recurrence_frequency,
          payment_method: bill.payment_method,
          card_id: bill.card_id,
          organization_id: organization.id,
          user_id: orgUser.id,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar conta recorrente:', error);
    }
  };

  const handleDeleteBill = (billId) => {
    setBillToDelete(billId);
    setShowConfirmModal(true);
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'cancelled' })
        .eq('id', billToDelete);

      if (error) throw error;

      await fetchBills();
      success('Conta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      showError('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBillToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingBill(null);
    setShowModal(true);
  };

  const openEditModal = (bill) => {
    setEditingBill(bill);
    setShowModal(true);
  };

  const getFilteredBills = () => {
    if (filter === 'all') return bills.filter(b => b.status !== 'cancelled');
    return bills.filter(b => b.status === filter);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Paga', className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Vencida', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-800' }
    };
    return badges[status] || badges.pending;
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset para início do dia
    
    const due = new Date(dueDate + 'T00:00:00');
    due.setHours(0, 0, 0, 0); // Reset para início do dia
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const filteredBills = getFilteredBills();
  const pendingCount = bills.filter(b => b.status === 'pending').length;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;
  const totalPending = bills
    .filter(b => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Contas a Pagar"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Contas a Pagar</h2>
                <p className="text-sm text-gray-600">Gerencie suas contas e vencimentos</p>
              </div>
              <Button 
                onClick={openAddModal}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 w-full">
          <StatsCard
            title="Contas Pendentes"
            value={pendingCount}
            icon={Clock}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
          />

          <StatsCard
            title="Contas Vencidas"
            value={overdueCount}
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-50"
            borderColor="border-red-200"
          />

          <StatsCard
            title="Valor Total Pendente"
            value={`R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="text-flight-blue"
            bgColor="bg-flight-blue/5"
            borderColor="border-flight-blue/20"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Todas' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'overdue', label: 'Vencidas' },
              { value: 'paid', label: 'Pagas' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-flight-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma conta encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'Adicione suas contas para gerenciar vencimentos'
                  : `Nenhuma conta ${filter === 'pending' ? 'pendente' : filter === 'overdue' ? 'vencida' : 'paga'}`
                }
              </p>
              {filter === 'all' && (
                <Button onClick={openAddModal} className="bg-flight-blue hover:bg-flight-blue/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Conta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill) => {
              const daysUntil = getDaysUntilDue(bill.due_date);
              const statusBadge = getStatusBadge(bill.status);
              
              return (
                <Card key={bill.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{bill.description}</h3>
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                          {bill.is_recurring && (
                            <Badge className="bg-blue-100 text-blue-800">
                              Recorrente
                            </Badge>
                          )}
                          {bill.is_shared && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Compartilhado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Vence: {new Date(bill.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {bill.status === 'pending' && daysUntil >= 0 && (
                              <span className={`ml-2 ${daysUntil <= 3 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                ({daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`})
                              </span>
                            )}
                          </span>
                          
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          
                          {bill.category && (
                            <span className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-1" 
                                style={{ backgroundColor: bill.category.color || '#6B7280' }}
                              />
                              {bill.category.name}
                            </span>
                          )}
                          
                          {bill.is_shared ? (
                            <span className="text-purple-600 font-medium">
                              Compartilhado
                            </span>
                          ) : bill.cost_center && (
                            <span className="text-gray-500">
                              {bill.cost_center.name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {bill.status === 'pending' && (
                          <Button
                            onClick={() => handleMarkAsPaid(bill)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marcar como Paga
                          </Button>
                        )}
                        
                        {bill.status !== 'paid' && (
                          <>
                            <Button
                              onClick={() => openEditModal(bill)}
                              size="sm"
                              variant="outline"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDeleteBill(bill.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bill Modal */}
        <BillModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBill(null);
          }}
          onSave={editingBill ? handleUpdateBill : handleCreateBill}
          editingBill={editingBill}
          costCenters={costCenters || []}
          categories={categories}
          cards={cards}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setBillToDelete(null);
          setBillToMarkAsPaid(null);
        }}
        onConfirm={billToDelete ? confirmDeleteBill : confirmMarkAsPaid}
        title={billToDelete ? "Confirmar exclusão" : "Confirmar pagamento"}
        message={
          billToDelete 
            ? "Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
            : "Marcar esta conta como paga? Isso criará uma despesa automaticamente."
        }
        confirmText={billToDelete ? "Excluir" : "Marcar como Paga"}
        cancelText="Cancelar"
        type={billToDelete ? "danger" : "warning"}
      />
    </div>
  );
}

