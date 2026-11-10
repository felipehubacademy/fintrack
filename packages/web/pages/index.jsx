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
  Play,
  Smartphone,
  Users,
  Target,
  Bell,
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import ZulFloatingButton from '../components/ZulFloatingButton';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

      <LandingHeader currentPage="home" />

      {/* ===== HERO — dark gradient, bold, premium ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A1628] via-[#0047CC] to-[#1A6AFF]">
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1A6AFF]/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#F5A623]/15 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-full text-white/90 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 text-[#F5A623]" />
            <span>Assistente financeiro com IA</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-6">
            Suas finanças,{' '}
            <span className="bg-gradient-to-r from-[#F5A623] to-[#FFD080] bg-clip-text text-transparent">
              sob controle total
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/70 leading-relaxed mb-10">
            Registre despesas pelo WhatsApp, acompanhe tudo em tempo real
            e receba insights inteligentes. Simples assim.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/account-type"
              className="group inline-flex items-center px-8 py-4 bg-[#F5A623] hover:bg-[#FFD080] text-gray-900 rounded-2xl text-lg font-bold shadow-2xl shadow-[#F5A623]/30 transition-all duration-300 hover:scale-105"
            >
              <span>Começar Grátis</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300"
            >
              Já tem conta? Entrar
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center space-x-6 text-sm text-white/50 mb-16">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-[#F5A623]" />
              <span>WhatsApp nativo</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-[#F5A623]" />
              <span>Setup em 2 min</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-[#F5A623]" />
              <span>100% gratuito</span>
            </div>
          </div>

          {/* Dashboard Preview — floating over the gradient */}
          <div className="relative max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 bg-white transform hover:scale-[1.01] transition-transform duration-500">
              {/* Browser Chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 bg-white rounded-lg px-3 py-1 text-sm text-gray-400 flex items-center space-x-2">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span>app.meuazulao.com.br/dashboard</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Dashboard</h3>
                    <p className="text-gray-400 text-sm">Visão geral das suas finanças</p>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
                    <img src="/images/logo_flat.svg" alt="Logo" className="w-5 h-5" />
                    <span className="text-sm font-semibold text-blue-900">MeuAzulão</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Entradas</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">R$ 8.500</p>
                    <p className="text-xs text-green-600 mt-1">↑ 12% vs anterior</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Saídas</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">R$ 5.260</p>
                    <p className="text-xs text-red-500 mt-1">↓ 8% vs anterior</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#1A6AFF] to-[#0047CC] rounded-xl p-4 shadow-sm">
                    <span className="text-xs font-medium text-white/70">Saldo</span>
                    <p className="text-2xl font-bold text-white mt-1">R$ 3.240</p>
                    <p className="text-xs text-white/60 mt-1">Positivo este mês</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Gastos por Categoria</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 w-20">Alimentação</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#1A6AFF] h-full rounded-full" style={{width: '75%'}}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-16 text-right">R$ 1.980</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 w-20">Transporte</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#F5A623] h-full rounded-full" style={{width: '45%'}}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-16 text-right">R$ 1.180</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 w-20">Lazer</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{width: '30%'}}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-16 text-right">R$ 790</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ===== FEATURES — clean grid with icons ===== */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Um app completo para sua vida financeira
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'WhatsApp Nativo', desc: 'Registre transações conversando naturalmente com o Zul, como se fosse um amigo.', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: TrendingUp, title: 'Dashboard em Tempo Real', desc: 'Gráficos interativos, resumos automáticos e análises personalizadas dos seus gastos.', color: 'text-[#1A6AFF]', bg: 'bg-blue-50' },
              { icon: Target, title: 'Orçamentos & Metas', desc: 'Defina limites por categoria, acompanhe metas e ganhe badges por conquistas.', color: 'text-[#F5A623]', bg: 'bg-amber-50' },
              { icon: Users, title: 'Gestão Familiar', desc: 'Divida despesas entre membros da família com centros de custo automáticos.', color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: Bell, title: 'Alertas Inteligentes', desc: 'Lembretes de contas, alertas de orçamento e relatório semanal pelo WhatsApp.', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: Shield, title: '100% Seguro', desc: 'Dados protegidos com criptografia. Segurança e privacidade em todas as transações.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ZUL SHOWCASE ===== */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A6AFF]/10 border border-[#1A6AFF]/20 rounded-full text-[#1A6AFF] text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Powered by AI</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Conheça o{' '}
                <span className="bg-gradient-to-r from-[#1A6AFF] to-[#0047CC] bg-clip-text text-transparent">Zul</span>
              </h2>

              <p className="text-lg text-gray-500 leading-relaxed">
                Seu assistente financeiro que entende você.
                Registre transações por texto ou áudio, como se estivesse falando com um amigo.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  { text: 'Conversação natural — fale do seu jeito', color: 'bg-blue-100 text-blue-600' },
                  { text: 'Categorização automática com IA', color: 'bg-amber-100 text-amber-600' },
                  { text: 'Resposta instantânea via WhatsApp', color: 'bg-green-100 text-green-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp Mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1A6AFF] to-[#F5A623] rounded-3xl blur-3xl opacity-15" />

              <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm mx-auto">
                <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-3 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/logo_flat.svg" alt="Zul" className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Zul - MeuAzulão</h3>
                    <p className="text-green-100 text-xs">online</p>
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-[#ECE5DD] min-h-[360px]">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl shadow-sm bg-[#DCF8C6] flex items-center space-x-3 rounded-br-none">
                      <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-end space-x-0.5 h-5">
                          {[2,3,4,3,2,3,4,2].map((h, i) => (
                            <div key={i} className="w-0.5 bg-[#128C7E] rounded-full" style={{height: `${h*4}px`}}></div>
                          ))}
                        </div>
                        <span className="text-xs text-[#128C7E] font-medium">0:03</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%] px-3 py-2.5 rounded-2xl text-sm shadow-sm bg-white text-gray-800 rounded-bl-none leading-relaxed">
                      Anotado! ✅<br/>
                      <strong>R$ 156,58</strong> em <strong>Açougue</strong><br/>
                      <span className="text-gray-500">Crédito • Roxinho</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm bg-[#DCF8C6] text-gray-800 rounded-br-none">
                      Valeu, Zul! 👏
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex space-x-1">
                        {[0, 150, 300].map((d) => (
                          <div key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: `${d}ms`}}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simples assim
            </h2>
            <p className="text-lg text-gray-500">
              3 passos para ter o controle completo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Crie sua conta', desc: 'Cadastro rápido com email. Sem cartão de crédito. Pronto em 2 minutos.' },
              { n: '2', title: 'Conecte o WhatsApp', desc: 'Adicione o número do Zul e comece a conversar. Ele entende tudo.' },
              { n: '3', title: 'Registre e visualize', desc: 'Envie despesas e receitas pelo WhatsApp. Acompanhe tudo no dashboard.' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-[#1A6AFF] to-[#0047CC] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mx-auto mb-5">
                  {step.n}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 bg-gradient-to-br from-[#0A1628] via-[#0047CC] to-[#1A6AFF] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#F5A623]/20 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-lg text-white/60 mb-10">
            Junte-se e transforme a forma como você gerencia suas finanças.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/account-type"
              className="group inline-flex items-center px-8 py-4 bg-[#F5A623] hover:bg-[#FFD080] text-gray-900 rounded-2xl text-lg font-bold shadow-2xl shadow-[#F5A623]/30 transition-all duration-300 hover:scale-105"
            >
              <span>Começar Grátis</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white rounded-2xl text-lg font-semibold hover:bg-white/10 transition-all duration-300"
            >
              Já tem conta? Entrar
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
      <ZulFloatingButton />
    </>
  );
}
