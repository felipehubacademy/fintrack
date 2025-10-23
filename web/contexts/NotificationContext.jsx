import React, { createContext, useContext, useState } from 'react';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const toast = useToast();
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  const value = {
    ...toast,
    showNotificationCenter,
    setShowNotificationCenter
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
