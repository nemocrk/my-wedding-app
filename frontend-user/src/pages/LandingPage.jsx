// frontend-user/src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

// Components
import WelcomeCover from '../components/WelcomeCover';
import Envelope3D from '../components/Envelope3D';
import InvitationCard from '../components/InvitationCard';
import ActionButtons from '../components/ActionButtons';
import RsvpModal from '../components/RsvpModal';

const LandingPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitation, setInvitation] = useState(null);
  
  // Flow State
  const [step, setStep] = useState('cover'); // cover -> envelope -> card
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const data = await api.getInvitation(code);
        setInvitation(data);
        
        // TRACKING "READ" STATUS
        // Se l'invito è in stato 'sent', lo passiamo a 'read' automaticamente
        if (data.status === 'sent') {
          try {
            // Chiamata silenziosa, non blocca il rendering in caso di errore
            await api.updateInvitationStatus(data.id, 'read');
            // Aggiorniamo lo stato locale per coerenza
            setInvitation(prev => ({ ...prev, status: 'read' }));
          } catch (trackingError) {
            console.error("Failed to track read status", trackingError);
          }
        }
        
      } catch (err) {
        console.error("Error loading invitation", err);
        setError("Invito non trovato o codice errato.");
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchInvitation();
    }
  }, [code]);

  const handleOpenEnvelope = () => {
    setStep('card');
  };

  const handleRsvpSuccess = async () => {
    // Ricarica i dati aggiornati
    const data = await api.getInvitation(code);
    setInvitation(data);
    setIsRsvpOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">💔</div>
          <h2 className="text-2xl font-serif text-gray-800 mb-2">Ooops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f5] overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {/* STEP 1: COVER SCREEN */}
        {step === 'cover' && (
          <motion.div
            key="cover"
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0 z-30"
          >
            <WelcomeCover 
              guestName={invitation.name} 
              onEnter={() => setStep('envelope')} 
            />
          </motion.div>
        )}

        {/* STEP 2: ENVELOPE OPENING */}
        {step === 'envelope' && (
          <motion.div
            key="envelope"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-4 perspective-1000"
          >
            <Envelope3D onOpen={handleOpenEnvelope} />
          </motion.div>
        )}

        {/* STEP 3: INVITATION CARD & ACTIONS */}
        {step === 'card' && (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative z-10 w-full min-h-screen flex flex-col items-center py-8 px-4 md:px-0 overflow-y-auto"
          >
            <InvitationCard invitation={invitation} />
            
            <div className="mt-8 mb-12 w-full max-w-md">
              <ActionButtons 
                invitation={invitation} 
                onRsvpClick={() => setIsRsvpOpen(true)} 
              />
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODALS */}
      {isRsvpOpen && (
        <RsvpModal 
          isOpen={isRsvpOpen}
          onClose={() => setIsRsvpOpen(false)}
          invitation={invitation}
          onSuccess={handleRsvpSuccess}
        />
      )}
    </div>
  );
};

export default LandingPage;
