/**
 * DYNAMIC GOOGLE FONT LOADER
 * Automatically loads Google Fonts used in HTML content.
 * Shared utility for both frontend-admin and frontend-user.
 */

const loadedFonts = new Set();

/**
 * Load a Google Font dynamically by injecting a <link> tag.
 * @param {string} fontFamily - CSS font-family value (e.g., "Roboto", "Open Sans")
 */
export function loadGoogleFont(fontFamily) {
  if (!fontFamily || loadedFonts.has(fontFamily)) return;

  // Clean font family string (remove quotes, fallbacks)
  const cleanFamily = fontFamily
    .split(',')[0]
    .trim()
    .replace(/['"`]/g, '');

  // Skip generic families
  const genericFamilies = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
  if (genericFamilies.includes(cleanFamily.toLowerCase())) return;

  // Check if already loaded in DOM
  const existingLink = document.querySelector(`link[data-font-family="${cleanFamily}"]`);
  if (existingLink) {
    loadedFonts.add(fontFamily);
    return;
  }

  // Build Google Fonts URL
  const formattedName = cleanFamily.replace(/\s+/g, '+');
  const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedName}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;

  // Create and inject link tag
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  link.setAttribute('data-font-family', cleanFamily);
  document.head.appendChild(link);

  loadedFonts.add(fontFamily);
}

/**
 * Extract all font-family values from HTML content.
 * @param {string} html - HTML string to parse
 * @returns {string[]} Array of unique font-family values
 */
export function extractFontFamiliesFromHTML(html) {
  if (!html) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const families = new Set();

    // Find all elements with inline style="font-family: ..."
    const elementsWithStyle = doc.querySelectorAll('[style*="font-family"]');
    elementsWithStyle.forEach((el) => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/font-family\s*:\s*([^;]+)/i);
      if (match) {
        families.add(match[1].trim());
      }
    });

    return Array.from(families);
  } catch {
    return [];
  }
}

/**
 * Auto-load all Google Fonts found in HTML content.
 * @param {string} html - HTML content to scan
 */
export function autoLoadFontsFromHTML(html) {
  const families = extractFontFamiliesFromHTML(html);
  families.forEach((family) => loadGoogleFont(family));
}

/**
 * Install a global MutationObserver that scans the whole app for inline font-family styles
 * and loads corresponding Google Fonts on-demand.
 *
 * Note: this intentionally only reads inline styles (the HTML saved from TipTap).
 */
export function initFontAutoLoader() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let rafId = null;

  const scanElement = (el) => {
    if (!el || el.nodeType !== 1) return;

    // Direct inline style
    const directFamily = el.style?.fontFamily;
    if (directFamily) loadGoogleFont(directFamily);

    // Descendants with inline font-family
    const descendants = el.querySelectorAll?.('[style*="font-family"]');
    descendants?.forEach((node) => {
      const family = node.style?.fontFamily;
      if (family) loadGoogleFont(family);
    });
  };

  const scheduleFullScan = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      scanElement(document.body);
    });
  };

  // Initial scan
  scheduleFullScan();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') {
        scanElement(m.target);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => scanElement(n));
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  });

  return () => {
    observer.disconnect();
    if (rafId) window.cancelAnimationFrame(rafId);
  };
}
