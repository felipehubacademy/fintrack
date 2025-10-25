import BankAccountsPage from '../../../../../dashboard/bank-accounts';

// Middleware já validou o acesso - renderizar diretamente
export default function DynamicBankAccountsPage() {
  return <BankAccountsPage />;
}

