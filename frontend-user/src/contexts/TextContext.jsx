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
        
        // Handle both array response and DRF paginated response { results: [...] }
        let textArray = [];
        if (Array.isArray(data)) {
          textArray = data;
        } else if (data && Array.isArray(data.results)) {
          // DRF pagination response
          textArray = data.results;
        } else {
          console.warn('Unexpected response format from textConfigService.getAllTexts():', data);
          // If it's an empty object or unexpected format, use empty array
          textArray = [];
        }
        
        // Convert array to object map for O(1) access: { 'key': 'content', ... }
        const textMap = textArray.reduce((acc, item) => {
          acc[item.key] = item.content;
          return acc;
        }, {});
        
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