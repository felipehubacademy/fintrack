import React, { createContext, useContext, useState } from 'react';
import AlertModal from './AlertModal';

const AlertContext = createContext(null);

/**
 * Hook para usar o sistema de alerta
 * 
 * Uso:
 * const { alert } = useAlert();
 * 
 * alert({
 *   title: 'Alerta',
 *   message: 'Esta é uma mensagem',
 *   type: 'warning'
 * });
 */
export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

/**
 * Provider para gerenciar alertas globalmente
 */
export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const alert = (options) => {
    setAlertState({
      visible: true,
      title: options.title || 'Alerta',
      message: options.message || '',
      type: options.type || 'info',
    });
  };

  const close = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      <AlertModal
        visible={alertState.visible}
        onClose={close}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </AlertContext.Provider>
  );
}

