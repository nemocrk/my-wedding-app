import { useState, useEffect, useCallback } from 'react';

export const API_ERROR_EVENT = 'api-error';

export default function useApiErrorModal() {
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const handleError = (event) => {
      console.error("Global API Error Caught:", event.detail);
      // Normalizziamo l'errore per assicurarci di avere sempre un messaggio leggibile
      const errorPayload = event.detail || { message: 'Errore sconosciuto' };
      setError(errorPayload);
    };

    window.addEventListener(API_ERROR_EVENT, handleError);
    
    // Cleanup
    return () => {
      window.removeEventListener(API_ERROR_EVENT, handleError);
    };
  }, []);

  return { 
    error, 
    clearError,
    // Helper booleano per componenti che usano isOpen (come admin)
    isOpen: !!error 
  };
}
