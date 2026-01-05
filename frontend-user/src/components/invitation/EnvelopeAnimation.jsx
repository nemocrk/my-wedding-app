import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EnvelopeAnimation.css'; // Manteniamo il CSS per layout di base
import flapImg from '../../assets/illustrations/flap.png';
import noFlapImg from '../../assets/illustrations/no-flap.png';
import pocketImg from '../../assets/illustrations/pocket.png';
import waxImg from '../../assets/illustrations/wax.png';
import LetterContent from './LetterContent';

const EnvelopeAnimation = ({ onComplete, invitationData }) => {
    const [step, setStep] = useState(0);
    const [scale, setScale] = useState(1);

    // Gestione Responsività: Scala tutto in base alla larghezza del device
    useEffect(() => {
        const handleResize = () => {
            const baseWidth = 620;
            const margin = 40; // 20px per lato di margine di sicurezza
            const availableWidth = window.innerWidth - margin;
            
            // Calcola scala: se lo schermo è più piccolo di 620+margin, scala giù. Altrimenti 1.
            const newScale = Math.min(1, availableWidth / baseWidth);
            setScale(newScale);
        };

        // Calcolo iniziale e listener
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
            x: 0, 
            y: 0,
            opacity: 1,
            scale: 3, 
            transition: { delay: 0.5, duration: 0.8, type: "spring" }
        }
    };

    // 3. FLAP ANIMATION (Apertura Busta)
    const flapVariants = {
        closed: { rotateX: 0, zIndex: 4 },
        open: { 
            rotateX: 180, 
            transition: { duration: 0.8, ease: "easeInOut" } 
        },
        openBack: { 
            rotateX: 180, 
            zIndex: 1
        }
    };

    // 4. LETTER ANIMATION (Uscita Lettera)
    const letterVariants = {
        inside: { 
            y: 20, 
            zIndex: 2, 
            scale: 1, 
            opacity: 1,
            pointerEvents: "none"
        },
        extracted: { 
            y: "-120vh", // CHANGE: Use viewport height to guarantee exit on any screen size
            zIndex: 2, 
            scale: 1,
            opacity: 1,
            transition: { duration: 1.2, ease: "easeOut" },
            pointerEvents: "none"
        },
        final: {
            y: -50, 
            zIndex: 10, 
            scale: 1,
            transition: { duration: 0.8, ease: "easeInOut" },
            pointerEvents: "auto"
        }
    };

    // 5. LETTER CONTENT HEIGHT ANIMATION (Clipping)
    const letterContentVariants = {
        folded: { 
            height: "15vh", // CHANGE: Use vh for initial folded state too (approx 300px on desktop)
            overflow: "hidden" 
        },
        unfolded: { 
            height: "calc(100vh - 40px)", // CHANGE: Dynamic full height minus margins
            overflowY: "auto", 
            transition: { duration: 1.5, ease: "easeOut" } 
        }
    };

    // Orchestratore della sequenza
    const handleSequence = async () => {
        // Step 1: Arrivo completato (gestito da 'visible')
        await new Promise(r => setTimeout(r, 500)); 
        setStep(1); // Rimuovi ceralacca

        await new Promise(r => setTimeout(r, 1000));
        setStep(2); // Apri busta

        await new Promise(r => setTimeout(r, 1000));
        setStep(3); // Esci lettera COMPLETAMENTE
        
        await new Promise(r => setTimeout(r, 1500));
        setStep(4); // Posiziona per lettura
        
        await new Promise(r => setTimeout(r, 1000));
        setStep(5); // Rientra ceralacca
        
        // Callback fine animazione (opzionale, se serve al padre)
        if (onComplete) setTimeout(onComplete, 3000);
    };

    // Helper per determinare lo stato corrente della lettera
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
            onAnimationComplete={handleSequence}
        >
            <div 
                className="envelope-wrapper" 
                style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center'
                }}
            >
                {/* BACK */}
                <img src={noFlapImg} className="layer back" alt="Back" />

                {/* LETTER (Sostituisce LetterContent SVG statico) */}
                <motion.div 
                    className="layer letter-container"
                    variants={letterVariants}
                    initial="inside" 
                    animate={getLetterState()}
                >
                     {/* Contenuto interno con clipping animato */}
                     <motion.div 
                        className="dummy-letter"
                        variants={letterContentVariants}
                        initial="folded"
                        animate={step >= 3 ? "unfolded" : "folded"}
                     >
                        {invitationData ? (
                            <LetterContent data={invitationData} />
                        ) : (
                            <div style={{padding: '2rem'}}>Caricamento invito...</div>
                        )}
                        
                        {/* Sigillo che rientra */}
                        <motion.img 
                            src={waxImg} 
                            className="wax-on-letter"
                            variants={waxVariants}
                            initial="removed"
                            animate={step === 5 ? "reentry" : "removed"}
                        />
                     </motion.div>
                </motion.div>

                {/* POCKET */}
                <img src={pocketImg} className="layer pocket" alt="Pocket" />

                {/* FLAP */}
                <motion.div 
                    className="layer flap-container"
                    variants={flapVariants}
                    animate={step >= 3 ? "openBack" : (step === 2 ? "open" : "closed")}
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
