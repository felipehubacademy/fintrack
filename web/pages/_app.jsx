import '../styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>MeuAzulão - Gestão Financeira Familiar</title>
        <meta name="description" content="Controle financeiro inteligente para toda a família com WhatsApp" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="MeuAzulão - Gestão Financeira Familiar" />
        <meta property="og:description" content="Controle financeiro inteligente para toda a família com WhatsApp" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MeuAzulão - Gestão Financeira Familiar" />
        <meta name="twitter:description" content="Controle financeiro inteligente para toda a família com WhatsApp" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

