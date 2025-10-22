import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ompulmhcjfzlflbrlwpu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMagicLink() {
  console.log('🔍 Testando Magic Link...');
  
  try {
    // Simular criação de usuário
    const testEmail = `test-${Date.now()}@example.com`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/dashboard`;
    
    console.log('📧 Email de teste:', testEmail);
    console.log('🔗 Redirect URL:', redirectUrl);
    
    // Testar signUp
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test-password-123',
      options: {
        data: {
          name: 'Test User',
          phone: '+5511999999999'
        },
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      console.error('❌ Erro no signUp:', error);
      return;
    }
    
    console.log('✅ SignUp realizado com sucesso!');
    console.log('📊 Dados retornados:', {
      user: data.user?.id,
      session: data.session?.access_token ? 'Presente' : 'Ausente',
      emailRedirectTo: redirectUrl
    });
    
    // Verificar se o email foi enviado
    console.log('📧 Verifique o email:', testEmail);
    console.log('🔗 O link deve ir para:', redirectUrl);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testMagicLink();
