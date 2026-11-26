/**
 * Subscribe links sent by Zul on WhatsApp and used by the site:
 *   /assinar/<org> /subscribe/<org> /suscribirme/<org>  -> offering `default`
 *   /oferta/<org>  /offer/<org>                          -> offering `winback`
 *
 * Server side: a 302 to the RevenueCat Web Purchase Link for the
 * organization when the env var is set; otherwise the page renders a short
 * "payments open soon" message with a WhatsApp button. The org must be a
 * UUID (anything else is a 404).
 */

import { webPurchaseLink } from '@fintrack/shared/billing';
import { isUuid } from './billingServer.js';
import { pickLanguage, languageFromAcceptLanguage } from './publicLocale.js';

export function purchaseBaseUrl(kind, env = process.env) {
  return kind === 'offer' ? env.RC_WEB_WINBACK_URL || '' : env.RC_WEB_PURCHASE_URL || '';
}

/**
 * Page language: ?lang= wins; then the page's own language. `languages`
 * lists the languages the path serves (e.g. /oferta serves pt and es):
 * the browser picks among them, else the first one.
 */
export function subscribePageLanguage({ query, req, languages }) {
  const fromQuery = pickLanguage(Array.isArray(query?.lang) ? query.lang[0] : query?.lang);
  if (fromQuery) return fromQuery;
  if (languages.length > 1) {
    const browser = languageFromAcceptLanguage(req?.headers?.['accept-language']);
    if (browser && languages.includes(browser)) return browser;
  }
  return languages[0];
}

export function subscribeServerSideProps(kind, languages, { env = process.env } = {}) {
  return async ({ params, query, req }) => {
    const org = Array.isArray(params?.org) ? params.org[0] : params?.org;
    if (!isUuid(org)) return { notFound: true };
    const link = webPurchaseLink(purchaseBaseUrl(kind, env), org);
    if (link) {
      return { redirect: { destination: link, statusCode: 302 } };
    }
    return { props: { kind, lang: subscribePageLanguage({ query, req, languages }) } };
  };
}
