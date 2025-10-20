import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
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
            <Link 
              href="/support" 
              className="text-gray-500 hover:text-flight-blue transition-colors"
            >
              Suporte
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
