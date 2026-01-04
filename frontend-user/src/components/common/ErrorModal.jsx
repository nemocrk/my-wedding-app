// frontend-user/src/components/ErrorModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import sadFaceUrl from '../assets/illustrations/sad-face.svg';

const ErrorModal = ({ error, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);

  // If no error, don't render anything (controlled by parent state usually)
  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 60,
          backdropFilter: 'blur(4px)',
          fontFamily: "'Georgia', serif" // Theme consistency
        }}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '28rem',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          
          {/* Header con pulsante chiusura */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
            <button 
              onClick={onClose}
              style={{
                color: '#9ca3af',
                padding: '0.25rem',
                borderRadius: '9999px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = '#4b5563'}
              onMouseOut={(e) => e.target.style.color = '#9ca3af'}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            
            {/* Custom SVG Sad Face */}
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, backgroundColor: '#fee2e2', borderRadius: '9999px', filter: 'blur(12px)', opacity: 0.5
              }}></div>
              <img 
                src={sadFaceUrl} 
                alt="Sad Face" 
                style={{ width: 80, height: 80, position: 'relative', zIndex: 10 }}
              />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
              Ops! Qualcosa non va
            </h3>
            
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
              {error.userMessage || "Non siamo riusciti a completare l'operazione richiesta."}
            </p>

            {/* Error Details Section */}
            <div style={{ width: '100%' }}>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                  fontSize: '0.875rem', fontWeight: '500', color: '#dc2626',
                  marginBottom: '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer'
                }}
              >
                {showDetails ? 'Nascondi dettagli tecnici' : 'Mostra dettagli errore'}
                <span style={{ marginLeft: '0.25rem', display: 'flex' }}>
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              <div style={{
                maxHeight: showDetails ? '15rem' : '0',
                opacity: showDetails ? 1 : 0,
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
                backgroundColor: '#fef2f2',
                borderRadius: '0.5rem',
                border: '1px solid #fee2e2',
                textAlign: 'left'
              }}>
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#991b1b', wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {error.message || JSON.stringify(error, null, 2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              style={{
                marginTop: '2rem', width: '100%',
                backgroundColor: '#dc2626', color: 'white', fontWeight: '600',
                padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.2s',
                fontFamily: 'system-ui, sans-serif'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
            >
              Ho capito, chiudi
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorModal;