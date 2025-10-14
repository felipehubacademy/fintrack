import axios from 'axios';

async function updateUserPhone() {
  try {
    console.log('🔧 ATUALIZANDO TELEFONE DO USUÁRIO...\n');
    
    const response = await axios.post('https://fintrack-backend-theta.vercel.app/update-user-phone', {
      email: 'felipe.xavier1987@gmail.com',
      phone: '5511978229898'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Telefone atualizado com sucesso!');
    console.log('📄 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar telefone:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', error.response.data);
    }
  }
}

updateUserPhone();
