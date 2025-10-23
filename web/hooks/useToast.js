import { useState, useCallback } from 'react';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastId;
    const newToast = {
      id,
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Métodos de conveniência
  const success = useCallback((message, title = 'Sucesso') => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((message, title = 'Erro') => {
    return addToast({ type: 'error', title, message });
  }, [addToast]);

  const warning = useCallback((message, title = 'Atenção') => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((message, title = 'Informação') => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
}
