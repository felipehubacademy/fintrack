import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-6 group">
              <img 
                src="/images/logo_flat.svg" 
                alt="MeuAzulão" 
                className="h-16 w-16 group-hover:scale-110 transition-transform"
              />
              <div>
                <span className="text-2xl font-bold text-white block">MeuAzulão</span>
                <span className="text-sm text-gray-400">Controle Financeiro Inteligente</span>
              </div>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
              Transforme a forma como você gerencia suas finanças. 
              Converse naturalmente com o Zul pelo WhatsApp e tenha controle total em tempo real.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Como Funciona</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Suporte</h3>
            <ul className="space-y-3">
              <li><Link href="/help" className="hover:text-white transition-colors">Central de Ajuda</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contato</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Termos de Serviço</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>© {new Date().getFullYear()} MeuAzulão - Gestão Financeira Familiar. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
