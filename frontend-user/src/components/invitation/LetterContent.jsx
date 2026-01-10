import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { submitRSVP } from '../../services/api';
import { logInteraction, heatmapTracker } from '../../services/analytics';
import Fab from '../common/Fab';
import './LetterContent.css';
import letterBg from '../../assets/illustrations/LetterBackground.png';
import waxImg from '../../assets/illustrations/wax.png';
import buttonBg from '../../assets/illustrations/button-bk.png';
import homeIcon from '../../assets/illustrations/home.png';
import vanIcon from '../../assets/illustrations/van.png';
import archIcon from '../../assets/illustrations/arch.png';
import dressIcon from '../../assets/illustrations/dress.png';
import chestIcon from '../../assets/illustrations/chest.png';
import questionsIcon from '../../assets/illustrations/questions.png';
import { FaWhatsapp } from 'react-icons/fa';
import PaperModal from '../layout/PaperModal';

const LetterContent = ({ data }) => {
  const [rsvpStatus, setRsvpStatus] = useState(data.status || 'pending');
  const [accommodationRequested, setAccommodationRequested] = useState(data.accommodation_requested || false);
  const [transferRequested, setTransferRequested] = useState(data.transfer_requested || false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isEditing, setIsEditing] = useState(rsvpStatus === 'pending');
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const sealControls = useAnimation();
  
  const groomNumber = data.config?.whatsapp_groom_number;
  const brideNumber = data.config?.whatsapp_bride_number;
  const groomName = data.config?.whatsapp_groom_firstname || "Sposo";
  const brideName = data.config?.whatsapp_bride_firstname || "Sposa";

  const getWaLink = (number) => 
    `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Ciao, sono ${data.name}, avrei una domanda!`)}`;

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
        setExpandedCard(null);
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

  const handleCardClick = (cardId) => {
    setExpandedCard(cardId);
    logInteraction('card_expand', { card: cardId });
  };

  const handleCloseExpanded = () => {
    setExpandedCard(null);
    logInteraction('card_collapse');
  };

  // Card Grid Configuration
  const cards = {
    'alloggio': {title: 'Alloggio', icon: homeIcon },
    'viaggio': {title: 'Viaggio', icon: vanIcon },
    'evento': {title: 'Evento', icon: archIcon },
    'dresscode': {title: 'Dress Code', icon: dressIcon },
    'bottino': {title: 'Bottino di nozze', icon: chestIcon },
    'cosaltro': {title: "Cos'altro?", icon: questionsIcon },
  };

  const renderCardContent = (cardId) => {
    switch(cardId) {
      case 'alloggio':
        return (
          <div className="expanded-content">
            <h2>Alloggio</h2>
            {data.accommodation_offered ? (
              <p>Abbiamo riservato per voi una sistemazione. Maggiori dettagli a breve!</p>
            ) : (
              <p>Per suggerimenti sugli alloggi nella zona, contattateci!</p>
            )}
          </div>
        );
      case 'viaggio':
        return (
          <div className="expanded-content">
            <h2>Viaggio</h2>
            {data.transfer_offered ? (
              <p>Organizzeremo un transfer per facilitare i vostri spostamenti. Dettagli in arrivo!</p>
            ) : (
              <p>Informazioni sui trasporti e come raggiungere la location disponibili a breve.</p>
            )}
          </div>
        );
      case 'evento':
        return (
          <div className="expanded-content">
            <h2>L'Evento</h2>
            <div className="letter-body">
              {data.letter_content.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        );
      case 'dresscode':
        return (
          <div className="expanded-content">
            <h2>Dress Code</h2>
            <p><strong>Beach Chic</strong></p>
            <p>Eleganti ma comodi! Ricordatevi che saremo sulla spiaggia: i tacchi a spillo sono i nemici numero uno della sabbia!</p>
          </div>
        );
      case 'bottino':
        return (
          <div className="expanded-content">
            <h2>Lista Nozze</h2>
            <p>La vostra presenza è il regalo più grande, ma se desiderate contribuire al nostro viaggio di nozze...</p>
            <p><em>Dettagli IBAN in arrivo!</em></p>
          </div>
        );
      case 'cosaltro':
        return (
          <div className="expanded-content">
            <h2>Hai domande?</h2>
            <p>Per qualsiasi informazione, non esitate a contattarci via WhatsApp:</p>
            {(groomNumber || brideNumber) && (
              <div className="whatsapp-section">
                <div className="whatsapp-buttons">
                  {groomNumber && (
                    <a href={getWaLink(groomNumber)} target="_blank" rel="noreferrer" className="whatsapp-link">
                      <FaWhatsapp size={20} /> {groomName}
                    </a>
                  )}
                  {brideNumber && (
                    <a href={getWaLink(brideNumber)} target="_blank" rel="noreferrer" className="whatsapp-link">
                      <FaWhatsapp size={20} /> {brideName}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'rsvp':
        return (
          <div className="expanded-content rsvp-expanded">
            <h2>Conferma la tua Partecipazione</h2>
            
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

            {isEditing ? (
              <div className="rsvp-form">
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
              </div>
            ) : (
              <div className={rsvpStatus === 'confirmed' ? 'rsvp-confirmed' : 'rsvp-declined'}>
                <h3>{rsvpStatus === 'confirmed' ? '✅ Partecipazione Confermata!' : '😔 Ci dispiace'}</h3>
                <p>{rsvpStatus === 'confirmed' ? 'Non vediamo l\'ora di vedervi!' : 'Grazie per averci avvisato.'}</p>
                <button onClick={handleReset} className="edit-response-btn">Modifica risposta</button>
              </div>
            )}

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        );
      default:
        return <p>Contenuto non disponibile</p>;
    }
  };

  return (
    <motion.div
      className="letter-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="letter-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '620px', aspectRatio: '2/3' }}>
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
                  
                  <motion.div
                      className="wax-seal"
                      initial={{ x: -100, y: 100, scale: 1.5, opacity: 0, rotate: -30 }}
                      animate={sealControls}
                      style={{ 
                          position: 'absolute',
                          bottom: '1rem',
                          left: '1rem',
                          width: '36%',
                          maxWidth: '90px',
                          zIndex: 30,
                          pointerEvents: 'none'
                      }}
                  >
                      <img src={waxImg} alt="Seal" style={{ width: '100%', height: '100%', dropShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                  </motion.div>
              </div>

              {/* BACK FACE - CARD GRID */}
              <div className="flip-card-back" style={{ backgroundImage: `url(${letterBg})` }}>
                  <div className="letter-paper">
                      {/* CARD GRID */}
                      <div className="card-grid">
                        {Object.keys(cards).map(card => (
                          <motion.div
                            key={card}
                            layoutId={`${card}`}
                            onClick={() => handleCardClick(card)}
                            style={{ cursor: 'pointer' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <PaperModal>
                              <div className="info-card">
                                <img src={cards[card].icon} alt={cards[card].title} className="card-icon" />
                                <h3 className="card-title">{cards[card].title}</h3>
                              </div>
                            </PaperModal>
                          </motion.div>
                        ))}
                        
                        {/* RSVP Card - Full Width */}
                        <motion.div
                          layoutId="card-rsvp"
                          onClick={() => handleCardClick('rsvp')}
                          style={{ cursor: 'pointer', gridColumn: '1 / -1' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <PaperModal>
                            <div className="info-card rsvp-card">
                              <h3 className="card-title">RSVP - Conferma Presenza</h3>
                            </div>
                          </PaperModal>
                        </motion.div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* FAB */}
        <Fab
          onClick={() => handleFlip(!isFlipped)}
          isFlipped={isFlipped}
          visible={!expandedCard}
        />
      </div>

      {/* EXPANDED CARD MODAL */}
      {ReactDOM.createPortal(
        <AnimatePresence>
            {expandedCard && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="card-modal-overlay"
                    onClick={handleCloseExpanded}
                >
                    <motion.div 
                        layoutId={`${expandedCard}`}
                        className="card-modal-content"
                        style={{ 
                            width: '90vw', 
                            maxWidth: '600px', 
                            height: 'auto',
                            maxHeight: '85vh',
                            position: 'relative',
                            background: 'transparent', 
                            boxShadow: 'none',
                            pointerEvents: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <PaperModal style={{ width: '100%'}}>
                            <div style={{ padding: '2.5rem 1.5rem', position: 'relative' }}>
                                <motion.button 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="close-modal-btn" 
                                    onClick={handleCloseExpanded}
                                >
                                    ✕
                                </motion.button>
                                <motion.div>
                                    <img src={cards[expandedCard].icon} alt={cards[expandedCard].title} className="card-icon" />
                                    <h3 className="card-title">{cards[expandedCard].title}</h3>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    {renderCardContent(expandedCard)}
                                </motion.div>
                            </div>
                        </PaperModal>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default LetterContent;
