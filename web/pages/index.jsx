import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  ArrowRight,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Mic,
  Play
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <Head>
        <title>MeuAzulão - Controle Financeiro Inteligente via WhatsApp</title>
        <meta name="description" content="Transforme a forma como você gerencia suas finanças. Converse naturalmente com Zul pelo WhatsApp e tenha controle total em tempo real." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="MeuAzulão - Controle Financeiro Inteligente" />
        <meta property="og:description" content="Transforme a forma como você gerencia suas finanças. Converse naturalmente com Zul pelo WhatsApp." />
        <meta property="og:type" content="website" />
      </Head>

      {/* Cursor Glow Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 transition duration-300"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(32, 125, 255, 0.08), transparent 80%)`
        }}
      />

      {/* Navigation */}
      <LandingHeader currentPage="home" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="space-y-8">
            {/* Headline */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="block text-gray-900">
                Suas finanças,
              </span>
              <span className="block bg-gradient-to-r from-[#207DFF] via-[#0D2C66] to-[#207DFF] bg-clip-text text-transparent animate-gradient">
                sob controle total
              </span>
            </h1>

            {/* Subheadline */}
            <p className="max-w-3xl mx-auto text-2xl md:text-3xl text-gray-600 leading-relaxed font-light">
              Registre suas despesas, recebimentos e muito mais naturalmente pelo WhatsApp. 
              Visualize tudo em tempo real, receba resumos inteligentes e avisos sobre suas finanças no dashboard mais moderno do mercado.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                href="/account-type"
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-2xl text-lg font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105"
              >
                <span>Começar Agora</span>
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center space-x-8 pt-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Integração WhatsApp</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Setup em 2 minutos</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Suporte dedicado</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent h-40 bottom-0 z-10 pointer-events-none" />
            
            {/* Dashboard Mockup */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-white transform hover:scale-[1.02] transition-transform duration-500">
              {/* Browser Chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center space-x-2">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-sm text-gray-500 flex items-center space-x-2">
                  <Shield className="w-3 h-3 text-green-600" />
                  <span>app.meuazulao.com.br/dashboard</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
          <div>
                    <h3 className="text-2xl font-bold text-gray-900">Dashboard</h3>
                    <p className="text-gray-500 text-sm">Visão geral das suas finanças</p>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
                    <img 
                      src="/images/logo_flat.svg" 
                      alt="Logo" 
                      className="w-6 h-6"
                    />
                    <span className="text-sm font-semibold text-blue-900">MeuAzulão</span>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Card 1 */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Total do Mês</span>
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">R$ 3.240</p>
                    <p className="text-sm text-green-600 mt-2">↓ 8% vs mês anterior</p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Categorias</span>
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-500 mt-2">Organizadas automaticamente</p>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Economia</span>
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">R$ 420</p>
                    <p className="text-sm text-green-600 mt-2">↑ 15% de economia</p>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-gray-900">Gastos por Categoria</h4>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">7 dias</button>
                      <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">30 dias</button>
                    </div>
                  </div>
                  
                  {/* Mini Bar Chart */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-600 w-24">Alimentação</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full" style={{width: '75%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">R$ 980</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-600 w-24">Transporte</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full" style={{width: '45%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">R$ 580</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-600 w-24">Lazer</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full" style={{width: '30%'}}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-20 text-right">R$ 390</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Integration Badge */}
                <div className="mt-6 flex items-center justify-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Sincronizado com WhatsApp em tempo real
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Feito para você
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Funcionalidades pensadas para tornar sua vida financeira mais simples
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 bg-gradient-to-br from-blue-50 to-white rounded-3xl border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  WhatsApp Nativo
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Converse naturalmente com o Zul. Sem apps extras, sem complicação. 
                  Registre transações como se estivesse falando com um amigo.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 bg-gradient-to-br from-purple-50 to-white rounded-3xl border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Dashboard Inteligente
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Visualize seus gastos e receitas em tempo real com gráficos interativos, 
                  resumos automáticos, avisos sobre vencimentos e análises personalizadas.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 bg-gradient-to-br from-green-50 to-white rounded-3xl border border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  100% Seguro
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Seus dados protegidos com criptografia de ponta. 
                  Segurança e privacidade garantidas em todas as transações.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zul Assistant Showcase */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Powered by AI</span>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900">
                Conheça o <span className="bg-gradient-to-r from-[#207DFF] to-[#0D2C66] bg-clip-text text-transparent">Zul</span>
              </h2>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Seu assistente financeiro pessoal que entende você. 
                Registre transações conversando naturalmente, como se estivesse falando com um amigo.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Conversação Natural</h4>
                    <p className="text-gray-600">Fale do seu jeito, o Zul entende tudo</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Categorização Automática</h4>
                    <p className="text-gray-600">IA organiza suas despesas automaticamente</p>
          </div>
        </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Resposta Instantânea</h4>
                    <p className="text-gray-600">Confirmação em segundos via WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - WhatsApp Mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-3xl blur-3xl opacity-20 animate-pulse-glow" />
              
              <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm mx-auto">
                {/* WhatsApp Header */}
                <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-3 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <img 
                      src="/images/logo_flat.svg" 
                      alt="Zul" 
                      className="w-12 h-12"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Zul - MeuAzulão</h3>
                    <p className="text-green-100 text-xs">online</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-3 bg-[#ECE5DD] min-h-[400px]">
                  {/* User Message - Audio */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl shadow-md bg-gradient-to-br from-[#DCF8C6] to-[#D1F4CC] flex items-center space-x-3 rounded-br-none">
                      <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                      </div>
                      <div className="flex-1 flex items-center space-x-2">
                        {/* Audio Waveform */}
                        <div className="flex items-end space-x-0.5 h-5">
                          <div className="w-0.5 h-2 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-3 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-4 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-3 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-2 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-3 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-4 bg-[#128C7E] rounded-full"></div>
                          <div className="w-0.5 h-2 bg-[#128C7E] rounded-full"></div>
                        </div>
                        <span className="text-xs text-[#128C7E] font-medium whitespace-nowrap">0:03</span>
                      </div>
                    </div>
                  </div>

                  {/* Zul Confirmation */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-white text-gray-800 rounded-bl-none">
                      Anotado! ✅<br/>
                      <strong>R$ 156,58</strong> em <strong>Açougue</strong><br/>
                      Crédito • Roxinho
                    </div>
                  </div>

                  {/* User Message - Text follow-up */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-md bg-gradient-to-br from-[#DCF8C6] to-[#D1F4CC] text-gray-800 rounded-br-none">
                      Valeu, Zul! 👏
                    </div>
                  </div>

                  {/* Typing Indicator */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Simples assim
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              3 passos para ter o controle completo das suas finanças
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                1
              </div>
              <div className="pt-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Crie sua conta
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Cadastro rápido com email. Sem cartão de crédito, 
                  sem complicação. Pronto em 2 minutos.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                2
              </div>
              <div className="pt-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Conecte o WhatsApp
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Adicione o número do Zul e comece a conversar. 
                  Ele entende tudo que você fala.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                3
              </div>
              <div className="pt-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Registre e visualize
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Envie despesas, recebimentos e consultas pelo WhatsApp. 
                  Receba resumos inteligentes, avisos sobre vencimentos e análises completas 
                  no dashboard em tempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-[#0D2C66] via-[#207DFF] to-[#0D2C66] bg-[length:200%_200%] animate-gradient relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Pronto para começar?
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-12 font-light">
            Transforme a forma como você gerencia suas finanças individuais ou familiares. 
            Registre despesas e recebimentos, receba resumos inteligentes e avisos automáticos 
            sobre suas finanças, tudo pelo WhatsApp e visualizado no dashboard.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/account-type"
              className="group inline-flex items-center px-8 py-4 bg-white text-[#0D2C66] rounded-2xl text-lg font-semibold shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105"
          >
              <span>Começar Agora</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
            <Link 
              href="/login"
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-2xl text-lg font-semibold hover:bg-white hover:text-[#0D2C66] transition-all duration-300"
            >
              Já tem conta? Entrar
            </Link>
          </div>
        </div>
      </section>


      {/* Footer */}
      <LandingFooter />

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </>
  );
}
