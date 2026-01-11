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
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  
  // WIZARD STEP STATE: 'summary' | 'guests' | 'contact' | 'travel' | 'accommodation' | 'final'
  const [rsvpStep, setRsvpStep] = useState(rsvpStatus !== 'pending' ? 'summary' : 'guests');
  
  // Step 1: Ospiti
  const [excludedGuests, setExcludedGuests] = useState([]);
  const [editingGuestIndex, setEditingGuestIndex] = useState(null);
  const [editedGuests, setEditedGuests] = useState({});
  const [tempFirstName, setTempFirstName] = useState('');
  const [tempLastName, setTempLastName] = useState('');
  
  // Step 2: Contatto
  const [phoneNumber, setPhoneNumber] = useState(data.phone_number || '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Step 3: Viaggio
  const [travelInfo, setTravelInfo] = useState(data.travel_info || {
    transport_type: '', // 'traghetto' | 'aereo'
    schedule: '',
    car_option: 'none', // 'noleggio' | 'proprio' | false
    carpool_interest: false
  });
  
  // Step 4: Alloggio
  const [accommodationChoice, setAccommodationChoice] = useState(accommodationRequested);

  const sealControls = useAnimation();
  
  const waNumber = data.whatsapp.whatsapp_number;
  const waName = data.whatsapp.whatsapp_name || "Sposi";

  const getWaLink = (number, customMessage) => {
    const msg = customMessage || `Ciao, sono ${data.name}, avrei una domanda!`;
    logInteraction('whatsapp_link_generated', { recipient: waName, has_custom_message: !!customMessage });
    return `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  // RSVP Status Messages
  const getRSVPStatusMessageCompact = () => {
    switch(rsvpStatus) {
      case 'pending':
        return { emoji: '⏳', text: 'Cosa aspetti? Conferma subito!', className: 'rsvp-card-status-pending' };
      case 'confirmed':
        return { emoji: '🎉', text: 'Magnifico! Ti aspettiamo!!!', className: 'rsvp-card-status-confirmed' };
      case 'declined':
        return { emoji: '😢', text: 'Faremo un brindisi per te!', className: 'rsvp-card-status-declined' };
      default:
        return { emoji: '❓', text: 'Conferma o declina', className: 'rsvp-card-status-pending' };
    }
  };

  // Wizard Step Titles
  const getStepTitle = () => {
    switch(rsvpStep) {
      case 'summary': return 'Il tuo RSVP';
      case 'guests': return 'Conferma Ospiti';
      case 'contact': return 'Numero di Contatto';
      case 'travel': return 'Come Viaggerai?';
      case 'accommodation': return 'Alloggio';
      case 'final': return 'Conferma Finale';
      default: return 'RSVP';
    }
  };

  // Guest Management
  const toggleGuestExclusion = (guestIndex) => {
    const isExcluding = !excludedGuests.includes(guestIndex);
    setExcludedGuests(prev => 
      prev.includes(guestIndex) ? prev.filter(idx => idx !== guestIndex) : [...prev, guestIndex]
    );
    logInteraction('toggle_guest_exclusion', { 
      guestIndex, 
      action: isExcluding ? 'exclude' : 'include',
      guest_name: data.guests[guestIndex].first_name
    });
  };

  const handleStartEdit = (guestIndex) => {
    const guest = data.guests[guestIndex];
    const edited = editedGuests[guestIndex] || guest;
    setEditingGuestIndex(guestIndex);
    setTempFirstName(edited.first_name);
    setTempLastName(edited.last_name || '');
    logInteraction('start_edit_guest', { 
      guestIndex,
      original_name: `${guest.first_name} ${guest.last_name || ''}`
    });
  };

  const handleSaveEdit = (guestIndex) => {
    const originalGuest = data.guests[guestIndex];
    setEditedGuests(prev => ({ ...prev, [guestIndex]: { first_name: tempFirstName, last_name: tempLastName } }));
    setEditingGuestIndex(null);
    logInteraction('save_edit_guest', { 
      guestIndex,
      original_name: `${originalGuest.first_name} ${originalGuest.last_name || ''}`,
      new_name: `${tempFirstName} ${tempLastName}`
    });
  };

  const handleCancelEdit = () => {
    logInteraction('cancel_edit_guest', { guestIndex: editingGuestIndex });
    setEditingGuestIndex(null);
    setTempFirstName('');
    setTempLastName('');
  };

  const getGuestDisplayName = (guestIndex) => {
    const guest = data.guests[guestIndex];
    return editedGuests[guestIndex] ? { ...editedGuests[guestIndex], is_child: guest.is_child } : guest;
  };

  const getActiveGuests = () => data.guests.filter((_, idx) => !excludedGuests.includes(idx));

  // Phone Validation
  const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^\+?[0-9]{8,15}$/.test(cleaned);
  };

  const handleStartEditPhone = () => {
    setEditingPhone(true);
    setTempPhoneNumber(phoneNumber);
    setPhoneError('');
    logInteraction('start_edit_phone', { has_existing_phone: !!phoneNumber });
  };

  const handleSaveEditPhone = () => {
    const trimmed = tempPhoneNumber.trim();
    if (!trimmed) {
      setPhoneError('Il numero di telefono è obbligatorio');
      logInteraction('phone_validation_error', { error: 'empty' });
      return;
    }
    if (!validatePhoneNumber(trimmed)) {
      setPhoneError('Formato non valido (es: +39 333 1234567)');
      logInteraction('phone_validation_error', { error: 'invalid_format' });
      return;
    }
    setPhoneNumber(trimmed);
    setEditingPhone(false);
    setPhoneError('');
    logInteraction('save_edit_phone', { 
      original_phone: phoneNumber,
      new_phone: trimmed
    });
    return;
  };

  const handleCancelEditPhone = () => {
    setEditingPhone(false);
    setTempPhoneNumber('');
    setPhoneError('');
    logInteraction('cancel_edit_phone');
  };

  // Step Navigation with Validation
  const handleNextStep = () => {
    // Validazione Step Guests
    if (rsvpStep === 'guests') {
      editingGuestIndex !== null & handleSaveEdit(editingGuestIndex);
      if (getActiveGuests().length === 0) {
        setMessage({ type: 'error', text: 'Devi confermare almeno un ospite!' });
        logInteraction('rsvp_validation_error', { step: 'guests', error: 'no_active_guests' });
        return;
      }
      setMessage(null);
      logInteraction('rsvp_next_step', { from: 'guests', to: 'contact', active_guests: getActiveGuests().length });
      setRsvpStep('contact');
    }
    // Validazione Step Contact
    else if (rsvpStep === 'contact') {
      if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
        if(editingPhone){
          const trimmed = tempPhoneNumber.trim();
          if (!trimmed) {
            setMessage({ type: 'error', text: 'Il numero di telefono è obbligatorio'});
            logInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_empty' });
            return;
          }
          if (!validatePhoneNumber(trimmed)) {
            setMessage({ type: 'error', text: 'Formato non valido (es: +39 333 1234567)'});
            logInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_invalid' });
            return;
          }
          setPhoneNumber(trimmed);
          setEditingPhone(false);
          setPhoneError('');
        } else {
          setMessage({ type: 'error', text: 'Inserisci un numero di telefono valido!' });
          logInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_missing' });
          return;
        }
      }
      setMessage(null);
      logInteraction('rsvp_next_step', { from: 'contact', to: 'travel' });
      setRsvpStep('travel');
    }
    // Validazione Step Travel
    else if (rsvpStep === 'travel') {
      if (!travelInfo.transport_type || !travelInfo.schedule) {
        setMessage({ type: 'error', text: 'Compila tutti i campi del viaggio!' });
        logInteraction('rsvp_validation_error', { 
          step: 'travel', 
          error: 'incomplete_fields',
          missing_transport: !travelInfo.transport_type,
          missing_schedule: !travelInfo.schedule
        });
        return;
      }
      setMessage(null);
      const nextStep = data.accommodation_offered ? 'accommodation' : 'final';
      logInteraction('rsvp_next_step', { from: 'travel', to: nextStep });
      setRsvpStep(nextStep);
    }
    // Step Accommodation -> Final
    else if (rsvpStep === 'accommodation') {
      setMessage(null);
      logInteraction('rsvp_next_step', { from: 'accommodation', to: 'final', accommodation_requested: accommodationChoice });
      setRsvpStep('final');
    }
  };

  const handleBackStep = () => {
    setMessage(null);
    let fromStep = rsvpStep;
    let toStep = '';
    
    if (rsvpStep === 'contact') {
      toStep = 'guests';
      setRsvpStep('guests');
    }
    else if (rsvpStep === 'travel') {
      toStep = 'contact';
      setRsvpStep('contact');
    }
    else if (rsvpStep === 'accommodation') {
      toStep = 'travel';
      setRsvpStep('travel');
    }
    else if (rsvpStep === 'final') {
      toStep = data.accommodation_offered ? 'accommodation' : 'travel';
      setRsvpStep(toStep);
    }
    
    logInteraction('rsvp_back_step', { from: fromStep, to: toStep });
  };

  const handleStartModify = () => {
    setRsvpStep('guests');
    logInteraction('start_modify_rsvp', { current_status: rsvpStatus });
  };

  // Final Submit
  const handleRSVP = async (status) => {
    setSubmitting(true);
    setMessage(null);
    logInteraction('click_rsvp_submit', { 
      status_chosen: status,
      previous_status: rsvpStatus,
      active_guests: getActiveGuests().length,
      accommodation_requested: accommodationChoice
    });

    try {
      const payload = {
        phone_number: phoneNumber,
        guest_updates: editedGuests,
        excluded_guests: excludedGuests,
        travel_info: travelInfo,
      };

      const result = await submitRSVP(
        status,
        status === 'confirmed' ? accommodationChoice : false,
        false, // transferRequested deprecato
        payload
      );

      if (result.success) {
        logInteraction('rsvp_submit_success', { 
          status, 
          active_guests: getActiveGuests().length,
          travel_type: travelInfo.transport_type,
          car_option: travelInfo.car_option,
          accommodation_requested: accommodationChoice
        });
        setRsvpStatus(status);
        setRsvpStep('summary');
        setMessage({ type: 'success', text: result.message });
      } else {
        logInteraction('rsvp_submit_error', { status, error: result.message });
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Errore RSVP:', err);
      logInteraction('rsvp_submit_exception', { status, error: err.message });
      setMessage({ type: 'error', text: err.message || 'Errore di connessione.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Travel Form Handlers with Analytics
  const handleTransportChange = (transport_type) => {
    setTravelInfo({ ...travelInfo, transport_type, car_option: 'none' });
    logInteraction('travel_transport_selected', { transport_type });
  };

  const handleScheduleChange = (schedule) => {
    setTravelInfo({ ...travelInfo, schedule });
  };

  const handleScheduleBlur = () => {
    if (travelInfo.schedule) {
      logInteraction('travel_schedule_entered', { schedule_length: travelInfo.schedule.length });
    }
  };

  const handleCarOptionChange = (car_option) => {
    setTravelInfo({ ...travelInfo, car_option });
    logInteraction('travel_car_option_selected', { car_option });
  };

  const handleCarpoolChange = (carpool_interest) => {
    setTravelInfo({ ...travelInfo, carpool_interest });
    logInteraction('travel_carpool_toggle', { interested: carpool_interest });
  };

  // Accommodation Handler with Analytics
  const handleAccommodationChange = (requested) => {
    setAccommodationChoice(requested);
    logInteraction('accommodation_choice_toggle', { 
      requested,
      was_previously_requested: accommodationRequested
    });
  };

  useEffect(() => {
    heatmapTracker.start();
    logInteraction('view_letter', { 
      status: rsvpStatus,
      has_phone: !!data.phone_number,
      guests_count: data.guests.length
    });

    const handleReplayMessage = (event) => {
      if (!event?.data?.type) return;
      if (event.data.type === 'REPLAY_RESET') {
        logInteraction('replay_reset_triggered');
        setRsvpStatus('pending');
        setRsvpStep('guests');
        setExcludedGuests([]);
        setEditedGuests({});
        setPhoneNumber(data.phone_number || '');
        setTravelInfo({ transport_type: '', schedule: '', car_option: 'none', carpool_interest: false });
        setAccommodationChoice(false);
      }
    };

    window.addEventListener('message', handleReplayMessage);
    const timer = setTimeout(() => sealControls.start({ opacity: 1, scale: 1, x: 0, y: 0 }), 500);

    return () => {
      heatmapTracker.stop();
      window.removeEventListener('message', handleReplayMessage);
      clearTimeout(timer);
    };
  }, [sealControls, data.phone_number, data.guests.length, rsvpStatus]);

  const handleFlip = (flipped) => {
    setIsFlipped(flipped);
    logInteraction('card_flip', { flipped, side: flipped ? 'back' : 'front' });
  };

  const handleCardClick = (cardId) => {
    setExpandedCard(cardId);
    logInteraction('card_expand', { card: cardId });
    if (cardId === 'rsvp') {
      const targetStep = rsvpStatus !== 'pending' ? 'summary' : 'guests';
      setRsvpStep(targetStep);
      logInteraction('rsvp_card_opened', { starting_step: targetStep, current_status: rsvpStatus });
    }
  };

  const handleCloseExpanded = () => {
    logInteraction('card_collapse', { card: expandedCard });
    setExpandedCard(null);
  };

  const handleWhatsAppClick = (recipient) => {
    logInteraction('whatsapp_click', { recipient, context: expandedCard || 'unknown' });
  };

  const cards = {
    'alloggio': { title: 'Alloggio', icon: homeIcon },
    'viaggio': { title: 'Viaggio', icon: vanIcon },
    'evento': { title: 'Evento', icon: archIcon },
    'dresscode': { title: 'Dress Code', icon: dressIcon },
    'bottino': { title: 'Bottino di nozze', icon: chestIcon },
    'cosaltro': { title: "Cos'altro?", icon: questionsIcon },
  };

  const renderCardContent = (cardId) => {
    switch (cardId) {
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
            <p>Informazioni sui trasporti e come raggiungere la location.</p>
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
            <p>Eleganti ma comodi! Tacchi a spillo vietati sulla sabbia!</p>
          </div>
        );
      case 'bottino':
        return (
          <div className="expanded-content">
            <h2>Lista Nozze</h2>
            <p>La vostra presenza è il regalo più grande!</p>
            <p><em>Dettagli IBAN in arrivo!</em></p>
          </div>
        );
      case 'cosaltro':
        return (
          <div className="expanded-content">
            <h2>Hai domande?</h2>
            <p>Contattaci via WhatsApp:</p>
            {(waNumber) && (
              <div className="whatsapp-section">
                <div className="whatsapp-buttons">
                  <a 
                    href={getWaLink(waNumber)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="whatsapp-link"
                    onClick={() => handleWhatsAppClick(waName)}
                  >
                    <FaWhatsapp size={20} /> {waName}
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      case 'rsvp':
        return (
          <div className="expanded-content rsvp-expanded">
            <h2 className="rsvp-modal-title">{getStepTitle()}</h2>

            {/* PAGINA RIEPILOGO (se già confermato) */}
            {rsvpStep === 'summary' && (
              <div className="rsvp-summary-page">
                <div className="summary-status">
                  <p className="summary-text">
                    {rsvpStatus === 'confirmed'
                      ? 'Hai già confermato la tua presenza!'
                      : 'Hai declinato l\'invito.'}
                  </p>
                  <div className="final-summary">
                    <h3>Riepilogo:</h3>
                    <p><strong>Ospiti:</strong> {getActiveGuests().map(g => `${g.first_name} ${g.last_name || ''}`).join(', ')}</p>
                    <p><strong>Telefono:</strong> {phoneNumber}</p>
                    <p><strong>Trasporto:</strong> {travelInfo.transport_type} - {travelInfo.schedule}</p>
                    {data.accommodation_offered && (
                      <p><strong>Alloggio:</strong> {accommodationChoice ? 'Sì' : 'No'}</p>
                    )}
                  </div>
                </div>
                <button className="rsvp-next-btn" onClick={handleStartModify}>
                  Modifica Risposta
                </button>
              </div>
            )}

            {/* STEP 1: OSPITI */}
            {rsvpStep === 'guests' && (
              <>
                <div className="guests-list-editable">
                  <h3>Ospiti invitati:</h3>
                  <ul>
                    {data.guests.map((guest, idx) => {
                      const displayGuest = getGuestDisplayName(idx);
                      const isEditing = editingGuestIndex === idx;
                      const isExcluded = excludedGuests.includes(idx);

                      return (
                        <li key={idx} className={isExcluded ? 'guest-excluded' : ''}>
                          {isEditing ? (
                            <>
                              <div className="guest-edit-inputs">
                                <input
                                  type="text"
                                  className="guest-input"
                                  value={tempFirstName}
                                  onChange={(e) => setTempFirstName(e.target.value)}
                                  placeholder="Nome"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  className="guest-input"
                                  value={tempLastName}
                                  onChange={(e) => setTempLastName(e.target.value)}
                                  placeholder="Cognome"
                                />
                              </div>
                              <div className="guest-actions">
                                <button className="guest-action-btn save" onClick={() => handleSaveEdit(idx)}>✓</button>
                                <button className="guest-action-btn cancel" onClick={handleCancelEdit}>✕</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="guest-name">
                                {displayGuest.first_name} {displayGuest.last_name || ''}
                                {displayGuest.is_child && <span className="badge">Bambino</span>}
                              </span>
                              <div className="guest-actions">
                                <button className="guest-action-btn edit" onClick={() => handleStartEdit(idx)}>✏️</button>
                                <button className="guest-action-btn exclude" onClick={() => toggleGuestExclusion(idx)}>✕</button>
                              </div>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Alert se già confermato e vuole escludere tutti */}
                {rsvpStatus === 'confirmed' && getActiveGuests().length === 0 && (
                  <div className="whatsapp-alert">
                    <p>⚠️ Hai già confermato! Per modificare contatta gli sposi:</p>
                      {(waNumber) && (
                        <div className="whatsapp-section">
                          <div className="whatsapp-buttons">
                            <a 
                              href={getWaLink(waNumber)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="whatsapp-link"
                              onClick={() => handleWhatsAppClick(waName)}
                            >
                              <FaWhatsapp size={20} /> {waName}
                            </a>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                <button className="rsvp-next-btn" onClick={handleNextStep}>Avanti →</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 2: CONTATTO */}
            {rsvpStep === 'contact' && (
              <>
                <div className="phone-field">
                  <h3>Numero di contatto:</h3>
                  {editingPhone ? (
                    <>
                      <div className="phone-edit-container">
                        <input
                          type="tel"
                          className="phone-input"
                          value={tempPhoneNumber}
                          onChange={(e) => setTempPhoneNumber(e.target.value)}
                          placeholder="+39 333 1234567"
                          autoFocus
                        />
                        <div className="guest-actions">
                          <button className="guest-action-btn save" onClick={handleSaveEditPhone}>✓</button>
                          <button className="guest-action-btn cancel" onClick={handleCancelEditPhone}>✕</button>
                        </div>
                      </div>
                      {phoneError && <div className="phone-error">{phoneError}</div>}
                    </>
                  ) : (
                    <div className="phone-display">
                      <span className="phone-number">{phoneNumber || 'Non specificato'}</span>
                      <button className="guest-action-btn edit" onClick={handleStartEditPhone}>✏️</button>
                    </div>
                  )}
                </div>

                <button className="rsvp-next-btn" onClick={handleNextStep}>Avanti →</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>← Indietro</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 3: VIAGGIO */}
            {rsvpStep === 'travel' && (
              <>
                <div className="travel-form">
                  <h3>Tipo di trasporto:</h3>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="transport"
                      value="traghetto"
                      checked={travelInfo.transport_type === 'traghetto'}
                      onChange={(e) => handleTransportChange(e.target.value)}
                    />
                    Traghetto
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="transport"
                      value="aereo"
                      checked={travelInfo.transport_type === 'aereo'}
                      onChange={(e) => handleTransportChange(e.target.value)}
                    />
                    Aereo
                  </label>

                  <h3>Orari:</h3>
                  <input
                    type="text"
                    className="travel-input"
                    value={travelInfo.schedule}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    onBlur={handleScheduleBlur}
                    placeholder="es: Partenza 10:00, Arrivo 14:00"
                  />

                  {travelInfo.transport_type === 'traghetto' && (
                    <>
                      <h3>Auto:</h3>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={travelInfo.car_option === 'proprio'}
                          onChange={(e) => handleCarOptionChange(e.target.checked ? 'proprio' : 'none')}
                        />
                        Auto al seguito
                      </label>
                    </>
                  )}

                  {travelInfo.transport_type === 'aereo' && (
                    <>
                      <h3>Noleggio Auto:</h3>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={travelInfo.car_option === 'noleggio'}
                          onChange={(e) => handleCarOptionChange(e.target.checked ? 'noleggio' : 'none')}
                        />
                        Noleggerò un'auto
                      </label>
                    </>
                  )}

                  {!travelInfo.car_option && travelInfo.transport_type && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={travelInfo.carpool_interest}
                        onChange={(e) => handleCarpoolChange(e.target.checked)}
                      />
                      Sarebbe carino organizzarmi con qualcun altro
                    </label>
                  )}
                </div>

                <button className="rsvp-next-btn" onClick={handleNextStep}>Avanti →</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>← Indietro</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 4: ALLOGGIO */}
            {rsvpStep === 'accommodation' && data.accommodation_offered && (
              <>
                <div className="accommodation-form">
                  <h3>Vuoi richiedere l'alloggio per la notte tra il 19 e il 20 settembre?</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={accommodationChoice}
                      onChange={(e) => handleAccommodationChange(e.target.checked)}
                    />
                    Sì, richiedo l'alloggio
                  </label>

                  {/* Alert se modifica da accepted a rejected */}
                  {accommodationRequested && !accommodationChoice && (
                    <div className="whatsapp-alert">
                      <p>⚠️ Avevi già accettato! Contatta gli sposi:</p>
                      {(waNumber) && (
                        <div className="whatsapp-section">
                          <div className="whatsapp-buttons">
                            <a 
                              href={getWaLink(waNumber)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="whatsapp-link"
                              onClick={() => handleWhatsAppClick(waName)}
                            >
                              <FaWhatsapp size={20} /> {waName}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button className="rsvp-next-btn" onClick={handleNextStep}>Avanti →</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>← Indietro</button>
              </>
            )}

            {/* STEP 5: CONFERMA FINALE */}
            {rsvpStep === 'final' && (
              <>
                <div className="final-summary">
                  <h3>Riepilogo:</h3>
                  <p><strong>Ospiti:</strong> {getActiveGuests().map(g => `${g.first_name} ${g.last_name || ''}`).join(', ')}</p>
                  <p><strong>Telefono:</strong> {phoneNumber}</p>
                  <p><strong>Trasporto:</strong> {travelInfo.transport_type} - {travelInfo.schedule}</p>
                  {data.accommodation_offered && (
                    <p><strong>Alloggio:</strong> {accommodationChoice ? 'Sì' : 'No'}</p>
                  )}
                </div>

                {/* Alert se già confermato e declina */}
                {rsvpStatus === 'declined' ? (
                  <div className="whatsapp-alert">
                    <p>⚠️ Se vuoi confermare dopo aver declinato, contatta gli sposi:</p>
                    {(waNumber) && (
                      <div className="whatsapp-section">
                        <div className="whatsapp-buttons">
                          <a 
                            href={getWaLink(waNumber)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="whatsapp-link"
                            onClick={() => handleWhatsAppClick(waName)}
                          >
                            <FaWhatsapp size={20} /> {waName}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )
                :
                (<div className="button-group">
                  {rsvpStatus === 'pending' && (
                    <button className="rsvp-button confirm" onClick={() => handleRSVP('confirmed')} disabled={submitting}>
                    {submitting ? 'Invio...' : '✔️ Conferma Presenza'}
                  </button> )}
                  {(rsvpStatus === 'confirmed' ||  rsvpStatus === 'declined') && (
                  <button className="rsvp-button save" onClick={() => handleRSVP(rsvpStatus)} disabled={submitting}>
                    {submitting ? 'Invio...' : '💾 Salva Modifiche'}
                  </button> )}
                  {(rsvpStatus === 'pending' || rsvpStatus === 'confirmed') && (
                  <button className="rsvp-button decline" onClick={() => handleRSVP('declined')} disabled={submitting}>
                    {submitting ? 'Invio...' : '❌ Declina'}
                  </button> )}
                </div>
                )}
                <button className="rsvp-back-btn" onClick={handleBackStep}>← Indietro</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}
          </div>
        );
      default:
        return <p>Contenuto non disponibile</p>;
    }
  };

  const rsvpCardStatus = getRSVPStatusMessageCompact();

  return (
    <motion.div className="letter-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="letter-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '620px', aspectRatio: '2/3' }}>
        <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
          <div className="flip-card-inner">
            {/* FRONT FACE */}
            <div className="flip-card-front" style={{ backgroundImage: `url(${letterBg})` }}>
              <div className="front-content">
                <div className="spacer-top"></div>
                <h1 className="text-names">Domenico & Loredana</h1>
                <p className="text-wit">Abbiamo deciso di fare il grande passo...<br />e di farlo a piedi nudi!</p>
                <p className="text-date">Ci sposiamo il 19 Settembre 2026<br />sulla spiaggia di Golfo Aranci</p>
                <p className="text-details">(Sì! in Sardegna!!)<br />Preparatevi a scambiare le scarpe strette con la sabbia tra le dita. Vi promettiamo:</p>
                <div className="text-details" style={{ fontWeight: 500 }}>Poca formalità • Molto spritz • Un tramonto indimenticabile</div>
                <p className="text-dress">Dress Code: Beach Chic<br /><span style={{ fontSize: '0.7em', display: 'block', marginTop: '5px', opacity: 0.8 }}>(I tacchi a spillo sono i nemici numero uno della sabbia!)</span></p>
              </div>
              <motion.div className="wax-seal" initial={{ x: -100, y: 100, scale: 1.5, opacity: 0, rotate: -30 }} animate={sealControls} style={{ position: 'absolute', bottom: '1rem', left: '1rem', width: '36%', maxWidth: '90px', zIndex: 30, pointerEvents: 'none' }}>
                <img src={waxImg} alt="Seal" style={{ width: '100%', height: '100%' }} />
              </motion.div>
            </div>

            {/* BACK FACE */}
            <div className="flip-card-back" style={{ backgroundImage: `url(${letterBg})` }}>
              <div className="letter-paper">
                <div className="card-grid">
                  {Object.keys(cards).map(card => (
                    <motion.div key={card} onClick={() => handleCardClick(card)} style={{ cursor: 'pointer' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <PaperModal>
                        <div className="info-card">
                          <img src={cards[card].icon} alt={cards[card].title} className="card-icon" />
                          <h3 className="card-title">{cards[card].title}</h3>
                        </div>
                      </PaperModal>
                    </motion.div>
                  ))}
                  <motion.div onClick={() => handleCardClick('rsvp')} style={{ cursor: 'pointer', gridColumn: '1 / -1' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <PaperModal>
                      <div className="info-card rsvp-card">
                        <h3 className="card-title">RSVP - Conferma Presenza</h3>
                        <div className={`rsvp-card-status ${rsvpCardStatus.className}`}>
                          <span className="rsvp-card-emoji">{rsvpCardStatus.emoji}</span>
                          <span className="rsvp-card-text">{rsvpCardStatus.text}</span>
                        </div>
                      </div>
                    </PaperModal>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Fab onClick={() => handleFlip(!isFlipped)} isFlipped={isFlipped} visible={!expandedCard} />
      </div>

      {/* MODAL */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {expandedCard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="card-modal-overlay" onClick={handleCloseExpanded}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="card-modal-content" onClick={(e) => e.stopPropagation()}>
                <PaperModal style={{ width: '100%' }}>
                  <div style={{ padding: '2.5rem 1.5rem', position: 'relative' }}>
                    <motion.button className="close-modal-btn" onClick={handleCloseExpanded}>✕</motion.button>
                    <div style={{ marginBottom: '1rem' }}>
                      <img src={cards[expandedCard]?.icon} alt={cards[expandedCard]?.title} className="card-icon" />
                      <h3 className="card-title">{cards[expandedCard]?.title}</h3>
                    </div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ delay: 0.15 }}>
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
