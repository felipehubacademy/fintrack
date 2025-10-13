import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import MonthlyComparison from '../../components/MonthlyComparison';

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Check authentication
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
    } else {
      setUser(user);
      fetchSummary();
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // Buscar resumo consolidado via API (pode falhar, ignorar)
      try {
        const month = new Date().toISOString().slice(0, 7);
        const response = await fetch(`https://fintrack-backend-theta.vercel.app/expenses/summary?month=${month}`);
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (apiError) {
        console.log('API summary not available, using local data');
        setSummary({
          card: { total: 0 },
          general: { total: 0 },
          totals: { felipe: 0, leticia: 0, grand_total: 0 }
        });
      }
      
      // Buscar todas as despesas do mês atual (card + general)
      await fetchAllExpenses();
      
      // Buscar dados mensais (últimos 6 meses)
      await fetchMonthlyData();
      
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllExpenses = async (month = selectedMonth) => {
    try {
      // Para CARTÕES: usar ciclo de compras (dia 9 do mês anterior até dia 8 do mês atual)
      // Para GERAIS: usar mês civil normal
      
      const [year, monthNum] = month.split('-');
      
      // Ciclo de cartão: 09 do mês anterior até 08 do mês selecionado
      const cardStartDate = new Date(parseInt(year), parseInt(monthNum) - 2, 9); // Mês -2 porque monthNum é 1-indexed
      const cardEndDate = new Date(parseInt(year), parseInt(monthNum) - 1, 8);
      
      const cardStart = cardStartDate.toISOString().split('T')[0];
      const cardEnd = cardEndDate.toISOString().split('T')[0];
      
      // Despesas gerais: mês civil normal
      const generalStart = `${month}-01`;
      const generalEndDate = new Date(parseInt(year), parseInt(monthNum), 0);
      const generalEnd = generalEndDate.toISOString().split('T')[0];

      console.log(`🔍 Cartões (CICLO): ${cardStart} a ${cardEnd}`);
      console.log(`🔍 Gerais (MÊS): ${generalStart} a ${generalEnd}`);

      // Buscar despesas de cartão (usando CICLO)
      const { data: cardData, error: cardError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', cardStart)
        .lte('date', cardEnd)
        .eq('status', 'confirmed');

      console.log(`💳 Cartões: ${cardData?.length || 0} despesas`);
      if (cardError) console.error('Erro cartão:', cardError);

      // Buscar despesas gerais (usando mês civil)
      const { data: generalData, error: generalError } = await supabase
        .from('expenses_general')
        .select('*')
        .gte('date', generalStart)
        .lte('date', generalEnd)
        .eq('status', 'confirmed');

      console.log(`💰 Gerais: ${generalData?.length || 0} despesas`);
      if (generalError) console.error('Erro geral:', generalError);

      const allData = [...(cardData || []), ...(generalData || [])];
      console.log(`📊 Total combinado: ${allData.length} despesas`);
      
      setAllExpenses(allData);
    } catch (error) {
      console.error('Error fetching all expenses:', error);
    }
  };

  // Atualizar quando mudar o mês
  useEffect(() => {
    if (user) {
      fetchAllExpenses(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchMonthlyData = async () => {
    try {
      const months = [];
      const now = new Date();
      
      // Últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        months.push(monthStr);
      }

      console.log('📅 Buscando dados dos meses:', months);

      const data = await Promise.all(months.map(async (month) => {
        const [year, monthNum] = month.split('-');
        
        // CARTÕES: Ciclo de compras (dia 9 do mês anterior até dia 8 do mês selecionado)
        const cardStartDate = new Date(parseInt(year), parseInt(monthNum) - 2, 9);
        const cardEndDate = new Date(parseInt(year), parseInt(monthNum) - 1, 8);
        const cardStart = cardStartDate.toISOString().split('T')[0];
        const cardEnd = cardEndDate.toISOString().split('T')[0];
        
        // GERAIS: Mês civil
        const generalStart = `${month}-01`;
        const generalEndDate = new Date(parseInt(year), parseInt(monthNum), 0);
        const generalEnd = generalEndDate.toISOString().split('T')[0];

        // Cartões (CICLO)
        const { data: cardData } = await supabase
          .from('expenses')
          .select('amount')
          .gte('date', cardStart)
          .lte('date', cardEnd)
          .eq('status', 'confirmed');

        // Despesas gerais (MÊS CIVIL)
        const { data: generalData } = await supabase
          .from('expenses_general')
          .select('amount')
          .gte('date', generalStart)
          .lte('date', generalEnd)
          .eq('status', 'confirmed');

        const cardTotal = (cardData || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const generalTotal = (generalData || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

        console.log(`${month}: Cartões=${cardTotal.toFixed(2)}, Gerais=${generalTotal.toFixed(2)}`);

        return {
          month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          cartoes: cardTotal,
          despesas: generalTotal,
          total: cardTotal + generalTotal
        };
      }));

      console.log('📊 Dados mensais:', data);
      setMonthlyData(data);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const totals = summary?.totals || { felipe: 0, leticia: 0, grand_total: 0 };
  const card = summary?.card || { total: 0 };
  const general = summary?.general || { total: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FinTrack</h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Visão Geral</h2>
          <p className="text-gray-600">Resumo consolidado de todas as suas despesas</p>
        </div>

        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card: Cartões */}
          <Link href="/dashboard/card">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm font-medium opacity-90">Cartões de Crédito</p>
                    <p className="text-3xl font-bold mt-2">R$ {card.total.toFixed(2)}</p>
                  </div>
                  <div className="bg-white bg-opacity-30 rounded-full p-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-blue-50">
                <p className="text-sm text-blue-800 font-medium">Ver detalhes →</p>
              </div>
            </div>
          </Link>

          {/* Card: Despesas Gerais */}
          <Link href="/dashboard/finance">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm font-medium opacity-90">Despesas Gerais</p>
                    <p className="text-3xl font-bold mt-2">R$ {general.total.toFixed(2)}</p>
                  </div>
                  <div className="bg-white bg-opacity-30 rounded-full p-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-green-50">
                <p className="text-sm text-green-800 font-medium">Ver detalhes →</p>
              </div>
            </div>
          </Link>

          {/* Card: Total Geral */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Geral</p>
                  <p className="text-3xl font-bold mt-2">R$ {totals.grand_total.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-purple-50">
              <p className="text-sm text-purple-800">Cartões + Despesas</p>
            </div>
          </div>
        </div>

        {/* Cards por Pessoa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Felipe */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Felipe</h3>
                <p className="text-sm text-gray-600">Despesas individuais + 50% compartilhadas</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">R$ {totals.felipe.toFixed(2)}</p>
          </div>

          {/* Letícia */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="bg-pink-100 rounded-full p-3 mr-4">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Letícia</h3>
                <p className="text-sm text-gray-600">Despesas individuais + 50% compartilhadas</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-pink-600">R$ {totals.leticia.toFixed(2)}</p>
          </div>
        </div>

        {/* Gráficos do Mês Selecionado */}
        <div className="mb-8">
          <MonthCharts 
            expenses={allExpenses} 
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>

        {/* Comparativo Mensal */}
        <MonthlyComparison monthlyData={monthlyData} />
      </div>
    </div>
  );
}

