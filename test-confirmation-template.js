import dotenv from 'dotenv';
import { sendConfirmationMessage } from './backend/services/whatsapp.js';

dotenv.config({ path: './backend/.env' });

console.log('🧪 TESTE: Template de Confirmação\n');

// Mock transaction
const transaction = {
  id: 'test-123',
  description: 'POSTO SHELL SP',
  amount: 180.50,
  date: '2025-10-08'
};

// Mock monthly total
const monthlyTotal = {
  owner: 'Felipe',
  individualTotal: '180.50',
  ownTotal: '180.50',
  sharedIndividual: '0.00'
};

console.log('📱 Enviando template fintrack_confirmacao...\n');

try {
  const result = await sendConfirmationMessage('Felipe', transaction, monthlyTotal);
  console.log('\n✅ SUCESSO!');
  console.log('📧 Resposta:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n❌ ERRO:', error.message);
  console.error('Stack:', error.stack);
}

