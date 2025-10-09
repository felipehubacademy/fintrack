import express from 'express';
import LatamService from '../services/latamService.js';

const router = express.Router();
const latamService = new LatamService();

/**
 * GET /latam/transactions
 * Buscar transações do cartão LATAM
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await latamService.getLatamTransactions();
    res.json({
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
});

/**
 * GET /latam/summary
 * Resumo completo do cartão LATAM
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await latamService.getLatamSummary();
    
    if (summary) {
      res.json({
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
});

/**
 * GET /latam/account
 * Informações da conta LATAM
 */
router.get('/account', async (req, res) => {
  try {
    const account = await latamService.getLatamAccount();
    
    if (account) {
      res.json({
        success: true,
        data: account
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }
  } catch (error) {
    console.error('Erro ao buscar conta LATAM:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar conta'
    });
  }
});

export default router;
