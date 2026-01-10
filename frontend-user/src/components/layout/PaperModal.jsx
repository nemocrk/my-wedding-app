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
      className={`${styles.wrapper} ${className}`} 
      style={style}
    >
      <div className={styles.container}>
        {/* Top Cap */}
        <div 
          className={styles.top} 
          style={{ backgroundImage: `url(${bgTop})` }}
        />
        
        {/* Center Body (Scrollable & Blended) */}
        <div 
          className={styles.center} 
          style={{ backgroundImage: `url(${bgCenter})` }}
        >
          {children}
        </div>
        
        {/* Bottom Cap */}
        <div 
          className={styles.bottom} 
          style={{ backgroundImage: `url(${bgBottom})` }}
        />
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
