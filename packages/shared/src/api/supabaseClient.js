import { createClient } from '@supabase/supabase-js';

/**
 * Cria um cliente Supabase configurado
 * Aceita variáveis de ambiente de diferentes plataformas (Next.js, Expo, Node)
 */
export function createSupabaseClient(options = {}) {
  // Tentar diferentes fontes de env vars (Next.js, Expo, Node)
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
    
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

// Cliente singleton para uso direto (web)
export const supabase = createSupabaseClient();

