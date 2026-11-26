import { Html, Head, Main, NextScript } from 'next/document';

// Registers the app-shell service worker (public/sw.js) on real deployments.
const REGISTER_SW = `
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}`;

const HTML_LANG = { en: 'en', pt: 'pt-BR', es: 'es' };

export default function Document(props) {
  // Public pages pass their language in pageProps; others keep pt-BR for now.
  const lang = HTML_LANG[props?.__NEXT_DATA__?.props?.pageProps?.lang] || 'pt-BR';
  return (
    <Html lang={lang}>
      <Head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1F5BFF" />
        <meta name="application-name" content="MeuAzulão" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="MeuAzulão" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <script dangerouslySetInnerHTML={{ __html: REGISTER_SW }} />
      </body>
    </Html>
  );
}
