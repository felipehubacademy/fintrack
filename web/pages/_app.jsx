import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';
import { NotificationProvider } from '../contexts/NotificationContext';
import { APP_CONFIG, redirectToCorrectDomain, getCanonicalUrl } from '../lib/constants';

function MyApp({ Component, pageProps }) {
  // Redirecionar para domínio correto no cliente
  useEffect(() => {
    redirectToCorrectDomain();
  }, []);

  return (
    <>
      <Head>
        <title>{APP_CONFIG.SITE_NAME} - {APP_CONFIG.SITE_DESCRIPTION}</title>
        <meta name="description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno. Gestão financeira familiar inteligente." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href={getCanonicalUrl()} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:title" content={`${APP_CONFIG.SITE_NAME} - ${APP_CONFIG.SITE_DESCRIPTION}`} />
        <meta property="og:description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno." />
        <meta property="og:image" content={`${APP_CONFIG.BASE_URL}/og-image.jpg`} />
        <meta property="og:site_name" content={APP_CONFIG.SITE_NAME} />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={getCanonicalUrl()} />
        <meta name="twitter:title" content={`${APP_CONFIG.SITE_NAME} - ${APP_CONFIG.SITE_DESCRIPTION}`} />
        <meta name="twitter:description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno." />
        <meta name="twitter:image" content={`${APP_CONFIG.BASE_URL}/og-image.jpg`} />
        
        {/* Additional SEO */}
        <meta name="keywords" content="controle financeiro, gestão familiar, whatsapp, assistente financeiro, zul, orçamento, despesas, cartão de crédito, parcelamento" />
        <meta name="author" content="MeuAzulão" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="Portuguese" />
        <meta name="revisit-after" content="7 days" />
        
        {/* Schema.org markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "MeuAzulão",
              "description": "Controle financeiro familiar inteligente via WhatsApp com assistente Zul",
              "url": APP_CONFIG.BASE_URL,
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web, WhatsApp",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL"
              },
              "creator": {
                "@type": "Organization",
                "name": "MeuAzulão"
              }
            })
          }}
        />
      </Head>
      <NotificationProvider>
        <Component {...pageProps} />
      </NotificationProvider>
    </>
  );
}

export default MyApp;

