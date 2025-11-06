import { useState, useEffect } from 'react';
import Link from 'next/link';
import SupportModal from './SupportModal';
import { supabase } from '../lib/supabaseClient';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Tentar buscar dados do usuário se estiver logado (sem quebrar se não houver)
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUserEmail(authUser.email || '');
          
          // Buscar nome do usuário na tabela users
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (userData) {
            setUserName(userData.name || '');
            if (userData.email) {
              setUserEmail(userData.email);
            }
          }
        }
      } catch (error) {
        // Silenciosamente falhar se não houver usuário autenticado
        console.log('Footer: Usuário não autenticado ou erro ao buscar dados');
      }
    }
    
    fetchUserData();
  }, []);

  return (
    <>
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-12">
        <div className="px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-2">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-1 sm:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-600">
              © {currentYear} MeuAzulão. Todos os direitos reservados.
            </div>
            
            {/* Links */}
            <div className="flex items-center space-x-6 text-sm">
              <Link 
                href="/privacy" 
                className="text-gray-500 hover:text-flight-blue transition-colors"
              >
                Política de Privacidade
              </Link>
              <Link 
                href="/terms" 
                className="text-gray-500 hover:text-flight-blue transition-colors"
              >
                Termos de Uso
              </Link>
              <button
                onClick={() => setShowSupportModal(true)}
                className="text-gray-500 hover:text-flight-blue transition-colors cursor-pointer"
              >
                Suporte
              </button>
            </div>
          </div>
        </div>
      </footer>

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        userEmail={userEmail}
        userName={userName}
      />
    </>
  );
}
