import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function LandingHeader({ currentPage = 'home' }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-500 ${
      isScrolled || currentPage !== 'home'
        ? 'bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <img 
              src="/images/logo_flat.svg" 
              alt="MeuAzulão" 
              className="h-16 w-16 transition-transform group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-[#0D2C66] to-[#207DFF] bg-clip-text text-transparent">
              MeuAzulão
            </span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {currentPage === 'home' && (
              <>
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                  Funcionalidades
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                  Como Funciona
                </a>
              </>
            )}
            {(currentPage === 'privacy' || currentPage === 'terms' || currentPage === 'help' || currentPage === 'contact') && (
              <Link 
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
              >
                Home
              </Link>
            )}
            <Link 
              href="/help" 
              className={`transition-colors text-sm font-medium ${
                currentPage === 'help' 
                  ? 'text-[#207DFF] font-semibold' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ajuda
            </Link>
            <Link 
              href="/contact" 
              className={`transition-colors text-sm font-medium ${
                currentPage === 'contact' 
                  ? 'text-[#207DFF] font-semibold' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Contato
            </Link>
            <Link 
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              Entrar
            </Link>
            {currentPage === 'home' && (
              <Link 
                href="/account-type"
                className="relative inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-full text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
              >
                Começar Agora
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center space-x-3">
            <Link 
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-full text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
