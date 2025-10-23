import '../styles/globals.css';
import Head from 'next/head';
import { NotificationProvider } from '../contexts/NotificationContext';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>MeuAzulão - Controle Financeiro Familiar pelo WhatsApp</title>
        <meta name="description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno. Gestão financeira familiar inteligente." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://meuazulao.com" />
        <meta property="og:title" content="MeuAzulão - Controle Financeiro Familiar pelo WhatsApp" />
        <meta property="og:description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno." />
        <meta property="og:image" content="https://meuazulao.com/og-image.jpg" />
        <meta property="og:site_name" content="MeuAzulão" />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://meuazulao.com" />
        <meta name="twitter:title" content="MeuAzulão - Controle Financeiro Familiar pelo WhatsApp" />
        <meta name="twitter:description" content="Conheça o Zul, seu assistente financeiro que entende você. Registre despesas pelo WhatsApp e visualize tudo em um dashboard moderno." />
        <meta name="twitter:image" content="https://meuazulao.com/og-image.jpg" />
        
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
              "url": "https://meuazulao.com",
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

