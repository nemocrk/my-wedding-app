import { API_BASE, fetchWithCredentials } from './api';

/**
 * Service for fetching configurable public texts.
 * Uses the public endpoint /api/public/texts/
 */

export const textConfigService = {
  /**
   * Fetches all public configurable texts.
   * Useful to load all texts at app startup.
   * @returns {Promise<Array>} List of text objects { key, content }
   */
  getAllTexts: async () => {
    return fetchWithCredentials(`${API_BASE}/texts/`);
  },

  /**
   * Fetches a specific text by key.
   * @param {string} key - The text key (e.g. 'envelope.front.content')
   * @returns {Promise<Object>} The text object
   */
  getTextByKey: async (key) => {
    return fetchWithCredentials(`${API_BASE}/texts/${key}/`);
  }
};
