import React, { createContext, useContext, useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

const ConfirmationContext = createContext(null);

/**
 * Confirmation dialogs (translated defaults when a string is omitted).
 * 
 * Usage:
 * const { confirm } = useConfirmation();
 * 
 * await confirm({
 *   title: t('transactions.delete.title'),
 *   message: t('transactions.delete.message'),
 *   type: 'danger',            // warning | danger | info
 *   confirmText: t('common.delete'), // optional, defaults to "Confirm"
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
 * Provider that renders one confirmation dialog for the whole app.
 */
export function ConfirmationProvider({ children }) {
  const [confirmation, setConfirmation] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: undefined,
    cancelText: undefined,
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
        title: options.title,
        message: options.message,
        type: options.type || 'warning',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
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

