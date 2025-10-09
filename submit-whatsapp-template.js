import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config({ path: './backend/.env' });

async function submitWhatsAppTemplate() {
  try {
    console.log('📱 Submetendo template do WhatsApp...');
    
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = 'EAAafO1sejkwBPsSxuYhjVm4sLr2n8ZBPMLI0gt3YDZCadbl46O0C1TMABuhuaonbdhtDuFKqGGuuka6r4N6IEINpNd0Aw6OsecexwPvCWOi0whwoaMqM8XmTHDFiqtnTjYJL7m2U7zaJLLPZC24VRlpZAWqNFS1Pfb89g9o7XjMSlr4zy8KG9MLGZCQ549eeNZCq0D7cmiCLZArdp8LdxP5AZCwqJsw9ORSveMGZChZBsZD';
    
    console.log(`🏢 Business Account ID: ${businessAccountId}`);
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...`);
    
    // Ler o template
    const templateData = JSON.parse(fs.readFileSync('./whatsapp-template.json', 'utf8'));
    
    console.log('\n📋 Template a ser submetido:');
    console.log(`   Nome: ${templateData.name}`);
    console.log(`   Categoria: ${templateData.category}`);
    console.log(`   Idioma: ${templateData.language}`);
    console.log(`   Botões: ${templateData.components.find(c => c.type === 'BUTTONS')?.buttons?.length || 0}`);
    
    // Submeter template
    const response = await fetch(`https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Template submetido com sucesso!');
      console.log('📱 Resposta:', JSON.stringify(result, null, 2));
      
      console.log('\n⏳ PRÓXIMOS PASSOS:');
      console.log('1. O template será analisado pelo WhatsApp');
      console.log('2. Aprovação pode levar 24-48 horas');
      console.log('3. Você receberá notificação por email');
      console.log('4. Após aprovação, poderemos enviar mensagens com botões');
      
    } else {
      const error = await response.json();
      console.log('\n❌ Erro ao submeter template:');
      console.log(JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

submitWhatsAppTemplate();
