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
        setError('Link non valido. Mancano i parametri di autenticazione.');
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
          setError(data.message);
        }
      } catch (err) {
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

  if (error) {
    return <ErrorScreen message={error} />;
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
