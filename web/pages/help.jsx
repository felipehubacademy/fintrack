import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Search
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      id: 1,
      category: 'Geral',
      question: 'O que é o MeuAzulão?',
      answer: 'O MeuAzulão é uma plataforma de controle financeiro que permite registrar despesas, recebimentos e muito mais através do WhatsApp. Você conversa naturalmente com o Zul, nosso assistente financeiro, e tudo é registrado automaticamente no dashboard.'
    },
    {
      id: 2,
      category: 'Geral',
      question: 'Como funciona o registro de transações?',
      answer: 'Basta enviar uma mensagem para o Zul pelo WhatsApp com a informação da sua transação. Por exemplo: "Gastei R$ 150 no mercado" ou "Recebi R$ 500 de comissão". O Zul entende naturalmente e registra tudo automaticamente. Você também pode enviar mensagens de áudio!'
    },
    {
      id: 3,
      category: 'Geral',
      question: 'O Zul funciona com mensagens de áudio?',
      answer: 'Sim! O Zul transcreve mensagens de áudio automaticamente usando inteligência artificial. Você pode falar naturalmente e o Zul entenderá e processará sua transação.'
    },
    {
      id: 4,
      category: 'Conta',
      question: 'Como criar uma conta?',
      answer: 'Clique em "Começar Agora" na página inicial, escolha o tipo de conta (individual ou compartilhada), preencha seus dados e confirme seu e-mail. Todo o processo leva menos de 2 minutos.'
    },
    {
      id: 5,
      category: 'Conta',
      question: 'Posso usar a mesma conta para múltiplas pessoas?',
      answer: 'Sim! Você pode criar uma organização compartilhada e convidar membros da família. Todos podem registrar transações e visualizar as finanças em conjunto.'
    },
    {
      id: 6,
      category: 'WhatsApp',
      question: 'Como conectar meu WhatsApp?',
      answer: 'Após criar sua conta, você receberá um código de verificação por SMS. Digite o código no painel de onboarding e seu WhatsApp estará conectado. O número do Zul será adicionado automaticamente aos seus contatos.'
    },
    {
      id: 7,
      category: 'WhatsApp',
      question: 'Posso usar o Zul em grupos do WhatsApp?',
      answer: 'Atualmente o Zul funciona apenas em conversas individuais. Cada membro da organização precisa conversar com o Zul diretamente para registrar transações.'
    },
    {
      id: 8,
      category: 'Transações',
      question: 'Como editar ou excluir uma transação?',
      answer: 'Para editar ou excluir transações, acesse o painel web do MeuAzulão pelo navegador. Lá você encontra todas as suas transações e pode gerenciá-las facilmente. O Zul pelo WhatsApp é focado em registrar novas transações.'
    },
    {
      id: 9,
      category: 'Transações',
      question: 'Como consultar resumos de gastos?',
      answer: 'Você pode perguntar ao Zul pelo WhatsApp: "Quanto gastei este mês?", "Quanto gastei de alimentação?", "Qual meu saldo?" etc. O Zul responderá com os resumos solicitados.'
    },
    {
      id: 10,
      category: 'Transações',
      question: 'Como registrar compras parceladas?',
      answer: 'Basta mencionar o número de parcelas ao registrar. Por exemplo: "Comprei uma TV de R$ 1500 em 5x no crédito Latam". O Zul criará automaticamente todas as parcelas.'
    },
    {
      id: 11,
      category: 'Segurança',
      question: 'Meus dados estão seguros?',
      answer: 'Sim! Utilizamos criptografia de ponta a ponta e seguimos todas as normas da LGPD. Seus dados financeiros são protegidos e nunca compartilhamos informações sensíveis sem sua autorização.'
    },
    {
      id: 12,
      category: 'Segurança',
      question: 'O MeuAzulão é gratuito?',
      answer: 'Oferecemos um período de teste gratuito. Após isso, temos planos acessíveis para uso individual e familiar. Consulte nossa página de preços para mais detalhes.'
    },
    {
      id: 13,
      category: 'Dashboard',
      question: 'O que posso ver no dashboard?',
      answer: 'No dashboard você visualiza gráficos interativos dos seus gastos e receitas, resumos por categoria, saldos de contas, avisos de vencimentos, análises de orçamento e muito mais.'
    },
    {
      id: 14,
      category: 'Dashboard',
      question: 'Posso exportar meus dados?',
      answer: 'Sim! No dashboard você pode exportar seus dados em formato CSV ou PDF para análise externa ou backup.'
    }
  ];

  const categories = ['Todos', 'Geral', 'Conta', 'WhatsApp', 'Transações', 'Segurança', 'Dashboard'];

  const filteredFaqs = searchQuery
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const groupedFaqs = categories.reduce((acc, category) => {
    if (category === 'Todos') return acc;
    acc[category] = filteredFaqs.filter(faq => faq.category === category);
    return acc;
  }, {});

  return (
    <>
      <Head>
        <title>Central de Ajuda - MeuAzulão</title>
        <meta name="description" content="Encontre respostas para suas dúvidas sobre o MeuAzulão" />
      </Head>

      {/* Navigation */}
      <LandingHeader currentPage="help" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4" />
            <span>Central de Ajuda</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Como podemos ajudar?
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 font-light">
            Encontre respostas rápidas para suas dúvidas ou entre em contato conosco
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar perguntas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#207DFF] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {categories.filter(cat => cat !== 'Todos').map(category => {
            const categoryFaqs = groupedFaqs[category] || [];
            if (categoryFaqs.length === 0) return null;

            return (
              <div key={category} className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {category}
                </h2>
                
                <div className="space-y-4">
                  {categoryFaqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#207DFF] transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                      >
                        <span className="text-lg font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {openFaq === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-[#207DFF] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      
                      {openFaq === faq.id && (
                        <div className="px-6 pb-4">
                          <div className="pt-4 border-t border-gray-100">
                            <p className="text-gray-600 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">
                Nenhuma pergunta encontrada para "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#207DFF] hover:text-[#0D2C66] font-semibold"
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ainda precisa de ajuda?
          </h2>
          <p className="text-xl text-gray-600 mb-8 font-light">
            Entre em contato conosco e nossa equipe responderá o mais rápido possível
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-2xl text-lg font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105"
          >
            <span>Entrar em Contato</span>
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </>
  );
}
