// Re-export from shared package
export { supabase, createSupabaseClient } from '@fintrack/shared/api';

// Expor no window para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const { supabase } = await import('@fintrack/shared/api');
  window.supabase = supabase;
  console.log('🔧 Supabase exposto no window para debug');
}
