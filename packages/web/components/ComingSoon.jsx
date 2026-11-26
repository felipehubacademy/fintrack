import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import Header from './Header';
import { WhatsAppButton } from './ZulHint';
import { useI18n } from '../contexts/I18nContext';

// Friendly page for features switched off by a launch flag
// (isFeatureEnabled in @fintrack/shared/config).
export default function ComingSoon({ title }) {
  const { t } = useI18n();
  return (
    <Header pageTitle={title}>
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Sparkles className="h-7 w-7 text-brand-500" />
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-500">{t('web.comingSoon.badge')}</p>
          <h1 className="mb-3 text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mb-6 text-ink-500">{t('web.comingSoon.body')}</p>
          <div className="flex flex-col items-center gap-3">
            <WhatsAppButton />
            <Link href="/dashboard" className="text-sm font-medium text-brand-500 hover:underline">
              {t('web.comingSoon.backHome')}
            </Link>
          </div>
        </div>
      </main>
    </Header>
  );
}
