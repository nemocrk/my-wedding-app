import React, { useState } from 'react';
import './EnvelopeAnimation.css';

const EnvelopeAnimation = ({ onComplete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const handleOpen = () => {
        if (isOpening || isOpen) return;
        setIsOpening(true);
        // Ritardo per simulare l'apertura
        setTimeout(() => {
            setIsOpen(true);
            // Ritardo per far completare la transizione prima di mostrare il contenuto
            setTimeout(() => {
                onComplete();
            }, 800);
        }, 1500);
    };

    return (
        <div className={`envelope-container ${isOpen ? 'open' : ''}`} onClick={handleOpen}>
            <div className={`envelope ${isOpening ? 'opening' : ''}`}>
                <div className="envelope-flap"></div>
                <div className="envelope-pocket"></div>
                <div className="letter-preview">
                    <div className="text-lines">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            {!isOpening && !isOpen && (
                <div className="tap-hint animate-bounce">
                    👇 Tocca per aprire
                </div>
            )}
        </div>
    );
};

export default EnvelopeAnimation;