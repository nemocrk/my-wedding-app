import React from 'react';
import { motion } from 'framer-motion';
import './LetterContent.css';

const LetterContent = ({ data }) => {
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

        <div className="cta-section">
          <button className="rsvp-button">Conferma Partecipazione</button>
        </div>
      </div>
    </motion.div>
  );
};

export default LetterContent;
