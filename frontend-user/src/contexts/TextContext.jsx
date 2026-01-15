import React, { createContext, useContext, useState, useEffect } from 'react';
import { textConfigService } from '../services/textConfig';

const TextContext = createContext();

export const TextProvider = ({ children }) => {
  const [texts, setTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTexts = async () => {
      try {
        setLoading(true);
        const data = await textConfigService.getAllTexts();
        
        let textMap = {};

        // Case 1: Direct Dictionary { "key": "content" } (Current Public API format)
        if (data && typeof data === 'object' && !Array.isArray(data) && !data.results) {
            textMap = data;
        } 
        // Case 2: Array of objects [{ key, content }] (Legacy/Admin format)
        else if (Array.isArray(data)) {
            textMap = data.reduce((acc, item) => {
                if (item.key) acc[item.key] = item.content;
                return acc;
            }, {});
        } 
        // Case 3: DRF Pagination { results: [...] }
        else if (data && Array.isArray(data.results)) {
            textMap = data.results.reduce((acc, item) => {
                if (item.key) acc[item.key] = item.content;
                return acc;
            }, {});
        } else {
            console.warn('Unexpected response format from textConfigService.getAllTexts():', data);
        }
        
        setTexts(textMap);
      } catch (err) {
        console.error('Failed to load configurable texts', err);
        setError(err);
        // We don't block the app, just log error. UI will fallback to default/empty.
      } finally {
        setLoading(false);
      }
    };

    loadTexts();
  }, []);

  /**
   * Helper to get text by key with optional fallback
   * @param {string} key - The configuration key
   * @param {string} fallback - Default content if not found
   * @returns {string} The content HTML/text
   */
  const getText = (key, fallback = '') => {
    return texts[key] !== undefined ? texts[key] : fallback;
  };

  return (
    <TextContext.Provider value={{ texts, loading, error, getText }}>
      {children}
    </TextContext.Provider>
  );
};

export const useConfigurableText = () => {
  const context = useContext(TextContext);
  if (!context) {
    throw new Error('useConfigurableText must be used within a TextProvider');
  }
  return context;
};
