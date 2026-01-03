import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { authenticateInvitation } from '../services/api';
import EnvelopeAnimation from '../components/EnvelopeAnimation';
import LetterContent from '../components/LetterContent';
import LoadingScreen from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
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
        // Trigger global error modal instead of static screen for missing params
        const errorMsg = 'Link non valido. Mancano i parametri di autenticazione.';
        const customError = new Error(errorMsg);
        customError.userMessage = errorMsg; // For simple display in Modal
        window.dispatchEvent(new CustomEvent('api-error', { detail: customError }));
        
        // Also keep local error to prevent further rendering of envelope
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
           // Should be handled by api.js global dispatcher, but if logic logic fails inside 200 OK:
           throw new Error(data.message || 'Invito non valido');
        }
      } catch (err) {
        // Error already dispatched by api.js safeFetch usually, but good to catch here just in case logic continued
        console.error('Errore autenticazione:', err);
        setError('Errore di connessione. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    initializeInvitation();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  // Se c'è un errore, mostriamo comunque ErrorScreen come sfondo "vuoto" sotto la modale
  // o semplicemente un div vuoto, la modale apparirà sopra.
  if (error) {
    // Return empty div so modal is the only focus, OR keep ErrorScreen as fallback visual
    return <div className="min-h-screen bg-gray-50" />; 
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
