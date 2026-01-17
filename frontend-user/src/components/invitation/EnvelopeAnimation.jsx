import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './EnvelopeAnimation.css'; // Manteniamo il CSS per layout di base
import flapImg from '../../assets/illustrations/flap.png';
import noFlapImg from '../../assets/illustrations/no-flap.png';
import pocketImg from '../../assets/illustrations/pocket.png';
import waxImg from '../../assets/illustrations/wax.png';
import LetterContent from './LetterContent';

const EnvelopeAnimation = ({ onComplete, invitationData }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [finalY, setFinalY] = useState(-50); // Default fallback

    // Gestione Responsività: Scala tutto in base alla larghezza del device
    useEffect(() => {
        const handleResize = () => {
            const margin = 16; // 1rem per lato di margine di sicurezza
            // Calcolo posizione finale per centrare la lettera estratta
            const calculatedFinalY = -((window.innerHeight - (Math.min(window.innerWidth - (margin * 2), 620) * 358 / 620) ) / 2);
            setFinalY(calculatedFinalY);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. FLY-IN ANIMATION
    const containerVariants = {
        hidden: { scale: 0.1, opacity: 0, x: '-100vw', rotate: -720 },
        visible: { 
            scale: 1, opacity: 1, x: 0, rotate: 0,
            transition: { duration: 2, ease: "circOut", when: "beforeChildren" }
        },
        exit: { opacity: 0, transition: { duration: 1 } }
    };

    // 2. WAX SEAL ANIMATION (Rimozione)
    const waxVariants = {
        attached: { scale: 1, x: '-50%', y: 0, opacity: 1 },
        removed: { 
            x: '100vw', y: '-100vh', opacity: 1, scale: 0.8,
            transition: { duration: 0.6, ease: "easeIn" }
        },
        folded: { 
            x: '-200%', y: '0px', opacity: 1, scale: 0.6, zIndex: 2,
            transition: { duration: 1, ease: "easeOut" }
        }
    };

    // 3. FLAP ANIMATION
    const flapVariants = {
        closed: { rotateX: 0, zIndex: 4 },
        open: { rotateX: 180, transition: { duration: 0.6, ease: "easeInOut" } },
        openBack: { rotateX: 180, zIndex: 1 }
    };

    // 4. LETTER ANIMATION
    const letterVariants = {
        inside: { 
            zIndex: 2, y: 0, scale: 0.95, opacity: 1,
            pointerEvents: "none", transition: { duration: 0 }
        },
        extracted: { 
            y: "-100vh", // Estrazione parziale iniziale
            zIndex: 2, scale: 1, opacity: 1,
            transition: { duration: 1.5, ease: "easeInOut"},
            pointerEvents: "none"
        },
        final: {
            y: finalY, // Posizione finale di lettura
            zIndex: 10, scale: 1,
            transition: { duration: 1, ease: "easeInOut" },
            pointerEvents: "auto"
        }
    };

    // Orchestratore della sequenza
    const handleSequence = async () => {
        // Step 1: Arrivo (gestito da 'visible') - Attesa implicita
        await new Promise(r => setTimeout(r, 500)); // Durata fly-in

        setStep(1); // Rimuovi ceralacca
        await new Promise(r => setTimeout(r, 600));
        
        setStep(2); // Apri busta
        await new Promise(r => setTimeout(r, 600));

        setStep(2.5); // Imbusta ceralacca
        await new Promise(r => setTimeout(r, 1200));

        setStep(3); // Estrai lettera
        await new Promise(r => setTimeout(r, 1500));
        
        setStep(4); // Posizionamento finale
        await new Promise(r => setTimeout(r, 1000));
        
        // Step 5: Dispatch Evento Sigillo + Completamento
        setStep(5);
        window.dispatchEvent(new CustomEvent('wax-seal:return'));
        
        // Notifica il padre che l'animazione è finita (ma lasciamo il componente montato se serve transizione)
        if (onComplete) onComplete();
    };

    const getLetterState = () => {
        if (step < 3) return "inside";
        if (step === 3) return "extracted";
        return "final";
    };

    return (
        <motion.div 
            className="envelope-container-3d"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onAnimationComplete={() => handleSequence()} // Start sequence after fly-in
        >
            <motion.div 
                className="envelope-wrapper"
                initial="clipped"
                style={{ 
                    clipPath: step < 4 ? "inset(-200% 0 0 0)" : "none" // Rimuovi clip alla fine
                }}
            >
                {/* BACK LAYER */}
                <img src={noFlapImg} className="layer back" alt="Back" />

                {/* LETTER LAYER */}
                <motion.div 
                    className="layer letter-container"
                    variants={letterVariants}
                    initial="inside" 
                    animate={getLetterState()}
                >
                     {/* Dummy Letter wrapper per l'animazione */}
                     <div className="dummy-letter" style={{ height: '100vh', overflowY: 'auto' }}>
                        {/* 
                           Qui renderizziamo LetterContent ma solo come "preview" visiva.
                           Il vero LetterContent interattivo verrà montato da InvitationPage su onComplete.
                           NOTA: Per evitare duplicazioni o stati complessi, qui potremmo mostrare solo un placeholder visivo
                           o la stessa LetterContent con pointer-events-none.
                        */}
                        {invitationData ? <LetterContent data={invitationData} /> : <div>{t('common.loading')}</div>}
                     </div>
                </motion.div>

                {/* POCKET LAYER */}
                <img src={pocketImg} className="layer pocket" alt="Pocket" />

                {/* FLAP LAYER */}
                <motion.div 
                    className="layer flap-container"
                    variants={flapVariants}
                    animate={step > 2 ? "openBack" : (step >= 2 ? "open" : "closed")}
                    style={{ transformOrigin: "top" }}
                >
                    <img src={flapImg} className="flap-img" alt="Flap" />
                </motion.div>
                {/* SIGILLO INIZIALE (Sulla busta) */}
                <AnimatePresence>
                    {step < 3 && (
                        <motion.img 
                            src={waxImg} 
                            className="wax-img" 
                            variants={waxVariants}
                            animate={step<1?'attached':step>2?'folded':'removed'}
                            initial="attached"
                            alt="Wax Seal"
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default EnvelopeAnimation;