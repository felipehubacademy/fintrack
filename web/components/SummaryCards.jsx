export default function SummaryCards({ expenses }) {
  // Calculate totals
  const calculateTotals = () => {
    const felipeTotal = expenses
      .filter(e => e.status === 'confirmed' && (e.owner === 'Felipe' || e.owner === 'Compartilhado'))
      .reduce((sum, e) => {
        if (e.owner === 'Compartilhado') {
          return sum + (parseFloat(e.amount) / 2);
        }
        return sum + parseFloat(e.amount);
      }, 0);

    const leticiaTotal = expenses
      .filter(e => e.status === 'confirmed' && (e.owner === 'Leticia' || e.owner === 'Compartilhado'))
      .reduce((sum, e) => {
        if (e.owner === 'Compartilhado') {
          return sum + (parseFloat(e.amount) / 2);
        }
        return sum + parseFloat(e.amount);
      }, 0);

    const totalConfirmed = expenses
      .filter(e => e.status === 'confirmed')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const totalPending = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    return {
      felipe: felipeTotal,
      leticia: leticiaTotal,
      confirmed: totalConfirmed,
      pending: totalPending,
      total: totalConfirmed + totalPending
    };
  };

  const totals = calculateTotals();

  const cards = [
    {
      title: 'Felipe',
      value: `R$ ${totals.felipe.toFixed(2)}`,
      description: 'Gastos individuais + 50% compartilhado',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Letícia',
      value: `R$ ${totals.leticia.toFixed(2)}`,
      description: 'Gastos individuais + 50% compartilhado',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Confirmado',
      value: `R$ ${totals.confirmed.toFixed(2)}`,
      description: `${expenses.filter(e => e.status === 'confirmed').length} transações`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Pendente',
      value: `R$ ${totals.pending.toFixed(2)}`,
      description: `${expenses.filter(e => e.status === 'pending').length} transações`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-yellow-500 to-yellow-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
          <div className={`bg-gradient-to-r ${card.color} p-4`}>
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm font-medium opacity-90">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className="bg-white bg-opacity-30 rounded-full p-3">
                {card.icon}
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-gray-600">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
