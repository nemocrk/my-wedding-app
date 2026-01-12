/**
 * Normalizza il numero di telefono in formato E.164 (best effort).
 * Rimuove spazi, trattini, parentesi.
 * Se inizia per 3 (lunghezza tipica mobile IT), aggiunge +39 se manca.
 */
export const normalizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  
  // Rimuove tutto tranne numeri e +
  let clean = rawPhone.replace(/[^\d+]/g, '');

  // Gestione doppio zero iniziale
  if (clean.startsWith('00')) {
    clean = '+' + clean.substring(2);
  }

  // Se non ha il prefisso internazionale ed è un numero italiano verosimile (inizia con 3, 10 cifre)
  // Nota: Questo è un euristico per l'uso locale (Milan), può essere affinato.
  if (!clean.startsWith('+') && clean.length === 10 && clean.startsWith('3')) {
    clean = '+39' + clean;
  }

  return clean;
};

/**
 * Seleziona il numero migliore da un array di numeri (Mobile > Home > Primo disponibile).
 * @param {string[]} phones - Array di numeri grezzi
 */
export const selectBestPhone = (phones) => {
  if (!phones || phones.length === 0) return null;
  
  // Semplificazione: contact picker API non sempre ritorna le label tipo 'mobile' o 'home' in modo standard su tutti i browser.
  // Qui prendiamo il primo numero normalizzato valido.
  // In un'implementazione più avanzata con label, faremmo filtro per type.
  
  for (const p of phones) {
    const norm = normalizePhone(p);
    if (norm.length >= 8) return norm; // Lunghezza minima accettabile
  }
  
  return normalizePhone(phones[0]);
};

/**
 * Genera lo slug in formato kebab-case-numero
 * Es: "Mario Rossi" + "+39320..." -> "mario-rossi-39320..."
 */
export const generateSlug = (name, phone) => {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Rimuove caratteri speciali
    .replace(/[\s_]+/g, '-'); // Spazi in trattini

  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  return `${cleanName}-${cleanPhone}`;
};
