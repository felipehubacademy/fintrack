import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { Settings, LogOut, ChevronDown, Menu, X, FileText, Receipt, CreditCard, TrendingUp, Wallet, Target } from 'lucide-react';
import Logo from './Logo';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import { useDynamicUrls } from '../hooks/useDynamicUrls';

export default function Header({ 
  organization, 
  user: orgUser, 
  pageTitle = null
}) {
  const router = useRouter();
  const { getDynamicUrl } = useDynamicUrls();
  const [financeDropdownOpen, setFinanceDropdownOpen] = useState(false);
  const [planningDropdownOpen, setPlanningDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFinanceOpen, setMobileFinanceOpen] = useState(false);
  const [mobilePlanningOpen, setMobilePlanningOpen] = useState(false);
  const financeRef = useRef(null);
  const planningRef = useRef(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (financeRef.current && !financeRef.current.contains(event.target)) {
        setFinanceDropdownOpen(false);
      }
      if (planningRef.current && !planningRef.current.contains(event.target)) {
        setPlanningDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Determinar página ativa (suporta URLs legadas e dinâmicas)
  const isActive = (path) => {
    // Para URLs dinâmicas, verificar se o pathname contém o path
    if (router.pathname.includes('[orgId]') && router.pathname.includes('[userId]')) {
      // Extrair a parte após /user/[userId]/
      const pathAfterUser = router.pathname.split('/user/[userId]/')[1] || '';
      const targetPath = path.replace(/^\//, ''); // Remove / inicial
      
      // Se for dashboard root
      if (path === '/dashboard') {
        return pathAfterUser === 'dashboard';
      }
      
      // Para outras páginas, verificar se corresponde
      return pathAfterUser === targetPath;
    }
    return router.pathname === path;
  };

  // Verificar se algum link do dropdown está ativo
  const isDropdownActive = (paths) => {
    return paths.some(path => isActive(path));
  };


  return (
    <>
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            {/* Logo e Nome */}
            <div className="flex items-center -ml-3">
              <Logo className="h-24 w-24 -my-2" />
              <div className="-ml-3">
                <h1 className="text-xl font-bold text-deep-sky">
                  {organization?.name || 'MeuAzulão'}
                </h1>
                {orgUser && (
                  <p className="text-xs text-gray-600">{orgUser.name}</p>
                )}
              </div>
            </div>

            {/* Menu de Navegação */}
            <nav className="hidden md:flex items-center space-x-6">
              {/* Painel Principal */}
              <Link 
                href={getDynamicUrl('/dashboard')}
                className={`text-sm font-medium transition-colors ${
                  isActive('/dashboard') 
                    ? 'text-flight-blue border-b-2 border-flight-blue pb-1' 
                    : 'text-gray-700 hover:text-flight-blue'
                }`}
              >
                Painel Principal
              </Link>

              {/* Dropdown Financeiro */}
              <div className="relative" ref={financeRef}>
                <button
                  onClick={() => {
                    setFinanceDropdownOpen(!financeDropdownOpen);
                    setPlanningDropdownOpen(false);
                  }}
                  className={`text-sm font-medium transition-colors flex items-center space-x-1 ${
                    isDropdownActive(['/dashboard/transactions', '/dashboard/cards', '/dashboard/bills', '/dashboard/bank-accounts'])
                      ? 'text-flight-blue border-b-2 border-flight-blue pb-1'
                      : 'text-gray-700 hover:text-flight-blue'
                  }`}
                >
                  <span>Financeiro</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${financeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {financeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link 
                      href={getDynamicUrl('/dashboard/transactions')}
                      onClick={() => setFinanceDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/transactions') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Transações</span>
                    </Link>
                    <Link 
                      href={getDynamicUrl('/dashboard/bank-accounts')}
                      onClick={() => setFinanceDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/bank-accounts') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Contas Bancárias</span>
                    </Link>
                    <Link 
                      href={getDynamicUrl('/dashboard/cards')}
                      onClick={() => setFinanceDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/cards') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Cartões</span>
                    </Link>
                    <Link 
                      href={getDynamicUrl('/dashboard/bills')}
                      onClick={() => setFinanceDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/bills') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Contas a Pagar</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Dropdown Planejamento */}
              <div className="relative" ref={planningRef}>
                <button
                  onClick={() => {
                    setPlanningDropdownOpen(!planningDropdownOpen);
                    setFinanceDropdownOpen(false);
                  }}
                  className={`text-sm font-medium transition-colors flex items-center space-x-1 ${
                    isDropdownActive(['/dashboard/budgets', '/dashboard/investments', '/dashboard/closing'])
                      ? 'text-flight-blue border-b-2 border-flight-blue pb-1'
                      : 'text-gray-700 hover:text-flight-blue'
                  }`}
                >
                  <span>Planejamento</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${planningDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {planningDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link 
                      href={getDynamicUrl('/dashboard/budgets')}
                      onClick={() => setPlanningDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/budgets') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <Target className="h-4 w-4" />
                      <span>Orçamentos</span>
                    </Link>
                    <Link 
                      href={getDynamicUrl('/dashboard/investments')}
                      onClick={() => setPlanningDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/investments') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Investimentos</span>
                    </Link>
                    <Link 
                      href={getDynamicUrl('/dashboard/closing')}
                      onClick={() => setPlanningDropdownOpen(false)}
                      className={`flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        isActive('/dashboard/closing') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-700'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Fechamento</span>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Sistema de Notificações */}
            {orgUser && organization && (
              <NotificationBell 
                userId={orgUser.id} 
                organizationId={organization.id} 
              />
            )}
            <Link href={getDynamicUrl('/dashboard/config')} className="hidden md:block">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="hidden md:flex text-red-600 hover:bg-red-50 px-3 py-2 text-sm"
            >
              Sair
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

    </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[280px] max-w-[85vw] bg-white shadow-2xl z-[70] md:hidden">
            <div className="flex flex-col h-full">
              {/* Close Button */}
              <div className="flex justify-end p-4 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                {/* Painel Principal */}
                <Link
                  href={getDynamicUrl('/dashboard')}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 transition-colors whitespace-nowrap ${
                    isActive('/dashboard') ? 'bg-flight-blue/5 text-flight-blue border-r-2 border-flight-blue' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">Painel Principal</span>
                </Link>

                {/* Financeiro Section */}
                <div className="border-t border-gray-200 mt-2">
                  <button
                    onClick={() => setMobileFinanceOpen(!mobileFinanceOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <span className="font-medium">Financeiro</span>
                    <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${mobileFinanceOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {mobileFinanceOpen && (
                    <div className="bg-gray-50">
                      <Link
                        href={getDynamicUrl('/dashboard/transactions')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/transactions') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4 flex-shrink-0" />
                        <span>Transações</span>
                      </Link>
                      <Link
                        href={getDynamicUrl('/dashboard/bank-accounts')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/bank-accounts') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Wallet className="h-4 w-4 flex-shrink-0" />
                        <span>Contas Bancárias</span>
                      </Link>
                      <Link
                        href={getDynamicUrl('/dashboard/cards')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/cards') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 flex-shrink-0" />
                        <span>Cartões</span>
                      </Link>
                      <Link
                        href={getDynamicUrl('/dashboard/bills')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/bills') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>Contas a Pagar</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Planejamento Section */}
                <div className="border-t border-gray-200">
                  <button
                    onClick={() => setMobilePlanningOpen(!mobilePlanningOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <span className="font-medium">Planejamento</span>
                    <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${mobilePlanningOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {mobilePlanningOpen && (
                    <div className="bg-gray-50">
                      <Link
                        href={getDynamicUrl('/dashboard/budgets')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/budgets') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Target className="h-4 w-4 flex-shrink-0" />
                        <span>Orçamentos</span>
                      </Link>
                      <Link
                        href={getDynamicUrl('/dashboard/investments')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/investments') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4 flex-shrink-0" />
                        <span>Investimentos</span>
                      </Link>
                      <Link
                        href={getDynamicUrl('/dashboard/closing')}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2 px-4 py-2.5 pl-8 transition-colors whitespace-nowrap ${
                          isActive('/dashboard/closing') ? 'bg-flight-blue/5 text-flight-blue' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span>Fechamento</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 p-4 space-y-2">
                <Link
                  href={getDynamicUrl('/dashboard/config')}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Settings className="h-5 w-5" />
                  <span className="font-medium">Configurações</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
