import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  // Não quebrar o build, apenas logar o erro
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expor no window para debug
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  console.log('🔧 Supabase exposto no window para debug');
}

