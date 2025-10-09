import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

class LatamService {
  constructor() {
    this.apiKey = null;
    this.latamAccountId = process.env.PLUGGY_LATAM_ACCOUNT_ID;
  }

  async authenticate() {
    try {
      const authResponse = await fetch(`${PLUGGY_BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: process.env.PLUGGY_CLIENT_ID,
          clientSecret: process.env.PLUGGY_CLIENT_SECRET,
        }),
      });

      const authData = await authResponse.json();
      this.apiKey = authData.apiKey;
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação:', error.message);
      return false;
    }
  }

  async getLatamAccount() {
    try {
      if (!this.apiKey) {
        await this.authenticate();
      }

      const accountsResponse = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${process.env.PLUGGY_CONNECTION_ID}`, {
        headers: { 'X-API-KEY': this.apiKey },
      });

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const accounts = accountsData.results || [];
        
        // Encontrar o cartão LATAM
        const latamCard = accounts.find(account => 
          account.name.toLowerCase().includes('latam') || 
          account.type === 'CREDIT'
        );
        
        return latamCard;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar conta LATAM:', error.message);
    }
    return null;
  }

  async getLatamTransactions() {
    try {
      if (!this.apiKey) {
        await this.authenticate();
      }

      if (!this.latamAccountId) {
        console.log('⚠️ Account ID do LATAM não configurado');
        const account = await this.getLatamAccount();
        if (account) {
          this.latamAccountId = account.id;
        }
      }

      const txResponse = await fetch(
        `${PLUGGY_BASE_URL}/transactions?itemId=${process.env.PLUGGY_CONNECTION_ID}&accountId=${this.latamAccountId}`, 
        {
          headers: { 'X-API-KEY': this.apiKey },
        }
      );

      if (txResponse.ok) {
        const txData = await txResponse.json();
        const transactions = txData.results || [];
        
        console.log(`📈 ${transactions.length} transações encontradas no cartão LATAM`);
        
        // Processar transações para o formato do sistema
        const processedTransactions = transactions.map(tx => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          category: this.categorizeTransaction(tx.description),
          type: tx.amount < 0 ? 'expense' : 'income',
          source: 'LATAM_CARD'
        }));

        return processedTransactions;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar transações LATAM:', error.message);
    }
    return [];
  }

  categorizeTransaction(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('sephora')) return 'Beleza';
    if (desc.includes('carrefour')) return 'Supermercado';
    if (desc.includes('anuidade')) return 'Taxas';
    if (desc.includes('turbo')) return 'Combustível';
    if (desc.includes('assinatura')) return 'Assinaturas';
    if (desc.includes('estorno')) return 'Estorno';
    
    return 'Outros';
  }

  async getLatamSummary() {
    try {
      const transactions = await this.getLatamTransactions();
      const account = await this.getLatamAccount();
      
      if (!transactions.length || !account) {
        return null;
      }

      const totalSpent = transactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      const totalCredits = transactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const categoryBreakdown = transactions.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + Math.abs(tx.amount);
        return acc;
      }, {});

      return {
        account: {
          name: account.name,
          type: account.type,
          balance: account.balance
        },
        summary: {
          totalTransactions: transactions.length,
          totalSpent: totalSpent,
          totalCredits: totalCredits,
          netAmount: totalCredits - totalSpent
        },
        categoryBreakdown,
        transactions: transactions.slice(0, 10) // Últimas 10 transações
      };
    } catch (error) {
      console.error('❌ Erro ao gerar resumo LATAM:', error.message);
      return null;
    }
  }
}

export default LatamService;
