import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const BankTransactionsModal = ({ isOpen, onClose, account, organization }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && account && organization) {
      fetchTransactions();
    }
  }, [isOpen, account, organization]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      console.log('🔍 Buscando transações para conta:', account.id, account.name);
      
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select('*')
        .eq('bank_account_id', account.id)
        .eq('organization_id', organization.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Transações encontradas: ${data?.length || 0}`);
      if (data && data.length > 0) {
        console.log('📋 Primeiras 3 transações:', data.slice(0, 3));
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTransactionLabel = (type) => {
    // Tipos que são entradas (crédito)
    const creditTypes = ['income_deposit', 'transfer_in'];
    
    if (creditTypes.includes(type)) {
      return 'Entrada';
    }
    
    // Todo o resto é saída (débito)
    return 'Saída';
  };

  // Calcular totais
  const totalCredits = transactions
    .filter(t => ['income_deposit', 'transfer_in'].includes(t.transaction_type))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalDebits = transactions
    .filter(t => !['income_deposit', 'transfer_in'].includes(t.transaction_type))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const balance = totalCredits - totalDebits;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Histórico de transações - Saldo atual: R$ {formatCurrency(account.current_balance || 0)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Total de Entradas</p>
                <TrendingUp className="h-4 w-4 text-flight-blue" />
              </div>
              <p className="text-xl font-bold text-flight-blue">
                R$ {formatCurrency(totalCredits)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Total de Saídas</p>
                <TrendingDown className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                R$ {formatCurrency(totalDebits)}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Saldo Líquido</p>
                <DollarSign className={`h-4 w-4 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance >= 0 ? '+' : '-'} R$ {formatCurrency(Math.abs(balance))}
              </p>
            </div>
          </div>

          {/* Transações */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando transações...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                Transações ({transactions.length})
              </h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Valor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((transaction) => {
                      const isCredit = ['income_deposit', 'transfer_in'].includes(transaction.transaction_type);
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(transaction.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {getTransactionLabel(transaction.transaction_type)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.description || '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${
                            isCredit ? 'text-flight-blue' : 'text-gray-900'
                          }`}>
                            {isCredit ? '+' : '-'} R$ {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            R$ {formatCurrency(transaction.balance_after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma transação registrada.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankTransactionsModal;

