import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from '../components/common/Toast';

const ToastContext = createContext(undefined);

/**
 * ToastProvider - Provides toast notification functionality to the app
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, message, type, duration };

    setToasts((prev) => {
      // Limit to max 5 toasts
      const updated = [...prev, newToast];
      return updated.slice(-5);
    });

    return id;
  }, []);

  const success = useCallback((message, duration) => {
    return show(message, 'success', duration);
  }, [show]);

  const error = useCallback((message, duration) => {
    return show(message, 'error', duration);
  }, [show]);

  const warning = useCallback((message, duration) => {
    return show(message, 'warning', duration);
  }, [show]);

  const info = useCallback((message, duration) => {
    return show(message, 'info', duration);
  }, [show]);

  const value = {
    show,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                id={toast.id}
                type={toast.type}
                message={toast.message}
                duration={toast.duration}
                onClose={removeToast}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook - Access toast notification functions
 * @returns {Object} Toast methods: { show, success, error, warning, info }
 * @example
 * const toast = useToast();
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;