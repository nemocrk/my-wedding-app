import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './Fab.css';
import rightArrow from '../../assets/illustrations/right-arrow.png';

const Fab = ({ onClick, isFlipped, visible = true }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          className={`wedding-fab ${isFlipped ? 'is-flipped' : 'is-front'}`}
          onClick={onClick}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          aria-label={isFlipped ? "Torna alla copertina" : "Gira invito"}
        >
          <motion.img 
            src={rightArrow} 
            alt="Navigation Arrow" 
            className="fab-icon"
            animate={{ 
              rotate: isFlipped ? 180 : 0 
            }}
            transition={{ duration: 0.4, ease: "backOut" }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default Fab;
