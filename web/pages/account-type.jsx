import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, User, Users, ChevronRight } from 'lucide-react';

export default function AccountType() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(null);

  const handleContinue = () => {
    if (selectedType === 'solo') {
      router.push('/create-account');
    } else if (selectedType === 'family') {
      router.push('/create-organization');
    }
  };

  return (
    <>
      <Head>
        <title>Comece a usar o MeuAzulão - MeuAzulão</title>
        <meta name="description" content="Escolha como usar o MeuAzulão" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)] opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        {/* Back to Home */}
        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors z-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </Link>

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-10">
            {/* Logo e Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/logo_flat.svg" 
                  alt="MeuAzulão" 
                  className="w-16 h-16"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Como você quer usar o MeuAzulão?
              </h1>
              <p className="text-gray-600">
                Escolha a opção que melhor se adapta à sua necessidade
              </p>
            </div>

            {/* Opções */}
            <div className="space-y-4 mb-8">
              {/* Opção Solo */}
              <div 
                onClick={() => setSelectedType('solo')}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedType === 'solo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedType === 'solo' ? 'bg-blue-500' : 'bg-gray-100'
                  }`}>
                    <User className={`w-6 h-6 ${
                      selectedType === 'solo' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Uso Individual
                    </h3>
                    <p className="text-sm text-gray-600">
                      Para controle pessoal das suas finanças
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedType === 'solo'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedType === 'solo' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </div>

              {/* Opção Família */}
              <div 
                onClick={() => setSelectedType('family')}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedType === 'family'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedType === 'family' ? 'bg-blue-500' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-6 h-6 ${
                      selectedType === 'family' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      Uso em Família
                    </h3>
                    <p className="text-sm text-gray-600">
                      Para controle compartilhado em família
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedType === 'family'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedType === 'family' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Continuar */}
            <button
              onClick={handleContinue}
              disabled={!selectedType}
              className="w-full bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>Continuar</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Info Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

