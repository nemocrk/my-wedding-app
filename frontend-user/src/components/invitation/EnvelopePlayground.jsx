import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EnvelopeAnimation.css'; // Usiamo lo stesso CSS dell'animazione reale
import flapImg from '../../assets/illustrations/flap.png';
import noFlapImg from '../../assets/illustrations/no-flap.png';
import pocketImg from '../../assets/illustrations/pocket.png';
import waxImg from '../../assets/illustrations/wax.png';

const EnvelopePlayground = () => {
    const [step, setStep] = useState(0);

    // Varianti copiate da EnvelopeAnimation.jsx
    const containerVariants = {
        hidden: { scale: 0.1, opacity: 0, x: '-100vw', rotate: -720 },
        visible: { 
            scale: 1, 
            opacity: 1, 
            x: 0, 
            rotate: 0,
            transition: { duration: 2, ease: "circOut" }
        }
    };

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

    const letterVariants = {
        inside: { 
            y: 20, 
            zIndex: 2, 
            scale: 1, 
            opacity: 1 
        },
        extracted: { 
            y: -520, // Esce COMPLETAMENTE verso l'alto
            zIndex: 2, 
            scale: 1,
            opacity: 1,
            transition: { duration: 1.2, ease: "easeOut" } 
        },
        final: {
            y: -50, // Ritorna al centro per la lettura
            zIndex: 10,
            scale: 1,
            transition: { duration: 0.8, ease: "easeInOut" }
        }
    };

    // 5. LETTER CONTENT HEIGHT ANIMATION (Clipping)
    const letterContentVariants = {
        folded: { 
            height: 300, 
            overflow: "hidden" 
        },
        unfolded: { 
            height: 500, 
            transition: { duration: 1.5, ease: "easeOut" } 
        }
    };

    // Helper per determinare lo stato corrente della lettera
    const getLetterState = () => {
        if (step < 3) return "inside";
        if (step === 3) return "extracted";
        return "final";
    };

    // Funzione per resettare e riavviare
    const restartAnimation = async () => {
        setStep(0);
        // Piccolo delay per permettere il reset visivo
        await new Promise(r => setTimeout(r, 100));
        
        // Sequenza automatica
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
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', background: '#f0f0f0' }}>
            <div style={{ padding: '20px', zIndex: 100 }}>
                <h1>Playground Animazione Completa</h1>
                <p>Step Attuale: {step}</p>
                <button onClick={restartAnimation} style={{ padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer' }}>
                    ▶ Avvia Sequenza
                </button>
                <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => setStep(0)}>Reset</button>
                    <button onClick={() => setStep(1)}>1. Togli Sigillo</button>
                    <button onClick={() => setStep(2)}>2. Apri Busta</button>
                    <button onClick={() => setStep(3)}>3. Estrai Lettera</button>
                    <button onClick={() => setStep(4)}>4. Posiziona Lettera</button>
                    <button onClick={() => setStep(5)}>5. Sigillo su Lettera</button>
                </div>
            </div>

            <motion.div 
                className="envelope-container-3d"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ height: '600px', width: '100%', overflow: 'visible' }} // Override per il playground
            >
                <div className="envelope-wrapper">
                    {/* BACK */}
                    <img src={noFlapImg} className="layer back" alt="Back" />

                    {/* LETTER */}
                    <motion.div 
                        className="layer letter-container"
                        variants={letterVariants}
                        initial="inside"
                        animate={getLetterState()}
                    >
                         <motion.div 
                            className="dummy-letter"
                            variants={letterContentVariants}
                            initial="folded"
                            animate={step >= 3 ? "unfolded" : "folded"}
                         >
                            <h3>Invito al Matrimonio</h3>
                            <p>Carissimi,</p>
                            <p>Siete invitati a celebrare con noi...</p>
                            <br/>
                            <p>Lorem ipsum dolor sit amet...</p>
                            <p>Dettagli della cerimonia qui sotto.</p>
                            
                            {/* Sigillo che rientra sulla lettera */}
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
                        animate={step >= 3 ? "openBack" : (step == 2 ? "open" : "closed")}
                        style={{ transformOrigin: "top" }}
                    >
                        <img src={flapImg} className="flap-img" alt="Flap" />
                        
                        {/* WAX SEAL (Iniziale su flap) */}
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
        </div>
    );
};

export default EnvelopePlayground;
