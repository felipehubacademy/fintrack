import formidable from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Desabilitar body parser padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper: Extrair texto do PDF
async function extractPDFText(pdfBuffer) {
  try {
    console.log('📄 [PDF] Extraindo texto do PDF...');
    // Importação dinâmica para Next.js
    const pdfjsLib = await import('pdfjs-dist/build/pdf.js');
    const getDocument = pdfjsLib.default?.getDocument || pdfjsLib.getDocument;
    const loadingTask = getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    console.log(`📄 [PDF] ${pageCount} páginas encontradas`);
    
    if (pageCount > 10) {
      throw new Error('PDF muito grande. Máximo 10 páginas permitidas.');
    }
    
    let text = '';
    for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
      page.cleanup();
    }
    
    await pdf.destroy();
    
    console.log(`📄 [PDF] ${text.length} caracteres extraídos`);
    if (!text.trim()) {
      throw new Error('Não foi possível extrair texto do PDF.');
    }
    console.log(`✅ [PDF] Texto extraído com sucesso`);
    return text;
  } catch (error) {
    console.error('❌ [PDF] Erro ao extrair texto:', error);
    throw new Error(`Erro ao processar PDF: ${error.message}`);
  }
}

// Helper: Parse CSV
async function parseCSV(fileBuffer) {
  try {
    const csvText = fileBuffer.toString('utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const transactions = results.data.map((row) => {
            const dateKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('data') || k.toLowerCase().includes('date')
            );
            const descKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('desc') || k.toLowerCase().includes('estab')
            );
            const amountKey = Object.keys(row).find(k => 
              k.toLowerCase().includes('valor') || k.toLowerCase().includes('amount')
            );
            
            if (!dateKey || !descKey || !amountKey) return null;
            
            return {
              date: row[dateKey],
              description: row[descKey],
              amount: parseFloat(String(row[amountKey]).replace(/[^\d,-]/g, '').replace(',', '.'))
            };
          }).filter(tx => tx && tx.description);
          
          console.log(`✅ [CSV] ${transactions.length} transações extraídas`);
          resolve(transactions);
        },
        error: reject
      });
    });
  } catch (error) {
    throw new Error(`Erro ao processar CSV: ${error.message}`);
  }
}

// Helper: Parse Excel
async function parseExcel(fileBuffer) {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    
    const transactions = data.map((row) => {
      const keys = Object.keys(row);
      const dateKey = keys.find(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('date'));
      const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('estab'));
      const amountKey = keys.find(k => k.toLowerCase().includes('valor') || k.toLowerCase().includes('amount'));
      
      if (!dateKey || !descKey || !amountKey) return null;
      
      return {
        date: row[dateKey],
        description: row[descKey],
        amount: parseFloat(String(row[amountKey]).replace(/[^\d,-]/g, '').replace(',', '.'))
      };
    }).filter(tx => tx && tx.description);
    
    console.log(`✅ [EXCEL] ${transactions.length} transações extraídas`);
    return transactions;
  } catch (error) {
    throw new Error(`Erro ao processar Excel: ${error.message}`);
  }
}

async function categorizeTransactions(transactions, categories = []) {
  if (!categories.length) {
    return transactions.map((tx) => ({ ...tx, category_id: null }));
  }

  // Estratégia melhorada: match por palavras-chave comuns em descrições brasileiras
  const categoryKeywords = {
    'Alimentação': ['mercado', 'supermercado', 'padaria', 'açougue', 'hortifruti', 'restaurante', 'lanchonete', 'ifood', 'rappi', 'uber eats'],
    'Transporte': ['uber', 'taxi', '99', 'posto', 'combustível', 'gasolina', 'estacionamento', 'pedágio'],
    'Saúde': ['farmácia', 'drogaria', 'droga', 'hospital', 'clínica', 'médico', 'laboratório', 'exame'],
    'Casa': ['magazine', 'construção', 'material', 'casa', 'móveis', 'eletro', 'pet', 'petz'],
    'Lazer': ['cinema', 'teatro', 'show', 'parque', 'viagem', 'hotel', 'pousada'],
    'Educação': ['escola', 'faculdade', 'curso', 'livraria', 'material escolar'],
    'Vestuário': ['roupa', 'calçado', 'moda', 'loja', 'magazine', 'zara', 'renner', 'c&a'],
    'Beleza': ['salão', 'cabeleireiro', 'estética', 'perfumaria', 'sephora', 'boticário', 'natura']
  };

  return transactions.map((tx) => {
    const normalizedDescription = tx.description?.toLowerCase() || '';
    const categorySuggestion = tx.category_suggestion?.toLowerCase() || '';
    
    let matched = null;
    
    // PRIORIDADE 1: Se veio category_suggestion do GPT-4, fazer match direto
    if (categorySuggestion) {
      matched = categories.find((cat) => 
        cat.name.toLowerCase() === categorySuggestion ||
        categorySuggestion.includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(categorySuggestion)
      );
    }
    
    // PRIORIDADE 2: Tentar match exato com nome da categoria na descrição
    if (!matched) {
      matched = categories.find((cat) =>
        normalizedDescription.includes(cat.name.toLowerCase())
      );
    }
    
    // PRIORIDADE 3: Tentar match por palavras-chave na descrição
    if (!matched) {
      for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
        const categoryMatch = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (categoryMatch && keywords.some(keyword => normalizedDescription.includes(keyword))) {
          matched = categoryMatch;
          break;
        }
      }
    }
    
    return {
      ...tx,
      category_id: matched?.id || null,
    };
  });
}

// Helper: Analisar texto do PDF com GPT-4
async function parseStatementText(pdfText, categories = [], openaiClient) {
  try {
    console.log(`📄 [GPT-4] Analisando extrato...`);
    
    const categoriesText = categories.length > 0
      ? `\n\nCategorias disponíveis: ${categories.map(c => c.name).join(', ')}`
      : '';
    
    const prompt = `Analise este extrato/fatura de cartão de crédito brasileiro e extraia TODAS as transações.

REGRAS IMPORTANTES:
1. Data: YYYY-MM-DD (preservar mês original da transação)
2. Valores:
   - Compras/débitos: positivos (ex: 147.50)
   - Estornos/créditos: negativos (ex: -147.50)
   - Pagamentos parciais: negativos (ex: -2000.00)
3. Identificação:
   - is_refund: true se "ESTORNO"/"CRÉDITO"/"DEVOLUÇÃO"/"REEMBOLSO"
   - is_partial_payment: true se "PAGAMENTO"/"PAGTO FATURA"/"ANTECIPAÇÃO"
4. Categoria: OBRIGATÓRIA - sugerir baseado no estabelecimento${categoriesText}

Retorne APENAS JSON array (sem markdown):
[
  {
    "date": "2025-10-15",
    "description": "Supermercado Pão de Açúcar",
    "amount": 147.50,
    "is_refund": false,
    "is_partial_payment": false,
    "category_suggestion": "Alimentação"
  }
]

Extraia TODAS as transações, preservando datas originais.

TEXTO DO EXTRATO:
${pdfText}`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    });

    const content = response.choices[0].message.content.trim();
    
    let jsonText = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    
    const transactions = JSON.parse(jsonText);
    console.log(`✅ [GPT-4] ${transactions.length} transações extraídas`);
    
    return transactions;
  } catch (error) {
    console.error('❌ [GPT-4] Erro:', error);
    throw new Error(`Erro ao analisar extrato: ${error.message}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📤 [PARSE] Recebendo upload...');

    // Parse do form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0] || files.file;
    const cardId = fields.cardId?.[0] || fields.cardId;
    const organizationId = fields.organizationId?.[0] || fields.organizationId;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!cardId || !organizationId) {
      return res.status(400).json({ error: 'cardId e organizationId são obrigatórios' });
    }

    console.log(`📄 [PARSE] Arquivo: ${file.originalFilename}, Tipo: ${file.mimetype}`);

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado. Use PDF, CSV ou Excel.' });
    }

    // Ler arquivo
    const fileBuffer = fs.readFileSync(file.filepath);
    let transactions = [];

    // Buscar categorias da organização
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('id, name')
      .eq('organization_id', organizationId)
      .or('type.eq.expense,type.eq.both');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse baseado no tipo
    if (file.mimetype === 'application/pdf') {
      console.log('📄 [PARSE] Processando PDF...');
      const pdfText = await extractPDFText(fileBuffer);
      transactions = await parseStatementText(pdfText, categories || [], openai);
      
    } else if (file.mimetype === 'text/csv') {
      console.log('📄 [PARSE] Processando CSV...');
      transactions = await parseCSV(fileBuffer);
      
    } else {
      console.log('📄 [PARSE] Processando Excel...');
      transactions = await parseExcel(fileBuffer);
    }

    transactions = await categorizeTransactions(transactions, categories || []);

    // Limpar arquivo temporário
    fs.unlinkSync(file.filepath);

    // Mapear para formato esperado pelo frontend
    const mapped = transactions.map(tx => ({
      date: tx.date,
      description: tx.description || tx.category_suggestion || 'Sem descrição',
      category_id: tx.category_id || null,
      amount: Math.abs(tx.amount), // Sempre positivo para o frontend decidir
      installments: 1,
      is_refund: tx.is_refund || false,
      is_partial_payment: tx.is_partial_payment || false,
      // Se for estorno ou pagamento parcial, marcar para conversão
      _shouldBeNegative: tx.is_refund || tx.is_partial_payment || tx.amount < 0
    }));

    console.log(`✅ [PARSE] ${mapped.length} transações processadas`);

    return res.status(200).json({
      success: true,
      transactions: mapped,
      count: mapped.length
    });

  } catch (error) {
    console.error('❌ [PARSE] Erro:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao processar arquivo'
    });
  }
}

