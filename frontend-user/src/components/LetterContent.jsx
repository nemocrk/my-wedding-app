import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { submitRSVP } from '../services/api';
import { logInteraction, heatmapTracker } from '../services/analytics';
import './LetterContent.css';

const LetterContent = ({ data }) => {
  const [rsvpStatus, setRsvpStatus] = useState(data.status || 'pending');
  const [accommodationRequested, setAccommodationRequested] = useState(data.accommodation_requested || false);
  const [transferRequested, setTransferRequested] = useState(data.transfer_requested || false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // State per gestire la "modalità modifica"
  const [isEditing, setIsEditing] = useState(rsvpStatus === 'pending');

  // Initialize Analytics & Replay Listener
  useEffect(() => {
    heatmapTracker.start();
    logInteraction('view_letter');

    // Listener per la modalità "Replay" dall'Admin
    const handleReplayMessage = (event) => {
      // In produzione dovremmo verificare event.origin per sicurezza, 
      // ma in questo contesto controllato monorepo accettiamo comandi di replay.
      if (event.data?.type === 'REPLAY_ACTION') {
          const { action, details } = event.data.payload;
          
          console.log("Replay Action received:", action, details);

          if (action === 'rsvp_reset') {
              setIsEditing(true);
              setMessage(null);
          }
          
          if (action === 'click_rsvp' || action === 'rsvp_submit') {
              // Se riceviamo un click o un submit, simuliamo lo stato finale
              // Ipotizziamo che 'status_chosen' sia nei dettagli o lo inferiamo
              const status = details?.status_chosen || details?.status; 
              if (status) {
                  setRsvpStatus(status);
                  setIsEditing(false);
                  setMessage({ type: 'success', text: "Risposta registrata (Simulazione Replay)" });
              }
          }
      }
    };

    window.addEventListener('message', handleReplayMessage);

    return () => {
      heatmapTracker.stop();
      window.removeEventListener('message', handleReplayMessage);
    };
  }, []);

  const handleRSVP = async (status) => {
    setSubmitting(true);
    setMessage(null);

    // Track button click
    logInteraction('click_rsvp', { status_chosen: status });

    try {
      const result = await submitRSVP(
        status,
        status === 'confirmed' ? accommodationRequested : false,
        status === 'confirmed' ? transferRequested : false
      );

      if (result.success) {
        setRsvpStatus(status);
        setIsEditing(false); // Switch to confirmed view
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Errore RSVP:', err);
      setMessage({ type: 'error', text: err.message || 'Errore di connessione. Riprova.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
      logInteraction('rsvp_reset');
      setIsEditing(true);
      setMessage(null);
  };

  return (
    <motion.div
      className="letter-content"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1 }}
    >
      <div className="letter-paper">
        <h1 className="letter-title">Siete Invitati!</h1>
        
        <div className="letter-body">
          {data.letter_content.split('\n').map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        <div className="guests-list">
          <h3>Ospiti:</h3>
          <ul>
            {data.guests.map((guest, idx) => (
              <li key={idx}>
                {guest.first_name} {guest.last_name || ''}
                {guest.is_child && <span className="badge">Bambino</span>}
              </li>
            ))}
          </ul>
        </div>

        {data.accommodation_offered && (
          <div className="offer-badge">
            <span>🏨 Alloggio Offerto</span>
          </div>
        )}

        {data.transfer_offered && (
          <div className="offer-badge">
            <span>🚌 Transfer Offerto</span>
          </div>
        )}

        {/* RSVP FORM Section - Show if PENDING or EDITING */}
        {isEditing && (
          <div className="rsvp-section">
            <h3>Conferma la tua partecipazione</h3>
            
            {/* Opzioni Logistiche */}
            {data.accommodation_offered && (
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={accommodationRequested}
                  onChange={(e) => setAccommodationRequested(e.target.checked)}
                />
                Richiedo l'alloggio
              </label>
            )}

            {data.transfer_offered && (
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={transferRequested}
                  onChange={(e) => setTransferRequested(e.target.checked)}
                />
                Richiedo il transfer
              </label>
            )}

            <div className="button-group">
              <button 
                className={`rsvp-button confirm ${rsvpStatus === 'confirmed' ? 'active' : ''}`}
                onClick={() => handleRSVP('confirmed')}
                disabled={submitting}
              >
                {submitting ? 'Invio...' : '✔️ Conferma Partecipazione'}
              </button>
              <button 
                className={`rsvp-button decline ${rsvpStatus === 'declined' ? 'active' : ''}`}
                onClick={() => handleRSVP('declined')}
                disabled={submitting}
              >
                {submitting ? 'Invio...' : '❌ Non Potrò Partecipare'}
              </button>
            </div>
            {/* Cancel Edit Button if previously had a status */}
            {data.status && data.status !== 'pending' && (
                <button className="text-gray-400 text-xs mt-2 underline" onClick={() => setIsEditing(false)}>
                    Annulla modifiche
                </button>
            )}
          </div>
        )}

        {/* CONFIRMED/DECLINED VIEW - Show if NOT editing */}
        {!isEditing && rsvpStatus === 'confirmed' && (
          <div className="rsvp-confirmed animate-fadeIn">
            <h3>✅ Partecipazione Confermata!</h3>
            <p>Non vediamo l'ora di vedervi al nostro matrimonio!</p>
            <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Hai cambiato idea? Nessun Problema</p>
                <button 
                    onClick={handleReset}
                    className="text-pink-600 font-semibold underline hover:text-pink-800 text-sm"
                >
                    Clicca qui per modificare la risposta
                </button>
            </div>
          </div>
        )}

        {!isEditing && rsvpStatus === 'declined' && (
          <div className="rsvp-declined animate-fadeIn">
            <h3>😔 Ci dispiace che non possiate partecipare</h3>
            <p>Grazie comunque per averci avvisato.</p>
            <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Hai cambiato idea? Nessun Problema</p>
                <button 
                    onClick={handleReset}
                    className="text-gray-600 font-semibold underline hover:text-gray-800 text-sm"
                >
                    Clicca qui per modificare la risposta
                </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LetterContent;
