import '../styles/globals.css';
import App from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { NotificationProvider } from '../contexts/NotificationContext';
import { TourProvider } from '../contexts/TourContext';
import { I18nProvider, useI18n, resolveInitialLocale } from '../contexts/I18nContext';
import { APP_CONFIG, redirectToCorrectDomain, getCanonicalUrl } from '../lib/constants';
import ZulFloatingButton from '../components/ZulFloatingButton';
import { installApiAuthFetch } from '../lib/apiFetch';
import { pricesFor } from '@fintrack/shared/billing';

// API routes require the session token; attach it to every same-origin /api/* call.
if (typeof window !== 'undefined') installApiAuthFetch();

function SeoHead() {
  const { t, locale, currency } = useI18n();
  const title = `${APP_CONFIG.SITE_NAME} - ${t('web.meta.tagline')}`;
  const description = t('web.meta.description');
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="canonical" href={getCanonicalUrl()} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={getCanonicalUrl()} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${APP_CONFIG.BASE_URL}/og-image.jpg`} />
      <meta property="og:site_name" content={APP_CONFIG.SITE_NAME} />
      <meta property="og:locale" content={String(locale).replace('-', '_')} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={getCanonicalUrl()} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${APP_CONFIG.BASE_URL}/og-image.jpg`} />

      <meta name="keywords" content={t('web.meta.keywords')} />
      <meta name="author" content="MeuAzulão" />
      <meta name="robots" content="index, follow" />

      {/* Schema.org markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'MeuAzulão',
            description,
            url: APP_CONFIG.BASE_URL,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web, WhatsApp',
            inLanguage: ['en', 'pt-BR', 'es'],
            offers: {
              '@type': 'Offer',
              price: String(pricesFor(currency).monthly),
              priceCurrency: pricesFor(currency).currency,
            },
            creator: { '@type': 'Organization', name: 'MeuAzulão' },
          }),
        }}
      />
    </Head>
  );
}

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { language, currency } = useI18n();
  const showZul = router.pathname.startsWith('/dashboard')
    || router.pathname.startsWith('/org/')
    || router.pathname.startsWith('/onboarding');
  return (
    <>
      <SeoHead />
      <NotificationProvider>
        <TourProvider>
          {/* Remount the page when language/currency change so every label,
              cached string and number format is rebuilt. */}
          <Component key={`${language}-${currency}`} {...pageProps} />
          {showZul && <ZulFloatingButton />}
        </TourProvider>
      </NotificationProvider>
    </>
  );
}

function MyApp({ Component, pageProps, i18n }) {
  // Redirect to the canonical domain on the client.
  useEffect(() => {
    redirectToCorrectDomain();
  }, []);

  return (
    <I18nProvider initial={i18n}>
      <AppShell Component={Component} pageProps={pageProps} />
    </I18nProvider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  const req = appContext.ctx?.req;
  if (!req) return appProps; // client-side navigation: keep the current settings
  const i18n = resolveInitialLocale({
    cookieHeader: req.headers?.cookie,
    queryLang: appContext.ctx?.query?.lang,
    acceptLanguage: req.headers?.['accept-language'],
  });
  return { ...appProps, i18n };
};

export default MyApp;
