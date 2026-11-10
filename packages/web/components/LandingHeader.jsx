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

  const isTransparent = !isScrolled && currentPage === 'home';
  const linkColor = isTransparent
    ? 'text-white/80 hover:text-white'
    : 'text-gray-600 hover:text-gray-900';

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-500 ${
      isTransparent
        ? 'bg-transparent'
        : 'bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <img
              src="/images/logo_flat.svg"
              alt="MeuAzulão"
              className={`h-16 w-16 transition-transform group-hover:scale-110 group-hover:rotate-3 ${isTransparent ? 'brightness-0 invert' : ''}`}
            />
            <span className={`text-2xl font-bold transition-colors ${
              isTransparent
                ? 'text-white'
                : 'bg-gradient-to-r from-[#0047CC] to-[#1A6AFF] bg-clip-text text-transparent'
            }`}>
              MeuAzulão
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {currentPage === 'home' && (
              <>
                <a href="#features" className={`transition-colors text-sm font-medium ${linkColor}`}>
                  Funcionalidades
                </a>
                <a href="#how-it-works" className={`transition-colors text-sm font-medium ${linkColor}`}>
                  Como Funciona
                </a>
              </>
            )}
            {(currentPage === 'privacy' || currentPage === 'terms' || currentPage === 'help' || currentPage === 'contact') && (
              <Link href="/" className={`transition-colors text-sm font-medium ${linkColor}`}>
                Home
              </Link>
            )}
            <Link
              href="/help"
              className={`transition-colors text-sm font-medium ${
                currentPage === 'help'
                  ? (isTransparent ? 'text-white font-semibold' : 'text-[#1A6AFF] font-semibold')
                  : linkColor
              }`}
            >
              Ajuda
            </Link>
            <Link
              href="/contact"
              className={`transition-colors text-sm font-medium ${
                currentPage === 'contact'
                  ? (isTransparent ? 'text-white font-semibold' : 'text-[#1A6AFF] font-semibold')
                  : linkColor
              }`}
            >
              Contato
            </Link>
            <Link href="/login" className={`transition-colors text-sm font-medium ${linkColor}`}>
              Entrar
            </Link>
            {currentPage === 'home' && (
              <Link
                href="/account-type"
                className={`relative inline-flex items-center px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 ${
                  isTransparent
                    ? 'bg-[#F5A623] hover:bg-[#FFD080] text-gray-900 shadow-lg shadow-[#F5A623]/30'
                    : 'bg-gradient-to-r from-[#1A6AFF] to-[#0047CC] text-white shadow-lg shadow-blue-500/30'
                }`}
              >
                Começar Agora
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center space-x-3">
            <Link
              href="/login"
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                isTransparent
                  ? 'bg-[#F5A623] text-gray-900 shadow-lg shadow-[#F5A623]/30'
                  : 'bg-gradient-to-r from-[#1A6AFF] to-[#0047CC] text-white shadow-lg shadow-blue-500/30'
              }`}
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
