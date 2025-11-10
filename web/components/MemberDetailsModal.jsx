import React from 'react';
import { X } from 'lucide-react';

const MemberDetailsModal = ({ isOpen, onClose, member, transactions }) => {
  if (!isOpen || !member) return null;

  const { incomes = [], cashExpenses = [], creditExpenses = [] } = transactions || {};

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

  const getPaymentMethod = (expense) => {
    if (expense.payment_method === 'cash') return 'À Vista';
    if (expense.payment_method === 'credit' && expense.card_name) {
      return `Crédito - ${expense.card_name}`;
    }
    return 'Não especificado';
  };

  // Agrupar transações por forma de pagamento
  const groupByPaymentMethod = (expenses) => {
    const groups = {};
    expenses.forEach(expense => {
      const method = getPaymentMethod(expense);
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(expense);
    });
    return groups;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{member.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Detalhamento de transações do mês</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Entradas</p>
              <p className="text-xl font-bold text-blue-600">
                R$ {formatCurrency(member.totals?.income || 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Saídas Individuais</p>
              <p className="text-xl font-bold text-gray-900">
                - R$ {formatCurrency((member.cash?.individual || 0) + (member.credit?.individual || 0))}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Saídas Compartilhadas</p>
              <p className="text-xl font-bold text-gray-900">
                - R$ {formatCurrency((member.cash?.shared || 0) + (member.credit?.shared || 0))}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${member.totals?.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm text-gray-600 mb-1">Saldo</p>
              <p className={`text-xl font-bold ${member.totals?.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {member.totals?.balance >= 0 ? '+' : '-'} R$ {formatCurrency(Math.abs(member.totals?.balance || 0))}
              </p>
            </div>
          </div>

          {/* Entradas */}
          {incomes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Entradas ({incomes.length})
              </h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {incomes.map((income, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(income.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{income.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                          R$ {formatCurrency(income.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Saídas Individuais */}
          {cashExpenses.filter(e => e.isIndividual).length > 0 || creditExpenses.filter(e => e.isIndividual).length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                Saídas Individuais ({cashExpenses.filter(e => e.isIndividual).length + creditExpenses.filter(e => e.isIndividual).length})
              </h3>
              {(() => {
                const individualExpenses = [...cashExpenses, ...creditExpenses]
                  .filter(e => e.isIndividual)
                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                const groupedExpenses = groupByPaymentMethod(individualExpenses);
                
                return Object.entries(groupedExpenses).map(([paymentMethod, expenses]) => (
                  <div key={paymentMethod} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">{paymentMethod} ({expenses.length})</h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Descrição</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {expenses.map((expense, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(expense.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{expense.description || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                - R$ {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-900">Subtotal {paymentMethod}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              - R$ {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : null}

          {/* Saídas Compartilhadas */}
          {cashExpenses.filter(e => e.isShared).length > 0 || creditExpenses.filter(e => e.isShared).length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                Saídas Compartilhadas ({cashExpenses.filter(e => e.isShared).length + creditExpenses.filter(e => e.isShared).length})
              </h3>
              {(() => {
                const sharedExpenses = [...cashExpenses, ...creditExpenses]
                  .filter(e => e.isShared)
                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                const groupedExpenses = groupByPaymentMethod(sharedExpenses);
                
                return Object.entries(groupedExpenses).map(([paymentMethod, expenses]) => (
                  <div key={paymentMethod} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">{paymentMethod} ({expenses.length})</h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Descrição</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Valor Total</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Sua Parte</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {expenses.map((expense, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(expense.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{expense.description || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">
                                - R$ {formatCurrency(expense.totalAmount || expense.amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                - R$ {formatCurrency(expense.memberShare || expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-900">Subtotal {paymentMethod}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                              - R$ {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              - R$ {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.memberShare || e.amount || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : null}

          {/* Mensagem se não houver transações */}
          {incomes.length === 0 && 
           cashExpenses.length === 0 && 
           creditExpenses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma transação registrada neste mês.</p>
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

export default MemberDetailsModal;

