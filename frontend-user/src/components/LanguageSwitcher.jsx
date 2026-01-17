import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchLanguages } from '../services/api';

const LanguageFab = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    // Carica lingue dall'API backend
    const fetchLangs = async () => {
        try {
            // Assumiamo che api.js abbia fetchLanguages esposto, altrimenti fetch diretto
            const res = fetchLanguages();
            if (res.ok) {
                const data = await res.json();
                setLanguages(data);
            } else {
                // Fallback locale in caso di errore
                setLanguages([
                    { code: 'it', label: 'IT', flag: '🇮🇹' },
                    { code: 'en', label: 'EN', flag: '🇬🇧' }
                ]);
            }
        } catch (e) {
            console.error("Failed to load languages", e);
             setLanguages([
                { code: 'it', label: 'IT', flag: '🇮🇹' },
                { code: 'en', label: 'EN', flag: '🇬🇧' }
            ]);
        }
    };
    fetchLangs();
  }, []);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setIsOpen(false);
  };

  const currentLang = i18n.language || 'it';

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Animation variants for the speed dial list
  const containerVariants = {
    closed: { 
      transition: { staggerChildren: 0.05, staggerDirection: -1 }
    },
    open: { 
      transition: { staggerChildren: 0.07, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    closed: { y: -10, opacity: 0, scale: 0.5 },
    open: { y: 0, opacity: 1, scale: 1 }
  };
  
  if (languages.length <= 1) return null; // Nascondi se c'è solo una lingua

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      {/* MAIN FAB BUTTON */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="lang-main-fab"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: isOpen ? '#fce7f3' : 'rgba(255, 255, 255, 0.85)', // pink-100 or glass
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isOpen ? '#db2777' : '#4b5563', // pink-600 or gray-600
          zIndex: 2002,
          position: 'relative'
        }}
        aria-label="Change Language"
      >
        <Globe size={24} strokeWidth={1.5} />
      </motion.button>

      {/* DROPDOWN ITEMS (SPEED DIAL) */}
      <motion.div
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        variants={containerVariants}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          position: 'absolute',
          top: '60px', // Below the main button
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            variants={itemVariants}
            onClick={() => changeLanguage(lang.code)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentLang === lang.code ? '#db2777' : 'rgba(255, 255, 255, 0.95)',
              color: currentLang === lang.code ? 'white' : '#1f2937',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
             <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default LanguageFab;
