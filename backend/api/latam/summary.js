import LatamService from '../../services/latamService.js';

/**
 * Vercel Serverless Function for LATAM Summary
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    try {
      const latamService = new LatamService();
      const summary = await latamService.getLatamSummary();
      
      if (summary) {
        res.status(200).json({
          success: true,
          data: summary
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Dados não encontrados'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar resumo LATAM:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar resumo'
      });
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
