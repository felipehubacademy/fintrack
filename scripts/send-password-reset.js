// Script para enviar email de reset de senha para usuários específicos
// Uso: node scripts/send-password-reset.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Precisa da service role key
);

// Liste aqui os emails dos usuários que precisam resetar senha
const emails = [
  // Adicione os emails aqui, um por linha
  // 'felipexavier@example.com',
  // 'teste@example.com'
];

async function sendPasswordResets() {
  console.log('🔐 Enviando emails de reset de senha...\n');

  for (const email of emails) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/update-password`
        }
      });

      if (error) {
        console.error(`❌ Erro ao enviar para ${email}:`, error.message);
      } else {
        console.log(`✅ Email de reset enviado para: ${email}`);
        console.log(`   Link (caso o email não chegue): ${data.properties.action_link}\n`);
      }
    } catch (err) {
      console.error(`❌ Erro ao processar ${email}:`, err.message);
    }
  }

  console.log('\n✨ Processo concluído!');
}

sendPasswordResets();

