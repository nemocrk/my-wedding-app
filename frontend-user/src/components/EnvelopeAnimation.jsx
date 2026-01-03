import React from 'react';
import { motion } from 'framer-motion';
import './EnvelopeAnimation.css';

const EnvelopeAnimation = ({ onComplete }) => {
  const envelopeVariants = {
    initial: {
      scale: 0.1,
      rotate: 0,
      x: '-50vw',
      y: '50vh',
      opacity: 0
    },
    flying: {
      scale: [0.1, 0.5, 0.8, 1],
      rotate: [0, 360, 720, 1080],
      x: ['50vw', '-30vw', '20vw', 0],
      y: ['-50vh', '30vh', '-20vh', 0],
      opacity: 1,
      transition: {
        duration: 3,
        times: [0, 0.3, 0.6, 1],
        ease: 'easeInOut'
      }
    },
    centered: {
      scale: 1,
      rotate: 1080,
      x: 0,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const flapVariants = {
    closed: { rotateX: 0 },
    open: {
      rotateX: -180,
      transition: { delay: 3.5, duration: 1, ease: 'easeOut' }
    }
  };

  const letterVariants = {
    hidden: { y: 0, opacity: 0 },
    visible: {
      y: -300,
      opacity: 1,
      transition: { delay: 4.5, duration: 1.5, ease: 'easeOut' }
    }
  };

  return (
    <motion.div
      className="envelope-container"
      initial="initial"
      animate="flying"
      onAnimationComplete={onComplete}
    >
      <motion.svg
        width="400"
        height="300"
        viewBox="0 0 400 300"
        variants={envelopeVariants}
        style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
      >
        {/* Corpo Busta */}
        <motion.rect
          x="50"
          y="100"
          width="300"
          height="180"
          fill="#f4e8d8"
          stroke="#d4c4b4"
          strokeWidth="2"
        />

        {/* Linguetta (Flap) */}
        <motion.g
          style={{ transformOrigin: '200px 100px', transformStyle: 'preserve-3d' }}
          variants={flapVariants}
          initial="closed"
          animate="open"
        >
          <polygon
            points="50,100 200,50 350,100"
            fill="#e8d8c8"
            stroke="#d4c4b4"
            strokeWidth="2"
          />
        </motion.g>

        {/* Decorazione Sigillo */}
        <circle cx="200" cy="100" r="15" fill="#c9a581" opacity="0.8" />
        <text x="200" y="107" fontSize="16" fill="#fff" textAnchor="middle">♥</text>

        {/* Lettera che esce */}
        <motion.g variants={letterVariants} initial="hidden" animate="visible">
          <rect x="80" y="120" width="240" height="160" fill="#fffef7" stroke="#333" strokeWidth="1" />
          <line x1="100" y1="145" x2="280" y2="145" stroke="#333" strokeWidth="1" opacity="0.3" />
          <line x1="100" y1="165" x2="280" y2="165" stroke="#333" strokeWidth="1" opacity="0.3" />
          <line x1="100" y1="185" x2="280" y2="185" stroke="#333" strokeWidth="1" opacity="0.3" />
        </motion.g>
      </motion.svg>
    </motion.div>
  );
};

export default EnvelopeAnimation;
