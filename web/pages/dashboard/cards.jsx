import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
  Search,
  Eye,
  EyeOff,
  Wifi,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function CardsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const [cards, setCards] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showNumbers, setShowNumbers] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchCards();
      fetchExpenses();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

  const fetchCards = async () => {
    try {
      // Mock cards for now - will be replaced with real API
      const mockCards = [
        {
          id: 1,
          name: 'LATAM PASS Itaú Visa Infinite',
          number: '**** **** **** 1234',
          holder: 'FELIPE XAVIER',
          expiry: '12/26',
          limit: 15000,
          used: 8500,
          available: 6500,
          status: 'active',
          type: 'credit',
          bank: 'Itaú',
          color: 'from-blue-600 to-purple-600'
        },
        {
          id: 2,
          name: 'Nubank Mastercard',
          number: '**** **** **** 5678',
          holder: 'LETICIA XAVIER',
          expiry: '08/25',
          limit: 8000,
          used: 3200,
          available: 4800,
          status: 'active',
          type: 'credit',
          bank: 'Nubank',
          color: 'from-purple-600 to-pink-600'
        },
        {
          id: 3,
          name: 'Santander Débito',
          number: '**** **** **** 9012',
          holder: 'FELIPE XAVIER',
          expiry: '05/27',
          limit: 0,
          used: 0,
          available: 0,
          status: 'active',
          type: 'debit',
          bank: 'Santander',
          color: 'from-red-600 to-orange-600'
        }
      ];
      setCards(mockCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(selectedMonth + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .eq('payment_method', 'credit_card')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;
      if (!error) {
        setExpenses(data || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === 0) return 0;
    return (used / limit) * 100;
  };

  const getUsageStatus = (percentage) => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'danger':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCardNumber = (number) => {
    if (showNumbers) {
      return number;
    }
    return number.replace(/\d(?=\d{4})/g, '*');
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
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
                <p className="text-sm text-gray-600">{organization?.name || 'FinTrack'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => setShowNumbers(!showNumbers)}>
                {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
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
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Relatório
            </Button>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm">
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

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Limite Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {cards.reduce((sum, c) => sum + c.limit, 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {cards.reduce((sum, c) => sum + c.used, 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disponível</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {cards.reduce((sum, c) => sum + c.available, 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const usagePercentage = getUsagePercentage(card.used, card.limit);
            const usageStatus = getUsageStatus(usagePercentage);
            
            return (
              <Card key={card.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Card Visual */}
                <div className={`h-32 bg-gradient-to-r ${card.color} p-6 text-white relative`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm opacity-80">{card.bank}</p>
                      <p className="text-lg font-semibold">{card.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Wifi className="h-4 w-4" />
                        <Shield className="h-4 w-4" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        {card.type === 'credit' ? 'Crédito' : 'Débito'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm opacity-80">Titular</p>
                        <p className="font-semibold">{card.holder}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-80">Vencimento</p>
                        <p className="font-semibold">{card.expiry}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <CardContent className="p-6 space-y-4">
                  {/* Card Number */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Número do Cartão</p>
                    <p className="font-mono text-lg font-semibold">
                      {formatCardNumber(card.number)}
                    </p>
                  </div>

                  {/* Usage Progress (only for credit cards) */}
                  {card.type === 'credit' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uso do Limite</span>
                        <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            usageStatus === 'danger' ? 'bg-red-500' :
                            usageStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
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
                          <span className="font-semibold">R$ {card.limit.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Usado:</span>
                          <span className="font-semibold">R$ {card.used.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm text-gray-600">Disponível:</span>
                          <span className="font-semibold text-green-600">R$ {card.available.toLocaleString('pt-BR')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">Cartão de Débito</p>
                        <p className="text-lg font-semibold">Sem limite definido</p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  {card.type === 'credit' && (
                    <div className="flex justify-center">
                      <Badge className={`${getStatusColor(usageStatus)} border-0`}>
                        {usageStatus === 'danger' ? 'Limite Crítico' : 
                         usageStatus === 'warning' ? 'Atenção' : 'Limite Saudável'}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-center space-x-2 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {cards.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cartão cadastrado</h3>
              <p className="text-gray-600 mb-6">Adicione seus cartões para ter controle total sobre seus gastos e limites.</p>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
