import TransactionsPage from '../../../../../dashboard/transactions';

// Middleware já validou o acesso - renderizar diretamente
export default function DynamicTransactionsPage() {
  return <TransactionsPage />;
}

