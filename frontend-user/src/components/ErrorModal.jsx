import React from 'react';

const ErrorModal = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        maxWidth: '90%',
        width: '400px',
        animation: 'fadeIn 0.3s ease-out',
        fontFamily: "'Georgia', serif" // User theme font
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>😢</div>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          color: '#ef4444', 
          fontSize: '1.5rem', 
          fontWeight: 'bold' 
        }}>
          Ops! Qualcosa non va
        </h2>
        <p style={{ 
          margin: '0 0 1.5rem 0', 
          color: '#4b5563',
          lineHeight: '1.5'
        }}>
          {error.message || "Si è verificato un errore imprevisto."}
        </p>
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            fontFamily: 'inherit'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
        >
          Chiudi
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ErrorModal;
