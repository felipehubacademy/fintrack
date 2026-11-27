/**
 * Subscribe links sent by Zul on WhatsApp and used by the site:
 *   /assinar/<org> /subscribe/<org> /suscribirme/<org>  (day 7, plans)
 *   /oferta/<org>  /offer/<org>                          (day 8, first-month offer)
 *
 * Plus is sold only in the stores. On a phone the link redirects (302) to
 * the App Store or Google Play page of the app; on a computer, or on iOS
 * before APP_STORE_ID is set, the page shows how to subscribe in the app
 * with both store buttons. The org must be a UUID (anything else is a 404);
 * it stays in the URL because the approved WhatsApp templates carry it.
 */

import { appStoreUrl, PLAY_STORE_URL, storeLinkFor } from '@fintrack/shared/billing';
import { isUuid } from './billingServer.js';
import { pickLanguage, languageFromAcceptLanguage } from './publicLocale.js';

/** Subscribe link in the user's language (all of them redirect to the same offering). */
export function subscribePathFor(language, organizationId) {
  if (!organizationId) return null;
  const base = language === 'pt' ? '/assinar' : language === 'es' ? '/suscribirme' : '/subscribe';
  return `${base}/${encodeURIComponent(organizationId)}`;
}

/** Store pages for the page's buttons ('' when not known yet). */
export function storeUrls(env = process.env) {
  return { appStore: appStoreUrl(env.APP_STORE_ID), playStore: PLAY_STORE_URL };
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
    const link = storeLinkFor(req?.headers?.['user-agent'], { appStoreId: env.APP_STORE_ID });
    if (link) {
      return { redirect: { destination: link, statusCode: 302 } };
    }
    return { props: { kind, lang: subscribePageLanguage({ query, req, languages }), stores: storeUrls(env) } };
  };
}
