/**
 * Analytics Service per frontend-user
 * Gestisce il tracciamento delle interazioni e delle heatmap
 */

const API_BASE = '/api/public';

/**
 * Recupera dati GeoIP dal client
 */
const fetchGeoLocation = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.warn('Geo fetch failed', error);
    }
    return null;
};

/**
 * Invia un log di interazione generico
 * @param {string} eventType - Tipo di evento (es. 'click_cta', 'rsvp_reset')
 * @param {object} metadata - Dati aggiuntivi opzionali
 */
export const logInteraction = async (eventType, metadata = {}) => {
  try {
    // Se è la prima visita, arricchisci con GeoData
    if (eventType === 'view_letter' || eventType === 'visit') {
        const geoData = await fetchGeoLocation();
        if (geoData) {
            metadata = { ...metadata, geo: geoData };
        }
    }

    await fetch(`${API_BASE}/log-interaction/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, metadata }),
    });
  } catch (error) {
    // Fail silently per non disturbare l'utente
    console.warn('Analytics log failed', error);
  }
};

/**
 * Gestore Heatmap
 * Raccoglie i movimenti del mouse e li invia in batch
 */
class HeatmapTracker {
  constructor() {
    this.mouseData = [];
    this.isTracking = false;
    this.batchSize = 50; // Invia ogni 50 punti o all'unload
    this.throttleMs = 100; // Campiona ogni 100ms
    this.lastSampleTime = 0;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('beforeunload', this.flush);
    
    // Flush periodico ogni 10 secondi se ci sono dati
    this.interval = setInterval(() => {
        if (this.mouseData.length > 0) this.flush();
    }, 10000);
  }

  stop() {
    this.isTracking = false;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('beforeunload', this.flush);
    if (this.interval) clearInterval(this.interval);
    this.flush(); // Invio finale
  }

  handleMouseMove = (e) => {
    const now = Date.now();
    if (now - this.lastSampleTime < this.throttleMs) return;

    this.mouseData.push({
      x: e.pageX,
      y: e.pageY,
      t: now
    });
    this.lastSampleTime = now;

    if (this.mouseData.length >= this.batchSize) {
      this.flush();
    }
  };

  flush = async () => {
    if (this.mouseData.length === 0) return;

    const payload = {
      session_id: this.sessionId,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      mouse_data: [...this.mouseData] // copia
    };
    
    // Clear buffer immediately
    this.mouseData = [];

    // Send beacon API if available (better for unload), else fetch
    const url = `${API_BASE}/log-heatmap/`;
    
    // Use simple fetch for reliability within component lifecycle
    try {
      await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Heatmap flush failed', err);
    }
  }
}

export const heatmapTracker = new HeatmapTracker();
