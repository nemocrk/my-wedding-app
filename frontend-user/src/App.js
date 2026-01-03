import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EnvelopeAnimation from './components/EnvelopeAnimation';
import LetterContent from './components/LetterContent';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Estrai parametri URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const token = params.get('token');

    if (!code || !token) {
      setError('Link non valido. Mancano i parametri di autenticazione.');
      setLoading(false);
      return;
    }

    // Fetch invito dal backend
    fetch(`/api/public/invitation/?code=${code}&token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setInvitationData(data.invitation);
        } else {
          setError(data.message);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Errore caricamento invito:', err);
        setError('Errore di connessione. Riprova più tardi.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Caricamento invito...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h1>⚠️</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
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
}

export default App;
