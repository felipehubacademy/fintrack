import { useRef, useState } from 'react';

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const progressTimer = useRef(null);

  const startProgressTimer = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return Math.min(90, prev + 7);
      });
    }, 400);
  };

  const stopProgressTimer = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const uploadFile = async (selectedFile, cardId, organizationId) => {
    if (!selectedFile) {
      setError('Nenhum arquivo selecionado');
      return null;
    }

    if (!cardId || !organizationId) {
      setError('Informações do cartão/organização ausentes');
      return null;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validar tamanho (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 10MB.');
      }

      // Validar tipo
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        throw new Error('Tipo de arquivo não suportado. Use PDF, CSV ou Excel.');
      }

      setProgress(10);

      // Preparar form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('cardId', cardId);
      formData.append('organizationId', organizationId);

      setProgress(20);

      // Upload
      const responsePromise = fetch('/api/parse-transactions', {
        method: 'POST',
        body: formData,
      });

      startProgressTimer();
      const response = await responsePromise;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar arquivo');
      }

      const data = await response.json();
      setProgress(100);

      console.log(`✅ [Upload] ${data.count} transações extraídas`);

      return data.transactions;

    } catch (err) {
      console.error('❌ [Upload] Erro:', err);
      setError(err.message || 'Erro ao processar arquivo');
      return null;
    } finally {
      stopProgressTimer();
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const reset = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    stopProgressTimer();
  };

  return {
    file,
    setFile,
    uploading,
    progress,
    error,
    uploadFile,
    reset
  };
}

