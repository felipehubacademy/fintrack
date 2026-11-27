import { test } from 'node:test';
import assert from 'node:assert/strict';

import { subscribeServerSideProps, subscribePageLanguage, storeUrls, subscribePathFor } from '../billingPages.js';

const ORG = '3f2a9c1e-1111-4222-8333-444455556666';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 WhatsApp/2.24';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Safari/605.1.15';
const PLAY = 'https://play.google.com/store/apps/details?id=com.meuazulao.app';
const call = (gssp, ua, extra = {}) => gssp({ params: { org: ORG }, query: {}, req: { headers: { 'user-agent': ua, ...extra } } });

test('Android goes straight to Google Play, day 7 and day 8', async () => {
  for (const kind of ['subscribe', 'offer']) {
    const out = await call(subscribeServerSideProps(kind, ['pt'], { env: {} }), ANDROID);
    assert.deepEqual(out, { redirect: { destination: PLAY, statusCode: 302 } });
  }
});

test('iPhone goes to the App Store once APP_STORE_ID is set', async () => {
  const out = await call(subscribeServerSideProps('subscribe', ['pt'], { env: { APP_STORE_ID: '6741234567' } }), IPHONE);
  assert.deepEqual(out, { redirect: { destination: 'https://apps.apple.com/app/id6741234567', statusCode: 302 } });
});

test('computer (or iPhone without the App Store id): page with the store buttons', async () => {
  const env = { APP_STORE_ID: '6741234567' };
  const out = await call(subscribeServerSideProps('offer', ['pt', 'es'], { env }), MAC, { 'accept-language': 'es-MX' });
  assert.deepEqual(out, { props: { kind: 'offer', lang: 'es', stores: { appStore: 'https://apps.apple.com/app/id6741234567', playStore: PLAY } } });
  const ios = await call(subscribeServerSideProps('subscribe', ['es'], { env: {} }), IPHONE);
  assert.deepEqual(ios.props.stores, { appStore: '', playStore: PLAY });
  assert.deepEqual(storeUrls({}), { appStore: '', playStore: PLAY });
});

test('invalid org ids are a 404', async () => {
  const gssp = subscribeServerSideProps('subscribe', ['pt'], { env: {} });
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
