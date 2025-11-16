import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Serviço para parse de arquivos (PDF, CSV, Excel) e extração de transações
 */
class TransactionParser {
  /**
   * Parse de arquivo CSV
   * @param {Buffer} fileBuffer - Buffer do arquivo CSV
   * @returns {Promise<Array>} Array de transações brutas
   */
  async parseCSV(fileBuffer) {
    try {
      const csvText = fileBuffer.toString('utf-8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => {
            // Normalizar headers para lowercase e remover acentos
            return header
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();
          },
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('❌ [CSV] Erros no parse:', results.errors);
            }
            
            // Mapear colunas comuns
            const transactions = results.data.map((row) => {
              const date = row.data || row.date || row.dia || '';
              const description = row.descricao || row.description || row.desc || row.estabelecimento || '';
              const amount = row.valor || row.amount || row.value || '0';
              
              return {
                date: this.normalizeDate(date),
                description: description.trim(),
                amount: this.parseAmount(amount),
                raw: row
              };
            }).filter(tx => tx.description && tx.amount !== 0);
            
            console.log(`✅ [CSV] ${transactions.length} transações extraídas`);
            resolve(transactions);
          },
          error: (error) => {
            console.error('❌ [CSV] Erro no parse:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ [CSV] Erro:', error);
      throw new Error(`Erro ao processar CSV: ${error.message}`);
    }
  }

  /**
   * Parse de arquivo Excel
   * @param {Buffer} fileBuffer - Buffer do arquivo Excel
   * @returns {Promise<Array>} Array de transações brutas
   */
  async parseExcel(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: ''
      });
      
      // Mapear colunas comuns
      const transactions = data.map((row) => {
        // Tentar encontrar colunas de data, descrição e valor
        const keys = Object.keys(row).map(k => k.toLowerCase());
        
        const dateKey = keys.find(k => k.includes('data') || k.includes('date') || k.includes('dia'));
        const descKey = keys.find(k => k.includes('desc') || k.includes('estab') || k.includes('local'));
        const amountKey = keys.find(k => k.includes('valor') || k.includes('amount') || k.includes('value'));
        
        if (!dateKey || !descKey || !amountKey) {
          return null;
        }
        
        return {
          date: this.normalizeDate(row[Object.keys(row)[keys.indexOf(dateKey)]]),
          description: String(row[Object.keys(row)[keys.indexOf(descKey)]]).trim(),
          amount: this.parseAmount(row[Object.keys(row)[keys.indexOf(amountKey)]]),
          raw: row
        };
      }).filter(tx => tx && tx.description && tx.amount !== 0);
      
      console.log(`✅ [EXCEL] ${transactions.length} transações extraídas`);
      return transactions;
    } catch (error) {
      console.error('❌ [EXCEL] Erro:', error);
      throw new Error(`Erro ao processar Excel: ${error.message}`);
    }
  }

  /**
   * Converte PDF em imagens base64
   * @param {Buffer} pdfBuffer - Buffer do arquivo PDF
   * @returns {Promise<Array<string>>} Array de imagens em base64
   */
  async pdfToImages(pdfBuffer) {
    try {
      console.log('📄 [PDF] Convertendo PDF em imagens...');
      
      // Carregar PDF com pdfjs
      const loadingTask = getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true
      });
      
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      console.log(`📄 [PDF] ${numPages} páginas encontradas`);
      
      if (numPages > 10) {
        throw new Error('PDF muito grande. Máximo 10 páginas permitidas.');
      }
      
      const images = [];
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
        images.push(imageBase64);
        
        console.log(`✅ [PDF] Página ${pageNum}/${numPages} convertida`);
      }
      
      return images;
    } catch (error) {
      console.error('❌ [PDF] Erro ao converter:', error);
      throw new Error(`Erro ao converter PDF: ${error.message}`);
    }
  }

  /**
   * Normaliza data para formato YYYY-MM-DD
   * @param {string} dateStr - String de data em vários formatos
   * @returns {string} Data no formato YYYY-MM-DD
   */
  normalizeDate(dateStr) {
    if (!dateStr) return '';
    
    // Remover espaços
    const cleaned = String(dateStr).trim();
    
    // Já está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    
    // Formato DD/MM/YYYY ou DD-MM-YYYY
    const brFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brFormat) {
      const [, day, month, year] = brFormat;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Formato YYYY/MM/DD
    const isoFormat = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoFormat) {
      const [, year, month, day] = isoFormat;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    console.warn(`⚠️ [DATE] Formato não reconhecido: ${dateStr}`);
    return '';
  }

  /**
   * Parse de valor monetário
   * @param {string|number} amountStr - Valor em string ou número
   * @returns {number} Valor numérico
   */
  parseAmount(amountStr) {
    if (typeof amountStr === 'number') {
      return amountStr;
    }
    
    if (!amountStr) return 0;
    
    // Remover símbolos de moeda e espaços
    let cleaned = String(amountStr)
      .replace(/[R$\s]/g, '')
      .trim();
    
    // Se tiver vírgula e ponto, assumir formato brasileiro (1.234,56)
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Se tiver apenas vírgula, assumir decimal brasileiro (1234,56)
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}

export default TransactionParser;

