import DashboardHome from '../../../../../dashboard/index';

// Middleware já validou o acesso - renderizar diretamente
export default function DynamicDashboard() {
  return <DashboardHome />;
}

