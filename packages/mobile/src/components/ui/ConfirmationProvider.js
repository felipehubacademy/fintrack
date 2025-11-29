import React, { createContext, useContext, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

const ConfirmationContext = createContext(null);

/**
 * Hook para usar o sistema de confirmação
 * 
 * Uso:
 * const { confirm } = useConfirmation();
 * 
 * await confirm({
 *   title: 'Confirmar ação',
 *   message: 'Tem certeza?',
 *   type: 'warning',
 *   confirmText: 'Sim',
 *   cancelText: 'Não'
 * });
 */
export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}

/**
 * Provider para gerenciar confirmações globalmente
 */
export function ConfirmationProvider({ children }) {
  const [confirmation, setConfirmation] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: null,
    loading: false,
  });

  const confirm = (options) => {
    return new Promise((resolve, reject) => {
      const handleConfirm = async () => {
        try {
          if (options.onConfirm) {
            setConfirmation((prev) => ({ ...prev, loading: true }));
            await options.onConfirm();
          }
          setConfirmation((prev) => ({ ...prev, visible: false }));
          resolve(true);
        } catch (error) {
          setConfirmation((prev) => ({ ...prev, loading: false }));
          reject(error);
        }
      };

      setConfirmation({
        visible: true,
        title: options.title || 'Confirmar ação',
        message: options.message || 'Tem certeza que deseja continuar?',
        type: options.type || 'warning',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        loading: false,
        onConfirm: handleConfirm,
      });
    });
  };

  const close = () => {
    setConfirmation((prev) => ({ ...prev, visible: false }));
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        visible={confirmation.visible}
        onClose={close}
        onConfirm={confirmation.onConfirm || close}
        title={confirmation.title}
        message={confirmation.message}
        type={confirmation.type}
        confirmText={confirmation.confirmText}
        cancelText={confirmation.cancelText}
        loading={confirmation.loading}
      />
    </ConfirmationContext.Provider>
  );
}

