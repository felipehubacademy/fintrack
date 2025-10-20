import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { Bell, Settings, LogOut } from 'lucide-react';
import Logo from './Logo';
import Link from 'next/link';

export default function Header({ 
  organization, 
  user: orgUser, 
  pageTitle = null,
  showNotificationModal = false,
  setShowNotificationModal = () => {},
  onUnreadCountChange = () => {}
}) {
  const router = useRouter();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Determinar página ativa
  const isActive = (path) => {
    return router.pathname === path;
  };

  // Handler para atualizar contador de notificações
  const handleUnreadCountChange = (count) => {
    setUnreadNotifications(count);
    onUnreadCountChange(count);
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            {/* Logo e Nome */}
            <div className="flex items-center">
              <Logo className="h-24 w-24" />
              <div className="ml-0">
                <Link href="/dashboard">
                  <h1 className="text-2xl font-bold text-deep-sky hover:text-flight-blue cursor-pointer transition-colors">
                    {organization?.name || 'MeuAzulão'}
                  </h1>
                </Link>
                {orgUser && (
                  <p className="text-sm text-gray-600">{orgUser.name}</p>
                )}
              </div>
            </div>

            {/* Menu de Navegação */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/dashboard" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'text-flight-blue border-b-2 border-flight-blue pb-1' 
                    : 'text-gray-700 hover:text-flight-blue'
                }`}
              >
                Painel Principal
              </Link>
              <Link 
                href="/dashboard/expenses" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard/expenses') 
                    ? 'text-flight-blue border-b-2 border-flight-blue pb-1' 
                    : 'text-gray-700 hover:text-flight-blue'
                }`}
              >
                Despesas
              </Link>
              <Link 
                href="/dashboard/cards" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard/cards') 
                    ? 'text-flight-blue border-b-2 border-flight-blue pb-1' 
                    : 'text-gray-700 hover:text-flight-blue'
                }`}
              >
                Cartões
              </Link>
              <Link 
                href="/dashboard/budgets" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard/budgets') 
                    ? 'text-flight-blue border-b-2 border-flight-blue pb-1' 
                    : 'text-gray-700 hover:text-flight-blue'
                }`}
              >
                Orçamentos
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNotificationModal(true)}
              >
                <Bell className="h-4 w-4" />
              </Button>
              {/* Contador tde notificações não lidas */}
              {unreadNotifications > 0 && (
                <div className="absolute -top-1 -right-1 bg-flight-blue text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {unreadNotifications}
                </div>
              )}
            </div>
            <Link href="/dashboard/config">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="text-red-600 hover:bg-red-50 px-3 py-2 text-sm"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
