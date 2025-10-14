import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Endpoint para FORÇAR sincronização com o Pluggy
 * Chama /check automaticamente depois
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('🔄 Forçando sincronização com Pluggy...');

    // 1. Autenticar
    const authResponse = await axios.post(`${PLUGGY_BASE_URL}/auth`, {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    });
    const apiKey = authResponse.data.apiKey;

    // 2. Tentar forçar update da conexão (pode falhar no Freemium)
    let updateStatus = 'not_available';
    try {
      console.log('📡 Tentando POST /items/{id}/update...');
      const updateResponse = await axios.post(
        `${PLUGGY_BASE_URL}/items/${process.env.PLUGGY_CONNECTION_ID}/update`,
        {},
        {
          headers: { 'X-API-KEY': apiKey },
        }
      );

      updateStatus = updateResponse.data.status;
      console.log(`✅ Update iniciado: ${updateStatus}`);

      // 3. Aguardar 10 segundos para o banco processar
      console.log('⏳ Aguardando 10s para sincronização...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (updateError) {
      console.log(`⚠️ Update não disponível (${updateError.response?.status}): ${updateError.message}`);
      console.log('📊 Continuando para buscar transações existentes...');
      // Continua mesmo sem update
    }

    // 4. Chamar /check para processar novas transações
    console.log('📊 Chamando /check para processar transações...');
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://fintrack-backend-theta.vercel.app';
    
    const checkResponse = await axios.get(`${baseUrl}/check`);

    return res.status(200).json({
      success: true,
      update_status: updateStatus,
      check_result: checkResponse.data,
      message: updateStatus === 'not_available' 
        ? 'Update não disponível no plano Freemium, mas transações foram buscadas!'
        : 'Sincronização forçada com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao forçar sincronização:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
}

