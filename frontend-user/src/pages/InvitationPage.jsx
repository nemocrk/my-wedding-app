import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { authenticateInvitation } from '../services/api';
import EnvelopeAnimation from '../components/EnvelopeAnimation';
import LetterContent from '../components/LetterContent';
import LoadingScreen from '../components/LoadingScreen';
import './InvitationPage.css';

const InvitationPage = () => {
  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const initializeInvitation = async () => {
      // Estrai parametri URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const token = params.get('token');

      if (!code || !token) {
        const errorMsg = 'Link non valido. Mancano i parametri di autenticazione.';
        const customError = new Error(errorMsg);
        // Dispatch event AFTER a short delay to ensure listeners are ready/processing
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('api-error', { detail: customError }));
        }, 100);
        
        setError(errorMsg); 
        setLoading(false);
        return;
      }

      try {
        // Autenticazione tramite service
        const data = await authenticateInvitation(code, token);
        
        if (data.valid) {
          setInvitationData(data.invitation);
          // Rimuovi parametri dall'URL per sicurezza
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
           const errMsg = data.message || 'Invito non valido';
           throw new Error(errMsg);
        }
      } catch (err) {
        console.error('Errore autenticazione:', err);
        setError('Errore di connessione.');
        // Dispatch global error for the Modal to show up
        window.dispatchEvent(new CustomEvent('api-error', { detail: err }));
      } finally {
        setLoading(false);
      }
    };

    initializeInvitation();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  // Se c'è un errore, mostriamo un container vuoto per lasciare spazio alla modale
  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        {/* Fallback visuale leggero se la modale fallisse */}
        <p className="opacity-0">Errore caricamento invito</p>
    </div>;
  }

  return (
    <div className="invitation-page">
      <AnimatePresence>
        {!animationComplete && invitationData && (
          <EnvelopeAnimation 
            onComplete={() => setAnimationComplete(true)} 
          />
        )}
      </AnimatePresence>
      
      {animationComplete && invitationData && (
        <LetterContent data={invitationData} />
      )}
    </div>
  );
};

export default InvitationPage;
