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
  setShowNotificationModal = () => {}
}) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              <Logo className="h-24 w-24" />
              <div className="ml-0">
                <Link href="/dashboard">
                  <h1 className="text-2xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                    {organization?.name || 'FinTrack'}
                  </h1>
                </Link>
                {pageTitle && (
                  <p className="text-sm text-gray-600">{pageTitle}</p>
                )}
                {!pageTitle && orgUser && (
                  <p className="text-sm text-gray-600">{orgUser.name}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowNotificationModal(true)}
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Link href="/dashboard/config">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
