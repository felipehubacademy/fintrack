export default function SummaryCards({ expenses }) {
  // Calculate totals
  const totalFelipe = expenses
    .filter((e) => e.owner === 'Felipe')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalLeticia = expenses
    .filter((e) => e.owner === 'Letícia')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalShared = expenses
    .filter((e) => e.owner === 'Compartilhado')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUnassigned = expenses
    .filter((e) => !e.owner)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  const cards = [
    {
      title: 'Total Geral',
      amount: totalAll,
      color: 'bg-gradient-to-br from-gray-500 to-gray-700',
      icon: '💰',
    },
    {
      title: 'Felipe',
      amount: totalFelipe,
      color: 'bg-gradient-to-br from-blue-500 to-blue-700',
      icon: '👨',
    },
    {
      title: 'Letícia',
      amount: totalLeticia,
      color: 'bg-gradient-to-br from-pink-500 to-pink-700',
      icon: '👩',
    },
    {
      title: 'Compartilhado',
      amount: totalShared,
      color: 'bg-gradient-to-br from-purple-500 to-purple-700',
      icon: '🤝',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.color} rounded-lg shadow-lg p-6 text-white`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <p className="text-3xl font-bold">
            R$ {card.amount.toFixed(2)}
          </p>
          <p className="text-sm opacity-80 mt-2">
            {expenses.filter((e) => 
              card.title === 'Total Geral' ? true :
              card.title === 'Compartilhado' ? e.owner === 'Compartilhado' :
              e.owner === card.title
            ).length} transações
          </p>
        </div>
      ))}
      
      {totalUnassigned > 0 && (
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Não Atribuído</h3>
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-3xl font-bold">
            R$ {totalUnassigned.toFixed(2)}
          </p>
          <p className="text-sm opacity-80 mt-2">
            {expenses.filter((e) => !e.owner).length} transações
          </p>
        </div>
      )}
    </div>
  );
}

