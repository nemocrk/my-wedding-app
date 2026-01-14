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
        // Convert array to object map for O(1) access: { 'key': 'content', ... }
        const textMap = data.reduce((acc, item) => {
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
