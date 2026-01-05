import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EnvelopeAnimation.css'; // Manteniamo il CSS per layout di base
import flapImg from '../../assets/illustrations/flap.png';
import noFlapImg from '../../assets/illustrations/no-flap.png';
import pocketImg from '../../assets/illustrations/pocket.png';
import waxImg from '../../assets/illustrations/wax.png';
import LetterContent from './LetterContent';

const EnvelopeAnimation = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    // 1. FLY-IN ANIMATION (Arrivo della busta)
    const containerVariants = {
        hidden: { 
            scale: 0.1, 
            opacity: 0, 
            x: '-100vw', 
            rotate: -720 
        },
        visible: { 
            scale: 1, 
            opacity: 1, 
            x: 0, 
            rotate: 0,
            transition: { 
                duration: 2, 
                ease: "circOut",
                when: "beforeChildren"
            }
        },
        exit: {
            opacity: 0,
            transition: { duration: 1 }
        }
    };

    // 2. WAX SEAL ANIMATION (Rimozione Sigillo)
    const waxVariants = {
        attached: { scale: 1, x: '-50%', y: 0, opacity: 1 },
        removed: { 
            x: 200, 
            y: -200, 
            opacity: 0, 
            scale: 0.5,
            transition: { duration: 0.8, ease: "backIn" }
        },
        reentry: {
            x: -250, // In alto a sinistra rispetto al centro della lettera
            y: -250,
            opacity: 1,
            scale: 0.8,
            transition: { delay: 0.5, duration: 0.8, type: "spring" }
        }
    };

    // 3. FLAP ANIMATION (Apertura Busta)
    const flapVariants = {
        closed: { rotateX: 0, zIndex: 4 },
        open: { 
            rotateX: 180, 
            zIndex: 1, 
            transition: { duration: 0.8, ease: "easeInOut" } 
        }
    };

    // 4. LETTER ANIMATION (Uscita Lettera)
    const letterVariants = {
        inside: { y: 20, zIndex: 2, scale: 0.8, opacity: 0 },
        outside: { 
            y: -150, 
            zIndex: 5, 
            scale: 1, 
            opacity: 1,
            transition: { duration: 1.5, ease: "easeOut" } 
        },
        reading: {
            y: 0,
            scale: 1.1,
            zIndex: 10,
            transition: { duration: 1 }
        }
    };

    // Orchestratore della sequenza
    const handleSequence = async () => {
        // Step 1: Arrivo completato (gestito da 'visible')
        await new Promise(r => setTimeout(r, 2500)); 
        setStep(1); // Rimuovi ceralacca

        await new Promise(r => setTimeout(r, 1000));
        setStep(2); // Apri busta

        await new Promise(r => setTimeout(r, 1000));
        setStep(3); // Esci lettera
        
        await new Promise(r => setTimeout(r, 1500));
        setStep(4); // Rientra ceralacca su lettera
        
        // Callback fine animazione (opzionale, se serve al padre)
        if (onComplete) setTimeout(onComplete, 3000);
    };

    return (
        <motion.div 
            className="envelope-container-3d"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onAnimationComplete={handleSequence}
        >
            <div className="envelope-wrapper">
                {/* BACK */}
                <img src={noFlapImg} className="layer back" alt="Back" />

                {/* LETTER (Sostituisce LetterContent SVG statico) */}
                <motion.div 
                    className="layer letter-container"
                    variants={letterVariants}
                    initial="inside"
                    animate={step >= 3 ? "outside" : "inside"}
                >
                     {/* Qui potremmo iniettare il vero contenuto o un'immagine placeholder per ora */}
                     <div className="dummy-letter">
                        <h3>Invito al Matrimonio</h3>
                        <p>Siete invitati...</p>
                        {/* Sigillo che rientra */}
                        <motion.img 
                            src={waxImg} 
                            className="wax-on-letter"
                            variants={waxVariants}
                            initial="removed"
                            animate={step === 4 ? "reentry" : "removed"}
                        />
                     </div>
                </motion.div>

                {/* POCKET */}
                <img src={pocketImg} className="layer pocket" alt="Pocket" />

                {/* FLAP */}
                <motion.div 
                    className="layer flap-container"
                    variants={flapVariants}
                    animate={step >= 2 ? "open" : "closed"}
                    style={{ transformOrigin: "top" }}
                >
                    <img src={flapImg} className="flap-img" alt="Flap" />
                    
                    {/* WAX SEAL (Iniziale) */}
                    <AnimatePresence>
                        {step < 1 && (
                            <motion.img 
                                src={waxImg} 
                                className="wax-img" 
                                variants={waxVariants}
                                initial="attached"
                                exit="removed"
                                alt="Wax Seal"
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default EnvelopeAnimation;
