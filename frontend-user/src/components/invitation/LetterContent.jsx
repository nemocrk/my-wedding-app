import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { submitRSVP } from '../../services/api';
import { logInteraction, heatmapTracker } from '../../services/analytics';
import './LetterContent.css';
import letterBg from '../../assets/illustrations/LetterBackground.png';
import rightArrow from '../../assets/illustrations/right-arrow.png';
import waxImg from '../../assets/illustrations/wax.png'; // Import del sigillo

const LetterContent = ({ data }) => {
  const [rsvpStatus, setRsvpStatus] = useState(data.status || 'pending');
  const [accommodationRequested, setAccommodationRequested] = useState(data.accommodation_requested || false);
  const [transferRequested, setTransferRequested] = useState(data.transfer_requested || false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // State per gestire la "modalità modifica"
  const [isEditing, setIsEditing] = useState(rsvpStatus === 'pending');
  
  // State per l'animazione di flip
  const [isFlipped, setIsFlipped] = useState(false);

  // Animation Control per il Sigillo
  const sealControls = useAnimation();

  // Initialize Analytics + Replay commands listener (Admin -> iframe)
  useEffect(() => {
    heatmapTracker.start();
    logInteraction('view_letter');

    const handleReplayMessage = (event) => {
      // Hardening minimo: richiede payload con type noto
      if (!event?.data?.type) return;

      if (event.data.type === 'REPLAY_RESET') {
        // Stato base deterministico per il replay
        setRsvpStatus('pending');
        setAccommodationRequested(false);
        setTransferRequested(false);
        setIsEditing(true);
        setMessage(null);
        setSubmitting(false);
        setIsFlipped(false); // Reset flip state
        return;
      }

      if (event.data.type === 'REPLAY_ACTION') {
        const { action, details } = event.data.payload || {};
        if (!action) return;

        // Eventi gestiti
        if (action === 'rsvp_reset') {
          setIsEditing(true);
          setMessage(null);
          return;
        }

        // click_rsvp: mostra lo stato come se l'utente avesse confermato/declinato
        if (action === 'click_rsvp' || action === 'rsvp_submit') {
          const status = details?.status_chosen || details?.status;
          if (status === 'confirmed' || status === 'declined') {
            setRsvpStatus(status);
            setIsEditing(false);
            setMessage(null);
          }
          return;
        }
        
        // Handle flip action replay if needed
        if (action === 'card_flip') {
            setIsFlipped(details?.flipped || false);
        }
      }
    };

    // LISTENER PER IL RIENTRO DEL SIGILLO (Step 5 di EnvelopeAnimation)
    const onSealReturn = () => {
        // Avvia l'animazione di rientro
        sealControls.start({
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            transition: { 
                duration: 0.6, 
                ease: "easeOut",
                type: "spring",
                bounce: 0.3
            }
        });
    };

    window.addEventListener('message', handleReplayMessage);
    window.addEventListener('wax-seal:return', onSealReturn);

    // Se il componente viene montato DOPO che l'evento è già stato sparato (race condition),
    // potremmo voler controllare uno stato globale o semplicemente animare in entrata subito.
    // Per ora, assumiamo che EnvelopeAnimation e LetterContent siano coordinati via InvitationPage.
    // Se InvitationPage monta LetterContent su onComplete (Step 5), l'animazione parte qui come "initial" se configurata,
    // oppure possiamo triggerarla manualmente.
    // Dato che onComplete scatta allo Step 5, lanciamo l'animazione di default all'ingresso se non intercettiamo l'evento in tempo.
    // Tuttavia, per rispettare l'evento:
    
    // Fallback: se dopo 100ms non abbiamo ricevuto eventi, assumiamo che siamo già in stato finale (es. refresh pagina)
    // e mostriamo il sigillo.
    const timer = setTimeout(() => {
         sealControls.start({ opacity: 1, scale: 1, x: 0, y: 0 });
    }, 500);

    return () => {
      heatmapTracker.stop();
      window.removeEventListener('message', handleReplayMessage);
      window.removeEventListener('wax-seal:return', onSealReturn);
      clearTimeout(timer);
    };
  }, [sealControls]);

  const handleFlip = (flipped) => {
      setIsFlipped(flipped);
      logInteraction('card_flip', { flipped });
  };

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
        logInteraction('rsvp_submit', { status, result: 'success' });
        setRsvpStatus(status);
        setIsEditing(false); // Switch to confirmed view
        setMessage({ type: 'success', text: result.message });
      } else {
        logInteraction('rsvp_submit', { status, result: 'error' });
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Errore RSVP:', err);
      logInteraction('rsvp_submit', { status, result: 'error', error: err.message });
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
      initial={{ opacity: 0 }} // Opacity gestita dall'envelope transition
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
        
        <div className="flip-card-inner">
            
            {/* FRONT FACE */}
            <div className="flip-card-front" style={{ backgroundImage: `url(${letterBg})` }}>
                <div className="front-content">
                    <div className="spacer-top"></div>
                    
                    <h1 className="text-names">Domenico & Loredana</h1>
                    
                    <p className="text-wit">
                        Abbiamo deciso di fare il grande passo...<br/>e di farlo a piedi nudi!
                    </p>
                    
                    <p className="text-date">
                        Ci sposiamo il 19 Settembre 2026<br/>
                        sulla spiaggia di Golfo Aranci
                    </p>
                    
                    <p className="text-details">
                        (Sì! in Sardegna!!)<br/>
                        Preparatevi a scambiare le scarpe strette con la sabbia tra le dita. Vi promettiamo:
                    </p>
                    
                    <div className="text-details" style={{ fontWeight: 500 }}>
                        Poca formalità • Molto spritz • Un tramonto indimenticabile
                    </div>
                    
                    <p className="text-dress">
                        Dress Code: Beach Chic<br/>
                        <span style={{fontSize: '0.7em', display: 'block', marginTop: '5px', opacity: 0.8}}>
                            (I tacchi a spillo sono i nemici numero uno della sabbia, siete avvisati!)
                        </span>
                    </p>
                </div>
                
                {/* Navigation to Back */}
                <button 
                    className="nav-button pulse-animation" 
                    onClick={() => handleFlip(true)}
                    aria-label="Vedi dettagli"
                    title="Vedi dettagli e conferma"
                >
                    <img src={rightArrow} alt="Avanti" className="nav-arrow-img" />
                </button>
                <motion.div
                    className="wax-seal"
                    initial={{ x: -100, y: 100, scale: 1.5, opacity: 0, rotate: -30 }} // Parte fuori
                    animate={sealControls}
                    style={{ 
                        position: 'absolute',
                        bottom: '1rem',
                        left: '1rem',
                        width: '36%', // Dimensionamento dinamico relativo alla card
                        maxWidth: '90px',
                        zIndex: 30,
                        pointerEvents: 'none'
                    }}
                >
                    <img src={waxImg} alt="Seal" style={{ width: '100%', height: '100%', dropShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                </motion.div>
            </div>

            {/* BACK FACE */}
            <div className="flip-card-back" style={{ backgroundImage: `url(${letterBg})` }}>
                <div className="letter-paper">
                    {/* Navigation to Front */}
                    <button 
                        className="nav-button" 
                        style={{ left: 15, right: 'auto', bottom: 'auto', top: 15, transform: 'rotate(180deg)', width: 35, height: 35, fontSize: '1rem' }}
                        onClick={() => handleFlip(false)}
                        aria-label="Torna alla copertina"
                        title="Torna alla copertina"
                    >
                        <span role="img" aria-label="arrow-left">➡️</span>
                    </button>

                    <h1 className="letter-title" style={{marginTop: '2rem'}}>Siete Invitati!</h1>
                    
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

                    {/* RSVP FORM Section */}
                    {isEditing && (
                    <div className="rsvp-section">
                        <h3>Conferma la tua partecipazione</h3>
                        
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
                            {submitting ? 'Invio...' : '✔️ Conferma'}
                        </button>
                        <button 
                            className={`rsvp-button decline ${rsvpStatus === 'declined' ? 'active' : ''}`}
                            onClick={() => handleRSVP('declined')}
                            disabled={submitting}
                        >
                            {submitting ? 'Invio...' : '❌ Declina'}
                        </button>
                        </div>
                        {data.status && data.status !== 'pending' && (
                            <button className="text-gray-400 text-xs mt-2 underline block text-center w-full" onClick={() => setIsEditing(false)}>
                                Annulla modifiche
                            </button>
                        )}
                    </div>
                    )}

                    {/* CONFIRMED/DECLINED VIEW */}
                    {!isEditing && rsvpStatus === 'confirmed' && (
                    <div className="rsvp-confirmed animate-fadeIn">
                        <h3>✅ Partecipazione Confermata!</h3>
                        <p>Non vediamo l'ora di vedervi al nostro matrimonio!</p>
                        <div className="mt-4">
                            <button 
                                onClick={handleReset}
                                className="text-pink-600 font-semibold underline hover:text-pink-800 text-sm"
                            >
                                Modifica risposta
                            </button>
                        </div>
                    </div>
                    )}

                    {!isEditing && rsvpStatus === 'declined' && (
                    <div className="rsvp-declined animate-fadeIn">
                        <h3>😔 Ci dispiace</h3>
                        <p>Grazie comunque per averci avvisato.</p>
                        <div className="mt-4">
                            <button 
                                onClick={handleReset}
                                className="text-gray-600 font-semibold underline hover:text-gray-800 text-sm"
                            >
                                Modifica risposta
                            </button>
                        </div>
                    </div>
                    )}

                    {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                    )}
                    
                    {/* Spacer for bottom scrolling */}
                    <div style={{height: '20px'}}></div>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LetterContent;