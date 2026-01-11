import React from 'react';
import PropTypes from 'prop-types';
import styles from './PaperModal.module.css';

// Importazione degli asset
import bgTop from '../../assets/illustrations/paper-top.png';
import bgCenter from '../../assets/illustrations/paper-center.png';
import bgBottom from '../../assets/illustrations/paper-bottom.png';

export const PaperModal = ({ children, className = '', style = {} }) => {
  return (
    <div 
      className={`${className} ${styles.externalWrapper}`} 
      style={{...style, padding:'0'}}
    >
      <div 
        className={`${styles.wrapper} ${className}`} 
      >
        {/* LAYER 1: Sfondo Grafico (Sliding Doors) */}
        <div className={styles.backgroundLayer}>
          <div 
            className={styles.top} 
            style={{ backgroundImage: `url(${bgTop})` }}
          />
          <div 
            className={styles.center} 
            style={{ backgroundImage: `url(${bgCenter})` }}
          />
          <div 
            className={styles.bottom} 
            style={{ backgroundImage: `url(${bgBottom})` }}
          />
        </div>

        {/* LAYER 2: Contenuto Utente (Full Height) */}
        <div className={styles.contentLayer}>
          {children}
        </div>
      </div>
    </div>
  );
};

PaperModal.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object
};

export default PaperModal;
