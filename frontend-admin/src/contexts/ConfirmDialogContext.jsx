import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import ConfirmationModal from '../components/common/ConfirmationModal';

const ConfirmDialogContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
};

export const ConfirmDialogProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({});
  const resolveRef = useRef(null);

  const confirm = useCallback(({ 
    title, 
    message, 
    confirmText = "Conferma", 
    cancelText = "Annulla", 
    isDangerous = false 
  }) => {
    return new Promise((resolve) => {
      setOptions({
        title,
        message,
        confirmText,
        cancelText,
        isDangerous
      });
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setIsOpen(false);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        isDangerous={options.isDangerous}
      />
    </ConfirmDialogContext.Provider>
  );
};

export default ConfirmDialogContext;
