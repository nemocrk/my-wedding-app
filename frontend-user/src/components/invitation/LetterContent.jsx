import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import { submitRSVP } from '../../services/api';
import { logInteraction, heatmapTracker } from '../../services/analytics';
import './LetterContent.css';
import letterBg from '../../assets/illustrations/LetterBackground.png';
import rightArrow from '../../assets/illustrations/right-arrow.png';
import waxImg from '../../assets/illustrations/wax.png';
import { FaWhatsapp } from 'react-icons/fa';

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
  
  // WhatsApp Config extraction
  const groomNumber = data.config?.whatsapp_groom_number;
  const brideNumber = data.config?.whatsapp_bride_number;
  const groomName = data.config?.whatsapp_groom_firstname || "Sposo";
  const brideName = data.config?.whatsapp_bride_firstname || "Sposa";

  const getWaLink = (number) => 
    `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Ciao, sono ${data.name}, avrei una domanda!`)}`;

  // Initialize Analytics + Replay commands listener (Admin -> iframe)
  useEffect(() => {
    heatmapTracker.start();
    logInteraction('view_letter'); 

    const handleReplayMessage = (event) => {
      if (!event?.data?.type) return;

      if (event.data.type === 'REPLAY_RESET') {
        setRsvpStatus('pending');
        setAccommodationRequested(false);
        setTransferRequested(false);
        setIsEditing(true);
        setMessage(null);
        setSubmitting(false);
        setIsFlipped(false);
        return;
      }

      if (event.data.type === 'REPLAY_ACTION') {
        const { action, details } = event.data.payload || {};
        if (!action) return;

        if (action === 'rsvp_reset') {
          setIsEditing(true);
          setMessage(null);
          return;
        }

        if (action === 'click_rsvp' || action === 'rsvp_submit') {
          const status = details?.status_chosen || details?.status;
          if (status === 'confirmed' || status === 'declined') {
            setRsvpStatus(status);
            setIsEditing(false);
            setMessage(null);
          }
          return;
        }
        
        if (action === 'card_flip') {
            setIsFlipped(details?.flipped || false);
        }
      }
    };

    const onSealReturn = () => {
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
        setIsEditing(false);
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
      initial={{ opacity: 0 }}
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
                    initial={{ x: -100, y: 100, scale: 1.5, opacity: 0, rotate: -30 }}
                    animate={sealControls}
                >
                    <img src={waxImg} alt="Seal" style={{ width: '100%', height: '100%', dropShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                </motion.div>
            </div>

            {/* BACK FACE */}
            <div className="flip-card-back" style={{ backgroundImage: `url(${letterBg})` }}>
                <div className="letter-paper">
                    {/* Navigation to Front */}
                    <button 
                        className="nav-button-back" 
                        onClick={() => handleFlip(false)}
                        aria-label="Torna alla copertina"
                        title="Torna alla copertina"
                    >
                        <img src={rightArrow} alt="Indietro" className="nav-arrow-img" />
                    </button>

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
                            <button className="cancel-edit-btn" onClick={() => setIsEditing(false)}>
                                Annulla modifiche
                            </button>
                        )}
                    </div>
                    )}

                    {/* CONFIRMED/DECLINED VIEW */}
                    {!isEditing && rsvpStatus === 'confirmed' && (
                    <div className="rsvp-confirmed">
                        <h3>✅ Partecipazione Confermata!</h3>
                        <p>Non vediamo l'ora di vedervi al nostro matrimonio!</p>
                        <div className="action-wrapper">
                            <button 
                                onClick={handleReset}
                                className="edit-response-btn edit-response-btn-confirm"
                            >
                                Modifica risposta
                            </button>
                        </div>
                    </div>
                    )}

                    {!isEditing && rsvpStatus === 'declined' && (
                    <div className="rsvp-declined">
                        <h3>😔 Ci dispiace</h3>
                        <p>Grazie comunque per averci avvisato.</p>
                        <div className="action-wrapper">
                            <button 
                                onClick={handleReset}
                                className="edit-response-btn edit-response-btn-decline"
                            >
                                Modifica risposta
                            </button>
                        </div>
                    </div>
                    )}

                    {/* WHATSAPP CTA SECTION */}
                    {(groomNumber || brideNumber) && (
                    <div className="whatsapp-section">
                        <p className="whatsapp-label">Hai domande?</p>
                        <div className="whatsapp-buttons">
                            {groomNumber && (
                                <a href={getWaLink(groomNumber)} target="_blank" rel="noreferrer" 
                                className="whatsapp-link">
                                <FaWhatsapp size={18} /> {groomName}
                                </a>
                            )}
                            {brideNumber && (
                                <a href={getWaLink(brideNumber)} target="_blank" rel="noreferrer" 
                                className="whatsapp-link">
                                <FaWhatsapp size={18} /> {brideName}
                                </a>
                            )}
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
