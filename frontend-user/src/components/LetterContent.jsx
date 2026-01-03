import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './LetterContent.css';

const LetterContent = ({ data }) => {
  const [rsvpStatus, setRsvpStatus] = useState(data.status || 'pending');
  const [accommodationRequested, setAccommodationRequested] = useState(false);
  const [transferRequested, setTransferRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleRSVP = async (status) => {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/public/rsvp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: invia cookie sessione
        body: JSON.stringify({
          status,
          accommodation_requested: status === 'confirmed' ? accommodationRequested : false,
          transfer_requested: status === 'confirmed' ? transferRequested : false
        })
      });

      const result = await response.json();

      if (result.success) {
        setRsvpStatus(status);
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Errore RSVP:', err);
      setMessage({ type: 'error', text: 'Errore di connessione. Riprova.' });
    } finally {
      setSubmitting(false);
    }
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

        {/* RSVP Section */}
        {rsvpStatus === 'pending' && (
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
                className="rsvp-button confirm"
                onClick={() => handleRSVP('confirmed')}
                disabled={submitting}
              >
                {submitting ? 'Invio...' : '✔️ Conferma Partecipazione'}
              </button>
              <button 
                className="rsvp-button decline"
                onClick={() => handleRSVP('declined')}
                disabled={submitting}
              >
                {submitting ? 'Invio...' : '❌ Non Potrò Partecipare'}
              </button>
            </div>
          </div>
        )}

        {rsvpStatus === 'confirmed' && (
          <div className="rsvp-confirmed">
            <h3>✅ Partecipazione Confermata!</h3>
            <p>Non vediamo l'ora di vedervi al nostro matrimonio!</p>
          </div>
        )}

        {rsvpStatus === 'declined' && (
          <div className="rsvp-declined">
            <h3>😔 Ci dispiace che non possiate partecipare</h3>
            <p>Grazie comunque per averci avvisato.</p>
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
