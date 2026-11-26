import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  Users,
  LayoutDashboard,
  LogOut,
  Languages,
  Sparkles,
} from 'lucide-react';
import { zulChatLink } from '@fintrack/shared/config';
import { pricesFor } from '@fintrack/shared/billing';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { useI18n } from '../contexts/I18nContext';
import PlanPrices from '../components/billing/PlanPrices';

const DIFFERENTIATORS = [
  { key: 'understands', icon: CheckCircle },
  { key: 'noBank', icon: ShieldCheck },
  { key: 'cards', icon: CreditCard },
  { key: 'couples', icon: Users },
  { key: 'trial', icon: LayoutDashboard },
  { key: 'cancel', icon: LogOut },
  { key: 'languages', icon: Languages },
];

function ChatBubble({ from, children }) {
  const isUser = from === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm ${
          isUser ? 'rounded-br-md bg-[#D9FDD3] text-gray-900' : 'rounded-bl-md bg-white text-gray-900'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ChatDemo() {
  const { t, formatMoney } = useI18n();
  return (
    <div className="mx-auto w-full max-w-sm rounded-[28px] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur">
      <div className="overflow-hidden rounded-[22px] bg-[#EFEAE2]">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <img src="/images/logo_flat.svg" alt="" className="h-6 w-6 brightness-0 invert" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Zul</p>
            <p className="text-xs text-white/70">{t('web.landing.demo.online')}</p>
          </div>
        </div>
        <div className="space-y-2 px-3 py-4 text-left">
          <ChatBubble from="user">{t('web.landing.demo.user1')}</ChatBubble>
          <ChatBubble from="zul">{t('web.landing.demo.zul1', { amount: formatMoney(35) })}</ChatBubble>
          <ChatBubble from="user">{t('web.landing.demo.user2')}</ChatBubble>
          <ChatBubble from="zul">{t('web.landing.demo.zul2', { amount: formatMoney(45) })}</ChatBubble>
          <ChatBubble from="user">{t('web.landing.demo.user3')}</ChatBubble>
          <ChatBubble from="zul">{t('web.landing.demo.zul3', { amount: formatMoney(300) })}</ChatBubble>
        </div>
      </div>
    </div>
  );
}

function WhatsAppCta({ label, className = '' }) {
  const { t } = useI18n();
  return (
    <a
      href={zulChatLink(t('web.zul.greeting'))}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-500 ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
      {label}
    </a>
  );
}

const PLAN_INCLUDES = ['include1', 'include2', 'include3', 'include4'];

function PricingSection() {
  const { t, currency } = useI18n();
  const prices = pricesFor(currency);
  return (
    <section id="pricing" className="bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="mb-3 text-3xl font-bold text-ink-900 sm:text-4xl">{t('web.landing.pricing.title')}</h2>
          <p className="text-lg text-ink-500">{t('web.landing.pricing.subtitle')}</p>
        </div>
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-500">
            <Sparkles className="h-4 w-4" />
            {t('web.billing.trialNoCard')}
          </span>
        </div>
        <PlanPrices currency={prices.currency} />
        <ul className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          {PLAN_INCLUDES.map((key) => (
            <li key={key} className="flex items-start gap-2 text-ink-900">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-positive" />
              <span>{t(`web.landing.pricing.${key}`)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <WhatsAppCta label={t('web.landing.pricing.cta')} />
          <p className="mt-4 text-sm text-ink-500">{t('web.billing.cancelAnytime')}</p>
          <p className="mt-2 text-xs text-ink-500">{t('web.landing.pricing.note', { currency: prices.currency })}</p>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { t, formatMoney, currency } = useI18n();
  const prices = pricesFor(currency);
  const monthlyPrice = formatMoney(prices.monthly, { currency: prices.currency });

  return (
    <>
      <LandingHeader currentPage="home" />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0A1628] via-[#0B3BB8] to-brand-500">
          <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-500/30 blur-[120px]" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:grid-cols-2 lg:px-8 lg:pb-24">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90">
                <Sparkles className="h-4 w-4 text-[#FDB022]" />
                <span>{t('web.landing.trialBadge')}</span>
              </div>
              <h1 className="mb-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t('web.landing.heroTitle')}
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-lg text-white/85 sm:text-xl lg:mx-0">
                {t('web.landing.heroSubtitle')}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <WhatsAppCta label={t('web.landing.ctaPrimary')} className="w-full sm:w-auto" />
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/20 sm:w-auto"
                >
                  {t('web.landing.ctaSecondary')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/70">{t('web.landing.ctaNote')}</p>
            </div>
            <ChatDemo />
          </div>
        </section>

        {/* Differentiators */}
        <section id="features" className="bg-surface py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-3 text-3xl font-bold text-ink-900 sm:text-4xl">{t('web.landing.featuresTitle')}</h2>
              <p className="text-lg text-ink-500">{t('web.landing.featuresSubtitle')}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DIFFERENTIATORS.map(({ key, icon: Icon }) => (
                <li key={key} className="rounded-xl border border-gray-100 bg-surface-2 p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-500" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold text-ink-900">{t(`web.landing.diff.${key}.title`)}</h3>
                  <p className="text-ink-500">{t(`web.landing.diff.${key}.body`, { monthly: monthlyPrice })}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-surface-2 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center text-3xl font-bold text-ink-900 sm:text-4xl">{t('web.landing.howTitle')}</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <li key={n} className="rounded-xl bg-surface p-6 shadow-sm">
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{n}</span>
                  <h3 className="mb-1.5 text-lg font-semibold text-ink-900">{t(`web.landing.how${n}Title`)}</h3>
                  <p className="text-ink-500">{t(`web.landing.how${n}Body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <PricingSection />

        {/* Final call to action */}
        <section className="bg-brand-500 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">{t('web.landing.finalTitle')}</h2>
            <p className="mb-8 text-lg text-white/85">{t('web.landing.finalBody')}</p>
            <WhatsAppCta label={t('web.landing.ctaPrimary')} />
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
