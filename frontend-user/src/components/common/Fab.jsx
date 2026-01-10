import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import './Fab.css';

const Fab = ({ onClick, isFlipped, visible = true }) => {
  return ReactDOM.createPortal(
    <AnimatePresence>
      {visible && (
        <motion.button
          className="wedding-fab"
          onClick={onClick}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={isFlipped ? "Torna indietro" : "Gira invito"}
        >
          <motion.div
            key={isFlipped ? 'back' : 'front'}
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 180, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isFlipped ? <RotateCcw size={24} color="#8B4513" /> : <ArrowRight size={24} color="#8B4513" />}
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Fab;
