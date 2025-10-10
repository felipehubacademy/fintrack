export default function SummaryCards({ expenses }) {
  // Calculate totals
  const calculateTotals = () => {
    const felipeTotal = expenses
      .filter(e => e.status === 'confirmed' && e.owner === 'Felipe')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const leticiaTotal = expenses
      .filter(e => e.status === 'confirmed' && e.owner === 'Leticia')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const compartilhadoTotal = expenses
      .filter(e => e.status === 'confirmed' && e.owner === 'Compartilhado')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const totalPending = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Total da fatura (individual + compartilhado)
    const invoiceTotal = felipeTotal + leticiaTotal + compartilhadoTotal;

    return {
      felipe: felipeTotal,
      leticia: leticiaTotal,
      compartilhado: compartilhadoTotal,
      pending: totalPending,
      invoice: invoiceTotal,
      total: felipeTotal + leticiaTotal + compartilhadoTotal + totalPending
    };
  };

  const totals = calculateTotals();

  const cards = [
    {
      title: 'Felipe',
      value: `R$ ${totals.felipe.toFixed(2)}`,
      description: 'Gastos individuais',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Letícia',
      value: `R$ ${totals.leticia.toFixed(2)}`,
      description: 'Gastos individuais',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Compartilhado',
      value: `R$ ${totals.compartilhado.toFixed(2)}`,
      description: `${expenses.filter(e => e.status === 'confirmed' && e.owner === 'Compartilhado').length} transações`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Fatura Total',
      value: `R$ ${totals.invoice.toFixed(2)}`,
      description: 'Vencimento: dia 15',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Pendente',
      value: `R$ ${totals.pending.toFixed(2)}`,
      description: `${expenses.filter(e => e.status === 'pending').length} transações`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-yellow-500 to-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
          <div className={`bg-gradient-to-r ${card.color} p-3`}>
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-medium opacity-90">{card.title}</p>
                <p className="text-lg font-bold mt-1">{card.value}</p>
              </div>
              <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                {card.icon}
              </div>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-600">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
