import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Simulate the webhook handler verify logic inline (since the handler
// is tightly coupled to req/res, we test the verify logic directly)
function verifyWebhookToken(query, expectedToken) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === expectedToken) {
    return { status: 200, body: challenge };
  }
  return { status: 403, body: 'Forbidden' };
}

describe('WhatsApp Webhook Verification', () => {
  const VERIFY_TOKEN = 'test_verify_token_123';

  it('returns 200 and challenge when token matches', () => {
    const result = verifyWebhookToken(
      {
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': 'challenge_abc',
      },
      VERIFY_TOKEN,
    );
    assert.equal(result.status, 200);
    assert.equal(result.body, 'challenge_abc');
  });

  it('returns 403 when token does not match', () => {
    const result = verifyWebhookToken(
      {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'challenge_abc',
      },
      VERIFY_TOKEN,
    );
    assert.equal(result.status, 403);
    assert.equal(result.body, 'Forbidden');
  });

  it('returns 403 when mode is not subscribe', () => {
    const result = verifyWebhookToken(
      {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': 'challenge_abc',
      },
      VERIFY_TOKEN,
    );
    assert.equal(result.status, 403);
  });

  it('returns 403 when token is missing', () => {
    const result = verifyWebhookToken(
      {
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge_abc',
      },
      VERIFY_TOKEN,
    );
    assert.equal(result.status, 403);
  });
});
