import LatamService from '../../services/latamService.js';

/**
 * Vercel Serverless Function for LATAM Transactions
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    try {
      const latamService = new LatamService();
      const transactions = await latamService.getLatamTransactions();
      
      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length
      });
    } catch (error) {
      console.error('Erro ao buscar transações LATAM:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar transações'
      });
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
