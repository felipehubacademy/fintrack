import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import {
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  CreditCard,
  TrendingUp,
  Wallet,
  Target,
  User,
  Plus,
  LayoutDashboard,
  ArrowLeftRight,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Flag
} from 'lucide-react';
import Logo from './Logo';
import Link from 'next/link';
import Image from 'next/image';
import NotificationBell from './NotificationBell';
import { useDynamicUrls } from '../hooks/useDynamicUrls';
import { useOrganization } from '../hooks/useOrganization';
import Avatar from './Avatar';
import ProfileModal from './ProfileModal';
import TransactionModal from './TransactionModal';

const SIDEBAR_EXPANDED_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 80;

export default function Header({
  organization: orgProp,
  user: orgUserProp,
  pageTitle = null,
  children = null
}) {
  const router = useRouter();
  const { getDynamicUrl } = useDynamicUrls();
  const { organization: orgFromHook, user: orgUserFromHook, costCenters } = useOrganization();

  // Usar props se fornecidas, senão usar dados do hook
  const organization = orgProp || orgFromHook;
  const orgUser = orgUserProp || orgUserFromHook;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFinanceOpen, setMobileFinanceOpen] = useState(false);
  const [mobilePlanningOpen, setMobilePlanningOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );

  const settingsRef = useRef(null);

  const userCostCenter = costCenters?.find((cc) => cc.user_id === orgUser?.id);
  const avatarColor = userCostCenter?.color || null;
  const userFirstName = useMemo(() => {
    if (!orgUser?.name) return null;
    return orgUser.name.split(' ')[0];
  }, [orgUser]);

  const navSections = useMemo(() => ([
    {
      id: 'overview',
      title: null,
      items: [
        {
          id: 'dashboard',
          label: 'Painel Principal',
          href: '/dashboard',
          icon: LayoutDashboard
        }
      ]
    },
    {
      id: 'finance',
      title: 'Financeiro',
      items: [
        {
          id: 'transactions',
          label: 'Transações',
          href: '/dashboard/transactions',
          icon: ArrowLeftRight
        },
        {
          id: 'accounts',
          label: 'Contas Bancárias',
          href: '/dashboard/bank-accounts',
          icon: Wallet
        },
        {
          id: 'cards',
          label: 'Cartões de Crédito',
          href: '/dashboard/cards',
          icon: CreditCard
        },
        {
          id: 'bills',
          label: 'Contas a Pagar',
          href: '/dashboard/bills',
          icon: FileText
        }
      ]
    },
    {
      id: 'planning',
      title: 'Planejamento',
      items: [
        {
          id: 'budgets',
          label: 'Orçamento',
          href: '/dashboard/budgets',
          icon: Target
        },
        {
          id: 'insights',
          label: 'Insights',
          href: '/dashboard/insights',
          icon: BarChart3
        },
        {
          id: 'goals',
          label: 'Metas',
          href: '/dashboard/goals',
          icon: Flag
        },
        {
          id: 'investments',
          label: 'Investimentos',
          href: '/dashboard/investments',
          icon: TrendingUp
        },
        {
          id: 'closing',
          label: 'Fechamento',
          href: '/dashboard/closing',
          icon: ClipboardCheck
        }
      ]
    },
    {
      id: 'settings',
      title: null,
      items: [
        {
          id: 'config',
          label: 'Configurações',
          href: '/dashboard/config',
          icon: Settings
        }
      ]
    }
  ]), []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (path) => {
    if (router.pathname.includes('[orgId]') && router.pathname.includes('[userId]')) {
      const pathAfterUser = router.pathname.split('/user/[userId]/')[1] || '';
      const targetPath = path.replace(/^\//, '');

      if (path === '/dashboard') {
        return pathAfterUser === 'dashboard';
      }

      return pathAfterUser === targetPath;
    }
    return router.pathname === path;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fechar dropdown de configurações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determina se o sidebar deve estar expandido (por estado ou hover)
  const isSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    const baseClasses = 'flex items-center rounded-xl py-2.5 pl-[18px] pr-3 text-sm transition-all duration-200';
    const activeClasses = 'bg-flight-blue/10 text-flight-blue font-semibold';
    const inactiveClasses = 'text-gray-600 hover:text-flight-blue hover:bg-flight-blue/5';

    return (
      <Link
        key={item.id}
        href={getDynamicUrl(item.href)}
        className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
        title={!isSidebarExpanded ? item.label : undefined}
      >
        <div className="w-5 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-200 ${!isSidebarExpanded ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
          {item.label}
        </span>
      </Link>
    );
  };

  const sidebarWidth = isDesktop
    ? (isSidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH)
    : 0;

  return (
    <>
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col border-r border-gray-100/80 bg-white shadow-sm transition-all duration-200 ease-in-out"
        style={{ width: `${sidebarWidth}px` }}
        aria-label="Menu principal"
        onMouseEnter={() => isSidebarCollapsed && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', padding: '2px' }}
          className="absolute top-[70px] -right-2.5 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 transition hover:shadow-md hover:border-flight-blue z-10"
          aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isSidebarCollapsed ? <ChevronRight style={{ width: '18px', height: '18px' }} className="text-gray-600" /> : <ChevronLeft style={{ width: '18px', height: '18px' }} className="text-gray-600" />}
        </button>

        <div className="flex h-full w-full flex-col px-3 py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14">
              <Image
                src="/images/logo_flat.svg"
                alt="MeuAzulão"
                width={56}
                height={56}
                className="w-14 h-14"
              />
            </div>
            <div className={`ml-3 flex-1 min-w-0 overflow-hidden transition-all duration-200 ${!isSidebarExpanded ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
              <p className="text-sm font-semibold text-deep-sky truncate whitespace-nowrap">
                    {organization?.name || 'MeuAzulão'}
                  </p>
                  {orgUser && (
                <p className="text-xs text-gray-500 truncate whitespace-nowrap">
                      Olá, {userFirstName || orgUser.name}
                    </p>
                  )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowTransactionModal(true)}
              className="flex items-center rounded-2xl h-10 w-full bg-flight-blue text-white hover:bg-flight-blue/90 shadow-md hover:shadow-lg transition-colors duration-200 py-2.5 pl-[18px] pr-3"
              title={!isSidebarExpanded ? 'Nova Despesa' : undefined}
            >
              <div className="w-5 flex items-center justify-center flex-shrink-0">
              <Plus className="h-5 w-5" />
              </div>
              <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${!isSidebarExpanded ? 'opacity-0 w-0 ml-0' : 'opacity-100'}`}>
                Nova Despesa
              </span>
            </button>
          </div>

          <nav className="mt-6 flex-1 overflow-y-auto scrollbar-thin">
            <div className="flex flex-col gap-6">
              {navSections.map((section) => (
                <div key={section.id}>
                  {section.title && (
                    <div className="h-5 flex items-center mb-3">
                      <div className={`px-3 overflow-hidden transition-all duration-200 ${!isSidebarExpanded ? 'opacity-0 w-0' : 'opacity-100 w-full'}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                      {section.title}
                    </p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {section.items.map(renderNavItem)}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="mt-auto pt-6 text-center">
            <p className={`text-xs text-gray-400 leading-relaxed px-2 transition-all duration-200 ${!isSidebarExpanded ? 'h-0 overflow-hidden opacity-0' : 'opacity-100'}`}>
              © 2025 MeuAzulão.<br />
              Todos os direitos reservados.
            </p>
          </div>
        </div>
      </aside>

      <div
        className="min-h-screen bg-white flex flex-col transition-[padding-left] duration-200 ease-in-out"
        style={{ paddingLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur">
          <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="flex h-16 items-center gap-3">
              <div className="flex flex-1 items-center gap-3 lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden min-h-[44px] min-w-[44px]"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

              {(pageTitle || organization) && (
                <div className="flex flex-col">
                  {pageTitle && <h1 className="text-base font-semibold text-gray-900 sm:text-lg">{pageTitle}</h1>}
                  {!pageTitle && organization && (
                    <span className="text-sm font-medium text-gray-700">
                      {organization?.name || 'MeuAzulão'}
                    </span>
                  )}
                </div>
              )}
            </div>

              <div className="ml-auto flex items-center gap-3">
                {orgUser && organization && (
                  <NotificationBell
                    userId={orgUser.id}
                    organizationId={organization.id}
                  />
                )}

                {orgUser && (
                  <div className="relative hidden md:block" ref={settingsRef}>
                    <button
                      onClick={() => setSettingsDropdownOpen((prev) => !prev)}
                      className="flex items-center gap-2 rounded-full border border-transparent px-2 py-1.5 transition-colors hover:border-gray-200 hover:bg-gray-50"
                    >
                      <Avatar
                        src={orgUser.avatar_url}
                        name={orgUser.name}
                        size="sm"
                        color={avatarColor}
                      />
                      <Settings className="h-4 w-4 text-gray-500" />
                    </button>

                    {settingsDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-gray-100 bg-white shadow-xl">
                        <div className="border-b border-gray-100 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={orgUser.avatar_url}
                              name={orgUser.name}
                              size="md"
                              color={avatarColor}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{orgUser.name}</p>
                              <p className="truncate text-xs text-gray-500">{orgUser.email}</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setSettingsDropdownOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <User className="h-4 w-4" />
                          <span>Meu Perfil</span>
                        </button>

                        <Link
                          href={getDynamicUrl('/dashboard/config')}
                          onClick={() => setSettingsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configurações</span>
                        </Link>

                        <div className="border-t border-gray-100 px-4 py-3">
                          <button
                            onClick={() => {
                              setSettingsDropdownOpen(false);
                              handleLogout();
                            }}
                            className="flex w-full items-center gap-3 text-sm text-red-600 transition-colors hover:text-red-700"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Sair</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {orgUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden min-h-[44px] min-w-[44px]"
                    onClick={() => setShowProfileModal(true)}
                  >
                    <Avatar
                      src={orgUser.avatar_url}
                      name={orgUser.name}
                      size="sm"
                      color={avatarColor}
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col bg-white">
          {children}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[85vw] bg-white shadow-2xl md:hidden">
            <div className="flex h-full flex-col">
              <div className="border-b border-gray-100 px-4 pb-4 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Logo className="h-12 w-12" />
                    <div>
                      <p className="text-sm font-semibold text-deep-sky">
                        {organization?.name || 'MeuAzulão'}
                      </p>
                      {orgUser && (
                        <p className="text-xs text-gray-500">{orgUser.name}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <Button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-flight-blue text-white shadow-md hover:bg-flight-blue/90"
                  onClick={() => {
                    setShowTransactionModal(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm font-semibold">Adicionar Transação</span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {navSections.map((section) => (
                  <div key={section.id} className="mb-4 space-y-2">
                    {section.title && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {section.title}
                      </p>
                    )}
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.id}
                          href={getDynamicUrl(item.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                            flex items-center gap-3 rounded-xl px-3 py-2 text-sm
                            ${isActive(item.href)
                              ? 'bg-flight-blue/10 text-flight-blue font-medium'
                              : 'text-gray-600 hover:bg-gray-50'}
                          `}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-4 py-4 space-y-2">
                <Link
                  href={getDynamicUrl('/dashboard/config')}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {orgUser && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => setShowTransactionModal(false)}
      />
    </>
  );
}
