import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadGoogleFont,
  extractFontFamiliesFromHTML,
  autoLoadFontsFromHTML,
  initFontAutoLoader
} from '../fontLoader';

describe('fontLoader', () => {
  // Clean up DOM after each test
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('loadGoogleFont', () => {
    it('loads a font by creating a link element', () => {
      loadGoogleFont('Roboto');
      
      const link = document.querySelector('link[data-font-family="Roboto"]');
      expect(link).toBeTruthy();
      expect(link.rel).toBe('stylesheet');
      expect(link.href).toContain('fonts.googleapis.com');
      expect(link.href).toContain('family=Roboto');
    });

    it('handles font families with spaces', () => {
      loadGoogleFont('Open Sans');
      
      const link = document.querySelector('link[data-font-family="Open Sans"]');
      expect(link).toBeTruthy();
      expect(link.href).toContain('family=Open+Sans');
    });

    it('cleans quoted font family strings', () => {
      loadGoogleFont('"Roboto", sans-serif');
      
      const link = document.querySelector('link[data-font-family="Roboto"]');
      expect(link).toBeTruthy();
      expect(link.href).toContain('family=Roboto');
    });

    it('does not load generic font families', () => {
      const genericFamilies = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'];
      
      genericFamilies.forEach(family => {
        loadGoogleFont(family);
      });
      
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      expect(links.length).toBe(0);
    });

    it('does not load the same font twice', () => {
      loadGoogleFont('Roboto');
      loadGoogleFont('Roboto');
      
      const links = document.querySelectorAll('link[data-font-family="Roboto"]');
      expect(links.length).toBe(1);
    });

    it('handles empty or null font family', () => {
      loadGoogleFont('');
      loadGoogleFont(null);
      loadGoogleFont(undefined);
      
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      expect(links.length).toBe(0);
    });

    it('loads multiple different fonts', () => {
      loadGoogleFont('Roboto');
      loadGoogleFont('Open Sans');
      loadGoogleFont('Lora');
      
      expect(document.querySelector('link[data-font-family="Roboto"]')).toBeTruthy();
      expect(document.querySelector('link[data-font-family="Open Sans"]')).toBeTruthy();
      expect(document.querySelector('link[data-font-family="Lora"]')).toBeTruthy();
    });
  });

  describe('extractFontFamiliesFromHTML', () => {
    it('extracts font families from inline styles', () => {
      const html = '<p style="font-family: Roboto;">Hello</p><div style="font-family: Open Sans;">World</div>';
      const families = extractFontFamiliesFromHTML(html);
      
      expect(families).toContain('Roboto');
      expect(families).toContain('Open Sans');
      expect(families.length).toBe(2);
    });

    it('handles empty HTML', () => {
      expect(extractFontFamiliesFromHTML('')).toEqual([]);
      expect(extractFontFamiliesFromHTML(null)).toEqual([]);
      expect(extractFontFamiliesFromHTML(undefined)).toEqual([]);
    });

    it('extracts unique font families only', () => {
      const html = `
        <p style="font-family: Roboto;">A</p>
        <p style="font-family: Roboto;">B</p>
        <p style="font-family: Open Sans;">C</p>
      `;
      const families = extractFontFamiliesFromHTML(html);
      
      expect(families.length).toBe(2);
      expect(families).toContain('Roboto');
      expect(families).toContain('Open Sans');
    });

    it('handles complex inline styles', () => {
      const html = '<p style="color: red; font-family: \'Lora\', serif; font-size: 16px;">Text</p>';
      const families = extractFontFamiliesFromHTML(html);
      
      expect(families).toContain("'Lora', serif");
    });

    it('ignores elements without font-family', () => {
      const html = '<p style="color: blue;">No font</p><div>Plain text</div>';
      const families = extractFontFamiliesFromHTML(html);
      
      expect(families.length).toBe(0);
    });

    it('handles malformed HTML gracefully', () => {
      const html = '<p style="font-family: Roboto;>Unclosed tag';
      const families = extractFontFamiliesFromHTML(html);
      
      // Should still extract what it can
      expect(Array.isArray(families)).toBe(true);
    });
  });

  describe('autoLoadFontsFromHTML', () => {
    it('loads all fonts found in HTML content', () => {
      const html = `
        <div style="font-family: Roboto;">Text 1</div>
        <p style="font-family: Open Sans;">Text 2</p>
        <span style="font-family: Lora;">Text 3</span>
      `;
      
      autoLoadFontsFromHTML(html);
      
      expect(document.querySelector('link[data-font-family="Roboto"]')).toBeTruthy();
      expect(document.querySelector('link[data-font-family="Open Sans"]')).toBeTruthy();
      expect(document.querySelector('link[data-font-family="Lora"]')).toBeTruthy();
    });

    it('does not load fonts twice', () => {
      const html = '<p style="font-family: Roboto;">Text</p>';
      
      autoLoadFontsFromHTML(html);
      autoLoadFontsFromHTML(html);
      
      const links = document.querySelectorAll('link[data-font-family="Roboto"]');
      expect(links.length).toBe(1);
    });

    it('handles empty HTML', () => {
      autoLoadFontsFromHTML('');
      autoLoadFontsFromHTML(null);
      
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      expect(links.length).toBe(0);
    });
  });

  describe('initFontAutoLoader', () => {
    it('returns a cleanup function', () => {
      const cleanup = initFontAutoLoader();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('scans existing elements on initialization', () => {
      document.body.innerHTML = '<p style="font-family: Roboto;">Initial content</p>';
      
      const cleanup = initFontAutoLoader();
      
      // Use setTimeout to allow requestAnimationFrame to execute
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(document.querySelector('link[data-font-family="Roboto"]')).toBeTruthy();
          cleanup();
          resolve();
        }, 50);
      });
    });

    it('observes dynamically added elements', () => {
      const cleanup = initFontAutoLoader();
      
      // Add element after observer is active
      const newEl = document.createElement('div');
      newEl.style.fontFamily = 'Open Sans';
      newEl.textContent = 'Dynamic content';
      document.body.appendChild(newEl);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(document.querySelector('link[data-font-family="Open Sans"]')).toBeTruthy();
          cleanup();
          resolve();
        }, 50);
      });
    });

    it('observes style attribute changes', () => {
      const el = document.createElement('p');
      el.textContent = 'Text';
      document.body.appendChild(el);
      
      const cleanup = initFontAutoLoader();
      
      // Change style after observer is active
      el.style.fontFamily = 'Lora';
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(document.querySelector('link[data-font-family="Lora"]')).toBeTruthy();
          cleanup();
          resolve();
        }, 50);
      });
    });

    it('cleanup disconnects observer', () => {
      const cleanup = initFontAutoLoader();
      cleanup();
      
      // Add element after cleanup
      const newEl = document.createElement('div');
      newEl.style.fontFamily = 'ShouldNotLoad';
      document.body.appendChild(newEl);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(document.querySelector('link[data-font-family="ShouldNotLoad"]')).toBeFalsy();
          resolve();
        }, 50);
      });
    });
  });
});
