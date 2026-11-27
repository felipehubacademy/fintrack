import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { appLocale } from '../lib/utils';
import { formatMoney } from '@fintrack/shared/i18n';

const MemberDetailsModal = ({ isOpen, onClose, member, transactions }) => {
  const { t } = useI18n();
  if (!isOpen || !member) return null;

  const { allocations = [], cashExpenses = [], creditExpenses = [] } = transactions || {};

  const formatCurrency = (value) => {
    return formatMoney(Number(value || 0));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(appLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPaymentMethod = (expense) => {
    if (expense.payment_method === 'cash') return t('web.shared.paidNow');
    if (expense.payment_method === 'credit' && expense.card_name) {
      return t('web.memberDetailsModal.credit', { card_name: expense.card_name });
    }
    return t('web.memberDetailsModal.notSpecified');
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
            <p className="text-sm text-gray-500 mt-1">{t('web.memberDetailsModal.thisMonthSTransactionsIn')}</p>
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
              <p className="text-sm text-gray-600 mb-1">{t('web.memberDetailsModal.contributions')}</p>
              <p className="text-xl font-bold text-flight-blue">
                {formatCurrency(member.totals?.allocations || 0)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">{t('web.memberDetailsModal.individualExpenses')}</p>
              <p className="text-xl font-bold text-gray-900">
                - {formatCurrency((member.cash?.individual || 0) + (member.credit?.individual || 0))}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">{t('web.memberDetailsModal.sharedExpenses')}</p>
              <p className="text-xl font-bold text-gray-900">
                - {formatCurrency((member.cash?.shared || 0) + (member.credit?.shared || 0))}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${member.totals?.balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm text-gray-600 mb-1">{t('web.shared.balance')}</p>
              <p className={`text-xl font-bold ${member.totals?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {member.totals?.balance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(member.totals?.balance || 0))}
              </p>
            </div>
          </div>

          {/* Aportes */}
          {allocations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-2 h-2 bg-flight-blue rounded-full mr-2"></span>
                {t('web.memberDetailsModal.contributions2', { length: allocations.length })}
              </h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.shared.date2')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.memberDetailsModal.bankAccount')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.memberDetailsModal.destination')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">{t('web.shared.amount2')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allocations.map((allocation, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(allocation.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{allocation.bank_account_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {allocation.allocation_target === 'individual' ? t('web.shared.individual') : t('web.shared.shared2')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-flight-blue">
                          {formatCurrency(allocation.amount)}
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
                {t('web.memberDetailsModal.individualExpenses2', { p0: cashExpenses.filter(e => e.isIndividual).length + creditExpenses.filter(e => e.isIndividual).length })}
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.shared.date2')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.shared.description2')}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">{t('web.shared.amount2')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {expenses.map((expense, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(expense.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{expense.description || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                - {formatCurrency(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-900">{t('web.memberDetailsModal.subtotal', { paymentMethod })}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              - {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0))}
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
                {t('web.memberDetailsModal.sharedExpenses2', { p0: cashExpenses.filter(e => e.isShared).length + creditExpenses.filter(e => e.isShared).length })}
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.shared.date2')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('web.shared.description2')}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">{t('web.memberDetailsModal.totalAmount')}</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">{t('web.memberDetailsModal.yourShare')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {expenses.map((expense, idx) => (
                            <tr key={idx} className="hover:bg-white transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(expense.date)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{expense.description || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">
                                - {formatCurrency(expense.totalAmount || expense.amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                - {formatCurrency(expense.memberShare || expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-900">{t('web.memberDetailsModal.subtotal', { paymentMethod })}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                              - {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              - {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.memberShare || e.amount || 0), 0))}
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
          {allocations.length === 0 && 
           cashExpenses.length === 0 && 
           creditExpenses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('web.memberDetailsModal.nothingLoggedThisMonth')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('web.shared.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailsModal;

