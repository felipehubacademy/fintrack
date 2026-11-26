import { test } from 'node:test';
import assert from 'node:assert/strict';

import { subscribeServerSideProps, subscribePageLanguage, purchaseBaseUrl, subscribePathFor } from '../billingPages.js';

const ORG = '3f2a9c1e-1111-4222-8333-444455556666';

test('purchaseBaseUrl picks the offering by page kind', () => {
  const env = { RC_WEB_PURCHASE_URL: 'https://pay.rev.cat/abc', RC_WEB_WINBACK_URL: 'https://pay.rev.cat/win' };
  assert.equal(purchaseBaseUrl('subscribe', env), 'https://pay.rev.cat/abc');
  assert.equal(purchaseBaseUrl('offer', env), 'https://pay.rev.cat/win');
  assert.equal(purchaseBaseUrl('offer', { RC_WEB_PURCHASE_URL: 'x' }), '');
});

test('302 to the Web Purchase Link with the organization id', async () => {
  const gssp = subscribeServerSideProps('subscribe', ['pt'], { env: { RC_WEB_PURCHASE_URL: 'https://pay.rev.cat/abc/' } });
  const out = await gssp({ params: { org: ORG }, query: {}, req: { headers: {} } });
  assert.deepEqual(out, { redirect: { destination: `https://pay.rev.cat/abc/${ORG}`, statusCode: 302 } });
});

test('offer uses the win-back link', async () => {
  const gssp = subscribeServerSideProps('offer', ['pt', 'es'], { env: { RC_WEB_WINBACK_URL: 'https://pay.rev.cat/win' } });
  const out = await gssp({ params: { org: ORG }, query: {}, req: { headers: {} } });
  assert.equal(out.redirect.destination, `https://pay.rev.cat/win/${ORG}`);
});

test('not configured: renders the "payments open soon" page in the path language', async () => {
  const gssp = subscribeServerSideProps('subscribe', ['es'], { env: {} });
  const out = await gssp({ params: { org: ORG }, query: {}, req: { headers: { 'accept-language': 'en-US' } } });
  assert.deepEqual(out, { props: { kind: 'subscribe', lang: 'es' } });
});

test('invalid org ids are a 404', async () => {
  const gssp = subscribeServerSideProps('subscribe', ['pt'], { env: { RC_WEB_PURCHASE_URL: 'https://pay.rev.cat/abc' } });
  for (const org of ['abc', '../evil', `${ORG}x`, '']) {
    assert.deepEqual(await gssp({ params: { org }, query: {}, req: { headers: {} } }), { notFound: true });
  }
});

test('/oferta serves pt and es: browser language picks, ?lang= wins', () => {
  const langs = ['pt', 'es'];
  assert.equal(subscribePageLanguage({ query: {}, req: { headers: { 'accept-language': 'es-MX,es;q=0.9' } }, languages: langs }), 'es');
  assert.equal(subscribePageLanguage({ query: {}, req: { headers: { 'accept-language': 'en-US' } }, languages: langs }), 'pt');
  assert.equal(subscribePageLanguage({ query: { lang: 'en' }, req: { headers: {} }, languages: langs }), 'en');
});

test('subscribePathFor uses the localized path', () => {
  assert.equal(subscribePathFor('pt', ORG), `/assinar/${ORG}`);
  assert.equal(subscribePathFor('es', ORG), `/suscribirme/${ORG}`);
  assert.equal(subscribePathFor('en', ORG), `/subscribe/${ORG}`);
  assert.equal(subscribePathFor('pt', null), null);
});
