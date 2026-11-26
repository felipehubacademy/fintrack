import { createClient } from '@supabase/supabase-js';

// Admin (service role) client. NEVER import this from browser code:
// use it only in pages/api/** and other server-only modules.
//
// The client is created lazily so that importing this module (for example
// from tests or during `next build`) does not require the secrets.

let client = null;

export function getSupabaseAdmin() {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

// Backwards-compatible export: behaves like the client, created on first use.
export const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    const real = getSupabaseAdmin();
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
