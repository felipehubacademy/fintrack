import React, { createContext, useContext, useState } from 'react';
import AlertModal from './AlertModal';

const AlertContext = createContext(null);

/**
 * Alerts for the whole app.
 *
 * const { alert } = useAlert();
 * alert({ title: t('...'), message: t('...'), type: 'warning' });
 * A missing title falls back to a translated "Heads up".
 */
export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}

/**
 * Provider that renders one alert dialog for the whole app.
 */
export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  const alert = (options) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message || '',
      type: options.type || 'info',
      buttons: options.buttons || [],
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
        buttons={alertState.buttons}
      />
    </AlertContext.Provider>
  );
}

