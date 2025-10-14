import axios from 'axios';

async function createUserWithPhone() {
  try {
    console.log('🔧 CRIANDO USUÁRIO COM TELEFONE VIA API...\n');
    
    const userData = {
      name: 'Felipe Xavier',
      email: 'felipe.xavier1987@gmail.com',
      phone: '5511978229898',
      role: 'admin',
      organization_name: 'Xavier',
      organization_phone: '5511978229898'
    };
    
    const response = await axios.post('https://fintrack-backend-theta.vercel.app/organizations', userData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('📄 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', error.response.data);
    }
  }
}

createUserWithPhone();
