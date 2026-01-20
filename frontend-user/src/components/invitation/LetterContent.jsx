import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaWhatsapp } from 'react-icons/fa';
import archIcon from '../../assets/illustrations/arch.png';
import chestIcon from '../../assets/illustrations/chest.png';
import dressIcon from '../../assets/illustrations/dress.png';
import homeIcon from '../../assets/illustrations/home.png';
import letterBg from '../../assets/illustrations/LetterBackground.png';
import questionsIcon from '../../assets/illustrations/questions.png';
import vanIcon from '../../assets/illustrations/van.png';
import waxImg from '../../assets/illustrations/wax.png';
import { useConfigurableText } from '../../contexts/TextContext';
import { heatmapTracker, logInteraction } from '../../services/analytics';
import { submitRSVP } from '../../services/api';
import Fab from '../common/Fab';
import PaperModal from '../layout/PaperModal';
import './LetterContent.css';

const LetterContent = ({ data }) => {
  const { t } = useTranslation();
  const { getText } = useConfigurableText();
  const [rsvpStatus, setRsvpStatus] = useState(data.status || 'created');
  const [accommodationRequested, setAccommodationRequested] = useState(data.accommodation_requested || false);
  const [transferRequested, setTransferRequested] = useState(data.transfer_requested || false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const isReplayMode = useRef(window.self !== window.top); // Ref to track replay mode without re-rendering for logic checks

  // WIZARD STEP STATE: 'summary' | 'guests' | 'contact' | 'travel' | 'accommodation' | 'final'
  const [rsvpStep, setRsvpStep] = useState(['confirmed', 'declined'].includes(rsvpStatus) ? 'summary' : 'guests');

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
  const waName = data.whatsapp.whatsapp_name;

  // Helper per logging condizionale
  const safeLogInteraction = (eventName, details) => {
    if (!isReplayMode.current) {
      logInteraction(eventName, details);
    }
  };

  const getWaLink = (number, customMessage) => {
    const msg = customMessage || t('whatsapp.default_message', { guest_name: data.name });
    safeLogInteraction('whatsapp_link_generated', { recipient: waName, has_custom_message: !!customMessage });
    return `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  // RSVP Status Messages
  const getRSVPStatusMessageCompact = () => {
    switch (rsvpStatus) {
      case 'created':
      case 'sent':
      case 'read':
      case 'pending':
        return { emoji: t('rsvp.status.pending.emoji'), text: t('rsvp.status.pending.text'), className: 'rsvp-card-status-pending' };
      case 'confirmed':
        return { emoji: t('rsvp.status.confirmed.emoji'), text: t('rsvp.status.confirmed.text'), className: 'rsvp-card-status-confirmed' };
      case 'declined':
        return { emoji: t('rsvp.status.declined.emoji'), text: t('rsvp.status.declined.text'), className: 'rsvp-card-status-declined' };
      default:
        return { emoji: t('rsvp.status.unknown.emoji'), text: t('rsvp.status.unknown.text'), className: 'rsvp-card-status-pending' };
    }
  };

  // Wizard Step Titles
  const getStepTitle = () => {
    switch (rsvpStep) {
      case 'summary': return t('rsvp.steps.summary.title');
      case 'guests': return t('rsvp.steps.guests.title');
      case 'contact': return t('rsvp.steps.contact.title');
      case 'travel': return t('rsvp.steps.travel.title');
      case 'accommodation': return t('rsvp.steps.accommodation.title');
      case 'final': return t('rsvp.steps.final.title');
      default: return 'RSVP';
    }
  };

  // Guest Management
  const toggleGuestExclusion = (guestIndex) => {
    const isExcluding = !excludedGuests.includes(guestIndex);
    setExcludedGuests(prev =>
      prev.includes(guestIndex) ? prev.filter(idx => idx !== guestIndex) : [...prev, guestIndex]
    );
    safeLogInteraction('toggle_guest_exclusion', {
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
    safeLogInteraction('start_edit_guest', {
      guestIndex,
      original_name: `${guest.first_name} ${guest.last_name || ''}`
    });
  };

  const handleSaveEdit = (guestIndex) => {
    const originalGuest = data.guests[guestIndex];
    setEditedGuests(prev => ({ ...prev, [guestIndex]: { first_name: tempFirstName, last_name: tempLastName } }));
    setEditingGuestIndex(null);
    safeLogInteraction('save_edit_guest', {
      guestIndex,
      original_name: `${originalGuest.first_name} ${originalGuest.last_name || ''}`,
      new_name: `${tempFirstName} ${tempLastName}`
    });
  };

  const handleCancelEdit = () => {
    safeLogInteraction('cancel_edit_guest', { guestIndex: editingGuestIndex });
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
    safeLogInteraction('start_edit_phone', { has_existing_phone: !!phoneNumber });
  };

  const handleSaveEditPhone = () => {
    const trimmed = tempPhoneNumber.trim();
    if (!trimmed) {
      setPhoneError(t('rsvp.validation.phone_required'));
      safeLogInteraction('phone_validation_error', { error: 'empty' });
      return;
    }
    if (!validatePhoneNumber(trimmed)) {
      setPhoneError(t('rsvp.validation.phone_invalid'));
      safeLogInteraction('phone_validation_error', { error: 'invalid_format' });
      return;
    }
    setPhoneNumber(trimmed);
    setEditingPhone(false);
    setPhoneError('');
    safeLogInteraction('save_edit_phone', {
      original_phone: phoneNumber,
      new_phone: trimmed
    });
    return;
  };

  const handleCancelEditPhone = () => {
    setEditingPhone(false);
    setTempPhoneNumber('');
    setPhoneError('');
    safeLogInteraction('cancel_edit_phone');
  };

  // Step Navigation with Validation
  const handleNextStep = () => {
    // Validazione Step Guests
    if (rsvpStep === 'guests') {
      editingGuestIndex !== null && handleSaveEdit(editingGuestIndex);
      if (getActiveGuests().length === 0) {
        setMessage({ type: 'error', text: t('rsvp.validation.no_guests') });
        safeLogInteraction('rsvp_validation_error', { step: 'guests', error: 'no_active_guests' });
        return;
      }
      setMessage(null);
      safeLogInteraction('rsvp_next_step', { from: 'guests', to: 'contact', active_guests: getActiveGuests().length });
      setRsvpStep('contact');
    }
    // Validazione Step Contact
    else if (rsvpStep === 'contact') {
      if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
        if (editingPhone) {
          const trimmed = tempPhoneNumber.trim();
          if (!trimmed) {
            setMessage({ type: 'error', text: t('rsvp.validation.phone_required') });
            safeLogInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_empty' });
            return;
          }
          if (!validatePhoneNumber(trimmed)) {
            setMessage({ type: 'error', text: t('rsvp.validation.phone_invalid') });
            safeLogInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_invalid' });
            return;
          }
          setPhoneNumber(trimmed);
          setEditingPhone(false);
          setPhoneError('');
        } else {
          setMessage({ type: 'error', text: t('rsvp.validation.phone_empty') });
          safeLogInteraction('rsvp_validation_error', { step: 'contact', error: 'phone_missing' });
          return;
        }
      }
      setMessage(null);
      safeLogInteraction('rsvp_next_step', { from: 'contact', to: 'travel' });
      setRsvpStep('travel');
    }
    // Validazione Step Travel
    else if (rsvpStep === 'travel') {
      if (!travelInfo.transport_type || !travelInfo.schedule) {
        setMessage({ type: 'error', text: t('rsvp.validation.travel_incomplete') });
        safeLogInteraction('rsvp_validation_error', {
          step: 'travel',
          error: 'incomplete_fields',
          missing_transport: !travelInfo.transport_type,
          missing_schedule: !travelInfo.schedule
        });
        return;
      }
      setMessage(null);
      const nextStep = data.accommodation_offered ? 'accommodation' : 'final';
      safeLogInteraction('rsvp_next_step', { from: 'travel', to: nextStep });
      setRsvpStep(nextStep);
    }
    // Step Accommodation -> Final
    else if (rsvpStep === 'accommodation') {
      setMessage(null);
      safeLogInteraction('rsvp_next_step', { from: 'accommodation', to: 'final', accommodation_requested: accommodationChoice });
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

    safeLogInteraction('rsvp_back_step', { from: fromStep, to: toStep });
  };

  const handleStartModify = () => {
    setRsvpStep('guests');
    safeLogInteraction('start_modify_rsvp', { current_status: rsvpStatus });
  };

  // Final Submit
  const handleRSVP = async (status) => {
    setSubmitting(true);
    setMessage(null);
    safeLogInteraction('click_rsvp_submit', {
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
        safeLogInteraction('rsvp_submit_success', {
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
        safeLogInteraction('rsvp_submit_error', { status, error: result.message });
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      console.error('Errore RSVP:', err);
      safeLogInteraction('rsvp_submit_exception', { status, error: err.message });
      setMessage({ type: 'error', text: err.message || t('invitation.errors.connection') });
    } finally {
      setSubmitting(false);
    }
  };

  // Travel Form Handlers with Analytics
  const handleTransportChange = (transport_type) => {
    setTravelInfo({ ...travelInfo, transport_type, car_option: 'none' });
    safeLogInteraction('travel_transport_selected', { transport_type });
  };

  const handleScheduleChange = (schedule) => {
    setTravelInfo({ ...travelInfo, schedule });
  };

  const handleScheduleBlur = () => {
    if (travelInfo.schedule) {
      safeLogInteraction('travel_schedule_entered', { schedule_length: travelInfo.schedule.length, schedule_text: travelInfo.schedule });
    }
  };

  const handleCarOptionChange = (car_option) => {
    setTravelInfo({ ...travelInfo, car_option });
    safeLogInteraction('travel_car_option_selected', { car_option });
  };

  const handleCarpoolChange = (carpool_interest) => {
    setTravelInfo({ ...travelInfo, carpool_interest });
    safeLogInteraction('travel_carpool_toggle', { interested: carpool_interest });
  };

  // Accommodation Handler with Analytics
  const handleAccommodationChange = (requested) => {
    setAccommodationChoice(requested);
    safeLogInteraction('accommodation_choice_toggle', {
      requested,
      was_previously_requested: accommodationRequested
    });
  };

  useEffect(() => {
    // Analytics initialization
    // Check if we are in an iframe and if the parent context suggests replay mode
    // (This is a safety check, but the main driver is the message event)
    const isInsideIframe = window.self !== window.top;

    // Only start tracker if NOT in replay mode (default assumption is normal mode unless told otherwise)
    if (!isReplayMode.current) {
      heatmapTracker.start();
      logInteraction('view_letter', {
        status: rsvpStatus,
        has_phone: !!data.phone_number,
        guests_count: data.guests.length,
        is_iframe: isInsideIframe
      });
    }

    const handleReplayMessage = (event) => {
      if (!event?.data) return;
      const { type, payload } = event.data;

      // If we receive ANY replay message, we confirm we are in replay mode
      if (['REPLAY_START', 'REPLAY_RESET', 'REPLAY_ACTION'].includes(type)) {
        if (!isReplayMode.current) {
          isReplayMode.current = true;
          heatmapTracker.stop(); // Stop heatmap immediately if we detect replay activity
          console.log("Replay Mode Activated: Analytics disabled");
        }
      }

      // REPLAY SIMULATOR: Handle mapped analytics events
      switch (type) {
        case 'REPLAY_RESET':
          isReplayMode.current = true; // Force True
          heatmapTracker.stop();
          setRsvpStatus('read');
          setRsvpStep('guests');
          setExcludedGuests([]);
          setEditedGuests({});
          setPhoneNumber(data.phone_number || '');
          setTravelInfo({ transport_type: '', schedule: '', car_option: 'none', carpool_interest: false });
          setAccommodationChoice(false);
          setExpandedCard(null);
          setIsFlipped(false);
          setMessage(null);
          break;
        case 'REPLAY_ACTION':
          switch (payload?.action) {

            case 'card_flip':
              if (payload?.details?.flipped !== undefined) setIsFlipped(payload.details.flipped);
              break;

            case 'card_expand':
              if (payload?.details?.card) {
                setExpandedCard(payload.details.card);
                // Sync step logic if opening RSVP
                if (payload.details.card === 'rsvp') {
                  const targetStep = !['created', 'sent', 'read'].includes(rsvpStatus) ? 'summary' : 'guests';
                  setRsvpStep(targetStep);
                }
              }
              break;

            case 'card_collapse':
              setExpandedCard(null);
              break;

            case 'toggle_guest_exclusion':
              if (payload?.details?.guestIndex !== undefined) {
                setExcludedGuests(prev =>
                  prev.includes(payload.details.guestIndex) ? prev.filter(idx => idx !== payload.details.guestIndex) : [...prev, payload.details.guestIndex]
                );
              }
              break;

            case 'start_edit_guest':
              if (payload?.details?.guestIndex !== undefined) {
                const guest = data.guests[payload.details.guestIndex];
                const edited = editedGuests[payload.details.guestIndex] || guest;
                setEditingGuestIndex(payload.details.guestIndex);
                setTempFirstName(edited.first_name);
                setTempLastName(edited.last_name || '');
              }
              break;

            case 'save_edit_guest':
              if (payload?.details?.guestIndex !== undefined) {
                setEditedGuests(prev => ({ ...prev, [payload.details.guestIndex]: { first_name: tempFirstName, last_name: tempLastName } }));
                setEditingGuestIndex(null);
              }
              break;

            case 'cancel_edit_guest':
              setEditingGuestIndex(null);
              setTempFirstName('');
              setTempLastName('');
              break;

            case 'rsvp_next_step':
              if (payload?.details?.to) setRsvpStep(payload.details.to);
              break;

            case 'rsvp_back_step':
              if (payload?.details?.to) setRsvpStep(payload.details.to);
              break;

            case 'start_edit_phone':
              setEditingPhone(true);
              setTempPhoneNumber(phoneNumber);
              break;

            case 'save_edit_phone':
              setPhoneNumber(tempPhoneNumber);
              setEditingPhone(false);
              break;

            case 'cancel_edit_phone':
              setEditingPhone(false);
              setTempPhoneNumber('');
              break;

            case 'travel_transport_selected':
              if (payload?.details?.transport_type) {
                setTravelInfo(prev => ({ ...prev, transport_type: payload.details.transport_type, car_option: 'none' }));
              }
              break;

            case 'travel_schedule_entered':
              if (payload?.details?.schedule_text) {
                setTravelInfo(prev => ({ ...prev, schedule: payload.details.schedule_text }));
              }
              break;

            case 'travel_car_option_selected':
              if (payload?.details?.car_option) {
                setTravelInfo(prev => ({ ...prev, car_option: payload.details.car_option }));
              }
              break;

            case 'travel_carpool_toggle':
              if (payload?.details?.interested !== undefined) {
                setTravelInfo(prev => ({ ...prev, carpool_interest: payload.details.interested }));
              }
              break;

            case 'accommodation_choice_toggle':
              if (payload?.details?.requested !== undefined) {
                setAccommodationChoice(payload.details.requested);
              }
              break;

            case 'rsvp_submit_success':
              if (payload?.details?.status) {
                setRsvpStatus(payload.details.status);
                setRsvpStep('summary');
                setMessage({ type: 'success', text: 'RSVP simulato con successo!' });
              }
              break;

            default:
              break;
          }
          break;

        default:
          break;
      }
    };

    const onSealReturn = () => {
      sealControls.start({
        rotate: 0,
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
    const timer = setTimeout(() => sealControls.start({ opacity: 1 }), 500);

    return () => {
      heatmapTracker.stop();
      window.removeEventListener('message', handleReplayMessage);
      window.removeEventListener('wax-seal:return', onSealReturn);
      clearTimeout(timer);
    };
  }, [sealControls, data.phone_number, data.guests.length, rsvpStatus, editingGuestIndex, tempFirstName, tempLastName, tempPhoneNumber, phoneNumber, editingPhone, travelInfo, accommodationChoice, editedGuests, excludedGuests]);

  const handleFlip = (flipped) => {
    setIsFlipped(flipped);
    safeLogInteraction('card_flip', { flipped, side: flipped ? 'back' : 'front' });
  };

  const handleCardClick = (cardId) => {
    setExpandedCard(cardId);
    safeLogInteraction('card_expand', { card: cardId });
    if (cardId === 'rsvp') {
      const targetStep = !['created', 'sent', 'read'].includes(rsvpStatus) ? 'summary' : 'guests';
      setRsvpStep(targetStep);
      safeLogInteraction('rsvp_card_opened', { starting_step: targetStep, current_status: rsvpStatus });
    }
  };

  const handleCloseExpanded = () => {
    safeLogInteraction('card_collapse', { card: expandedCard });
    setExpandedCard(null);
  };

  const handleWhatsAppClick = (recipient) => {
    safeLogInteraction('whatsapp_click', { recipient, context: expandedCard || 'unknown' });
  };

  const cards = {
    'alloggio': { title: t('cards.alloggio.title'), icon: homeIcon },
    'viaggio': { title: t('cards.viaggio.title'), icon: vanIcon },
    'evento': { title: t('cards.evento.title'), icon: archIcon },
    'dresscode': { title: t('cards.dresscode.title'), icon: dressIcon },
    'bottino': { title: t('cards.bottino.title'), icon: chestIcon },
    'cosaltro': { title: t('cards.cosaltro.title'), icon: questionsIcon },
  };

  const decorateDefaultCardContent = (cardId, children) => {
    return (
      <div className="expanded-content">
        <div className="card-header">
          <img src={cards[expandedCard]?.icon} alt={cards[cardId]?.title} className="card-icon" />
          <h2>{t(cards[cardId]?.title)}</h2>
        </div>
        {children}
      </div>
    )
  }

  const renderCardContent = (cardId) => {

    switch (cardId) {
      case 'alloggio':
        return decorateDefaultCardContent(cardId,
          data.accommodation_offered ? (
            <div dangerouslySetInnerHTML={{ __html: getText('card.alloggio.content_offered') }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: getText('card.alloggio.content_not_offered') }} />
          )
        );
      case 'viaggio':
        return decorateDefaultCardContent(cardId,
          <div dangerouslySetInnerHTML={{ __html: getText('card.viaggio.content') }} />
        );
      case 'evento':
        return decorateDefaultCardContent(cardId,
          <div className="letter-body">
            <div dangerouslySetInnerHTML={{ __html: getText('card.evento.content') }} />
          </div>
        );
      case 'dresscode':
        return decorateDefaultCardContent(cardId,
          <div dangerouslySetInnerHTML={{ __html: getText('card.dresscode.content') }} />
        );
      case 'bottino':
        return decorateDefaultCardContent(cardId,
          <div dangerouslySetInnerHTML={{ __html: getText('card.bottino.content') }} />
        );
      case 'cosaltro':
        return decorateDefaultCardContent(cardId,
          <>
            <div dangerouslySetInnerHTML={{ __html: getText('card.cosaltro.content') }} />
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
          </>
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
                      ? t('rsvp.messages.already_confirmed')
                      : t('rsvp.messages.declined')}
                  </p>
                  <div className="final-summary">
                    <h3>{t('rsvp.labels.summary')}</h3>
                    <p><strong>{t('rsvp.labels.guests')}</strong> {getActiveGuests().map(g => `${g.first_name} ${g.last_name || ''}`).join(', ')}</p>
                    <p><strong>{t('rsvp.labels.phone')}</strong> {phoneNumber}</p>
                    <p><strong>{t('rsvp.labels.transport')}</strong> {travelInfo.transport_type} - {travelInfo.schedule}</p>
                    {data.accommodation_offered && (
                      <p><strong>{t('rsvp.labels.accommodation')}</strong> {accommodationChoice ? t('rsvp.options.yes') : t('rsvp.options.no')}</p>
                    )}
                  </div>
                </div>
                <button className="rsvp-next-btn" onClick={handleStartModify}>
                  {t('rsvp.buttons.modify_answer')}
                </button>
              </div>
            )}

            {/* STEP 1: OSPITI */}
            {rsvpStep === 'guests' && (
              <>
                <div className="guests-list-editable">
                  <h3>{t('rsvp.labels.guests')}</h3>
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
                                  placeholder={t('rsvp.labels.name_placeholder')}
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  className="guest-input"
                                  value={tempLastName}
                                  onChange={(e) => setTempLastName(e.target.value)}
                                  placeholder={t('rsvp.labels.lastname_placeholder')}
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
                                {displayGuest.is_child && <span className="badge">{t('badges.child')}</span>}
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
                    <p>{t('whatsapp.alert_modify_confirmed')}</p>
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

                <button className="rsvp-next-btn" onClick={handleNextStep}>{t('rsvp.buttons.next')}</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 2: CONTATTO */}
            {rsvpStep === 'contact' && (
              <>
                <div className="phone-field">
                  <h3>{t('rsvp.labels.phone')}</h3>
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
                      <span className="phone-number">{phoneNumber || t('rsvp.messages.not_specified')}</span>
                      <button className="guest-action-btn edit" onClick={handleStartEditPhone}>✏️</button>
                    </div>
                  )}
                </div>

                <button className="rsvp-next-btn" onClick={handleNextStep}>{t('rsvp.buttons.next')}</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>{t('rsvp.buttons.back')}</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 3: VIAGGIO */}
            {rsvpStep === 'travel' && (
              <>
                <div className="travel-form">
                  <h3>{t('rsvp.labels.transport')}</h3>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="transport"
                      value="traghetto"
                      checked={travelInfo.transport_type === 'traghetto'}
                      onChange={(e) => handleTransportChange(e.target.value)}
                    />
                    {t('rsvp.options.ferry')}
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="transport"
                      value="aereo"
                      checked={travelInfo.transport_type === 'aereo'}
                      onChange={(e) => handleTransportChange(e.target.value)}
                    />
                    {t('rsvp.options.plane')}
                  </label>

                  <h3>{t('rsvp.labels.schedule')}</h3>
                  <input
                    type="text"
                    className="travel-input"
                    value={travelInfo.schedule}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    onBlur={handleScheduleBlur}
                    placeholder={t('rsvp.labels.schedule_placeholder')}
                  />

                  {travelInfo.transport_type === 'traghetto' && (
                    <>
                      <h3>{t('rsvp.labels.car')}</h3>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={travelInfo.car_option === 'proprio'}
                          onChange={(e) => handleCarOptionChange(e.target.checked ? 'proprio' : 'none')}
                        />
                        {t('rsvp.options.car_with')}
                      </label>
                    </>
                  )}

                  {travelInfo.transport_type === 'aereo' && (
                    <>
                      <h3>{t('rsvp.options.car_rental')}</h3>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={travelInfo.car_option === 'noleggio'}
                          onChange={(e) => handleCarOptionChange(e.target.checked ? 'noleggio' : 'none')}
                        />
                        {t('rsvp.options.car_rental')}
                      </label>
                    </>
                  )}

                  {(!travelInfo.car_option || travelInfo.car_option === 'none') && travelInfo.transport_type && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={travelInfo.carpool_interest}
                        onChange={(e) => handleCarpoolChange(e.target.checked)}
                      />
                      {t('rsvp.options.carpool_interest')}
                    </label>
                  )}
                </div>

                <button className="rsvp-next-btn" onClick={handleNextStep}>{t('rsvp.buttons.next')}</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>{t('rsvp.buttons.back')}</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}

            {/* STEP 4: ALLOGGIO */}
            {rsvpStep === 'accommodation' && data.accommodation_offered && (
              <>
                <div className="accommodation-form">
                  <h3>{t('rsvp.options.accommodation_question')}</h3>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={accommodationChoice}
                      onChange={(e) => handleAccommodationChange(e.target.checked)}
                    />
                    {t('rsvp.options.accommodation_yes')}
                  </label>

                  {/* Alert se modifica da accepted a rejected */}
                  {accommodationRequested && !accommodationChoice && (
                    <div className="whatsapp-alert">
                      <p>{t('whatsapp.alert_modify_confirmed')}</p>
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

                <button className="rsvp-next-btn" onClick={handleNextStep}>{t('rsvp.buttons.next')}</button>
                <button className="rsvp-back-btn" onClick={handleBackStep}>{t('rsvp.buttons.back')}</button>
              </>
            )}

            {/* STEP 5: CONFERMA FINALE */}
            {rsvpStep === 'final' && (
              <>
                <div className="final-summary">
                  <h3>{t('rsvp.labels.summary')}</h3>
                  <p><strong>{t('rsvp.labels.guests')}</strong> {getActiveGuests().map(g => `${g.first_name} ${g.last_name || ''}`).join(', ')}</p>
                  <p><strong>{t('rsvp.labels.phone')}</strong> {phoneNumber}</p>
                  <p><strong>{t('rsvp.labels.transport')}</strong> {travelInfo.transport_type} - {travelInfo.schedule}</p>
                  {data.accommodation_offered && (
                    <p><strong>{t('rsvp.labels.accommodation')}</strong> {accommodationChoice ? t('rsvp.options.yes') : t('rsvp.options.no')}</p>
                  )}
                </div>

                {/* Alert se già confermato e declina */}
                {rsvpStatus === 'declined' ? (
                  <div className="whatsapp-alert">
                    <p>{t('whatsapp.alert_confirm_after_decline')}</p>
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
                    {!['confirmed', 'declined'].includes(rsvpStatus) && (
                      <button className="rsvp-button confirm" onClick={() => handleRSVP('confirmed')} disabled={submitting}>
                        {submitting ? t('rsvp.labels.loading') : `${t('rsvp.buttons.confirm_presence')}`}
                      </button>
                    )}
                    {['confirmed', 'declined'].includes(rsvpStatus) && (
                      <button className="rsvp-button save" onClick={() => handleRSVP(rsvpStatus)} disabled={submitting}>
                        {submitting ? t('rsvp.labels.loading') : `${t('rsvp.buttons.save_changes')}`}
                      </button>
                    )}
                    {rsvpStatus !== 'declined' && (
                      <button className="rsvp-button decline" onClick={() => handleRSVP('declined')} disabled={submitting}>
                        {submitting ? t('rsvp.labels.loading') : `${t('rsvp.buttons.decline')}`}
                      </button>
                    )}
                  </div>
                  )}
                <button className="rsvp-back-btn" onClick={handleBackStep}>{t('rsvp.buttons.back')}</button>
                {message && <div className={`message ${message.type}`}>{message.text}</div>}
              </>
            )}
          </div>
        );
      default:
        return <p>{t('cards.not_available.title')}</p>;
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
                {/* Dynamically render Front Face content from configurable text */}
                <div className="dynamic-front-content" dangerouslySetInnerHTML={{ __html: getText('envelope.front.content', "Domenico & Loredana") }} />
              </div>
              <motion.div className="wax-seal" initial={{ rotate: -30 }} animate={sealControls}>
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
                        <h3 className="card-title">RSVP - {t('rsvp.title')}</h3>
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
