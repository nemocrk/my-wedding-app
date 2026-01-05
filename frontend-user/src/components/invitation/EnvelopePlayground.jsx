import React, { useState } from 'react';
import './EnvelopePlayground.css';
import flapImg from '../../assets/illustrations/flap.png';
import noFlapImg from '../../assets/illustrations/no-flap.png';
import pocketImg from '../../assets/illustrations/pocket.png';
import waxImg from '../../assets/illustrations/wax.png';

const EnvelopePlayground = () => {
    const [step, setStep] = useState(0); // 0: Closed, 1: Flap Open, 2: Letter Out

    const toggleStep = () => {
        setStep((prev) => (prev + 1) % 3);
    };

    return (
        <div className="playground-container">
            <h1>Test Posizionamento Busta</h1>
            
            <div className="envelope-wrapper">
                {/* 1. BACK LAYER (Sfondo interno) */}
                <img src={noFlapImg} className="layer back" alt="Back" />
                
                
                {/* 3. POCKET LAYER (Tasca frontale) */}
                <img src={pocketImg} className="layer pocket" alt="Pocket" />
                
                {/* 4. FLAP LAYER (Linguetta + Ceralacca) */}
                {/* Nota: Se il flap è aperto, la rotazione deve partire dall'alto */}
                 <div className={`layer flap-container ${step >= 1 ? 'flap-open' : ''}`}>
                    <img src={flapImg} className="flap-img" alt="Flap" />
                    {/* La ceralacca è attaccata al flap */}
                    <img src={waxImg} className="wax-img" alt="Wax" />
                 </div>
            </div>
            <p>Step attuale: {step === 0 ? 'Chiuso' : step === 1 ? 'Aperto' : 'Lettera Fuori'}</p>
            <button onClick={toggleStep} style={{ padding: '10px 20px', fontSize: '1.2rem', marginBottom: '20px' }}>
                Prossimo Step
            </button>
            
            <div style={{marginTop: '20px', maxWidth: '600px', textAlign: 'left'}}>
                <h3>Istruzioni Debug:</h3>
                <ul>
                    <li>Se le immagini non si sovrappongono correttamente, verifica le dimensioni originali dei PNG.</li>
                    <li>Tutti i layer dovrebbero avere idealmente la stessa dimensione del canvas (es. 800x600) con le parti vuote trasparenti.</li>
                    <li>Modifica <code>EnvelopePlayground.css</code> per aggiustare top/left/width se necessario.</li>
                </ul>
            </div>
        </div>
    );
};

export default EnvelopePlayground;
