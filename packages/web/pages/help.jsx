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
import { useI18n } from '../contexts/I18nContext';
import { EARLY_ACCESS_END } from '@fintrack/shared/config';

export default function HelpPage() {
  const { t, formatDate } = useI18n();
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      id: 1,
      category: 'Geral',
      question: t('web.help.whatIsMeuazulao'),
      answer: t('web.help.meuazulaoIsABudgetApp')
    },
    {
      id: 2,
      category: 'Geral',
      question: t('web.help.howDoILogA'),
      answer: t('web.help.justTextZulOnWhatsapp')
    },
    {
      id: 3,
      category: 'Geral',
      question: t('web.help.doesZulUnderstandVoiceNotes'),
      answer: t('web.help.yesZulTranscribesVoiceNotes')
    },
    {
      id: 4,
      category: 'Conta',
      question: t('web.help.howDoISignUp'),
      answer: t('web.help.tapOpenDashboardOnThe')
    },
    {
      id: 5,
      category: 'Conta',
      question: t('web.help.canMoreThanOnePerson'),
      answer: t('web.help.yesCreateASharedHousehold')
    },
    {
      id: 6,
      category: 'WhatsApp',
      question: t('web.help.howDoIConnectMy'),
      answer: t('web.help.afterYouSignUpWe')
    },
    {
      id: 7,
      category: 'WhatsApp',
      question: t('web.help.canIUseZulIn'),
      answer: t('web.help.notYetZulWorksIn')
    },
    {
      id: 8,
      category: 'Transações',
      question: t('web.help.howDoIEditOr'),
      answer: t('web.help.replyToZulWithA')
    },
    {
      id: 9,
      category: 'Transações',
      question: t('web.help.howDoISeeA'),
      answer: t('web.help.askZulOnWhatsappHow')
    },
    {
      id: 10,
      category: 'Transações',
      question: t('web.help.howDoILogInstallment'),
      answer: t('web.help.justMentionTheInstallmentsFor')
    },
    {
      id: 11,
      category: 'Segurança',
      question: t('web.help.isMyDataSafe'),
      answer: t('web.help.yesYourDataIsEncrypted')
    },
    {
      id: 12,
      category: 'Segurança',
      question: t('web.help.isMeuazulaoFree'),
      answer: t('web.help.yesDuringEarlyAccessEverything', { date: formatDate(EARLY_ACCESS_END, 'long') })
    },
    {
      id: 13,
      category: 'Dashboard',
      question: t('web.help.whatCanISeeIn'),
      answer: t('web.help.howMuchYouCanSpend')
    },
    {
      id: 14,
      category: 'Dashboard',
      question: t('web.help.canIExportMyData'),
      answer: t('web.help.ifYouNeedACopy')
    }
  ];

  const categories = [t('web.shared.all2'), 'Geral', t('web.help.account'), 'WhatsApp', t('web.shared.transactions'), t('web.help.security'), 'Dashboard'];

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
        <title>{t('web.help.helpCenterMeuazulao')}</title>
        <meta name="description" content="Encontre respostas para suas dúvidas sobre o MeuAzulão" />
      </Head>

      {/* Navigation */}
      <LandingHeader currentPage="help" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4" />
            <span>{t('web.help.helpCenter')}</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('web.help.howCanWeHelp')}
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 font-light">
            {t('web.help.quickAnswersToCommonQuestions')}
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('web.help.searchQuestions')}
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
                {t('web.help.noQuestionsFoundFor', { searchQuery })}
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#207DFF] hover:text-[#0D2C66] font-semibold"
              >
                {t('web.help.clearSearch')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('web.help.stillNeedHelp')}
          </h2>
          <p className="text-xl text-gray-600 mb-8 font-light">
            {t('web.help.getInTouchAndWe')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] text-white rounded-2xl text-lg font-semibold shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/60 transition-all duration-300 hover:scale-105"
          >
            <span>{t('web.help.contactUs')}</span>
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

    </>
  );
}
