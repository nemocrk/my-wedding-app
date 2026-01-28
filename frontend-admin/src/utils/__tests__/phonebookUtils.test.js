import { describe, it, expect } from 'vitest';
import { normalizePhone, selectBestPhone, generateSlug } from '../phonebookUtils';

describe('phonebookUtils', () => {
  describe('normalizePhone', () => {
    it('normalizes Italian mobile numbers without prefix', () => {
      expect(normalizePhone('3201234567')).toBe('+393201234567');
      expect(normalizePhone('3901234567')).toBe('+393901234567');
    });

    it('keeps international prefix if already present', () => {
      expect(normalizePhone('+393201234567')).toBe('+393201234567');
    });

    it('converts 00 prefix to +', () => {
      expect(normalizePhone('00393201234567')).toBe('+393201234567');
    });

    it('removes spaces, dashes, and parentheses', () => {
      expect(normalizePhone('320 123 4567')).toBe('+393201234567');
      expect(normalizePhone('320-123-4567')).toBe('+393201234567');
      expect(normalizePhone('(320) 123-4567')).toBe('+393201234567');
      expect(normalizePhone('+39 320 123 4567')).toBe('+393201234567');
    });

    it('handles 9-digit mobile numbers', () => {
      expect(normalizePhone('320123456')).toBe('+39320123456');
    });

    it('returns empty string for invalid formats', () => {
      expect(normalizePhone('1234567')).toBe(''); // Too short
      expect(normalizePhone('5201234567')).toBe(''); // Doesn't start with 3
      expect(normalizePhone('+15551234567')).toBe(''); // Not Italian
    });

    it('returns empty string for null/undefined/empty', () => {
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
      expect(normalizePhone('')).toBe('');
    });

    it('validates final format matches Italian pattern', () => {
      const validNumber = normalizePhone('3201234567');
      expect(validNumber).toMatch(/^\+39[0-9]{9,10}$/);
    });

    it('handles various Italian mobile prefixes (32x, 33x, 34x, 35x, 36x, 37x, 38x, 39x)', () => {
      const prefixes = ['320', '330', '340', '350', '360', '370', '380', '390'];
      prefixes.forEach(prefix => {
        const result = normalizePhone(`${prefix}1234567`);
        expect(result).toBe(`+39${prefix}1234567`);
      });
    });

    it('rejects non-mobile Italian numbers (landlines)', () => {
      // Italian landlines typically start with 0 (e.g., 02 for Milan)
      expect(normalizePhone('0212345678')).toBe(''); // Landline, starts with 0
    });
  });

  describe('selectBestPhone', () => {
    it('returns null for empty or null array', () => {
      expect(selectBestPhone([])).toBeNull();
      expect(selectBestPhone(null)).toBeNull();
      expect(selectBestPhone(undefined)).toBeNull();
    });

    it('returns the first valid normalized number', () => {
      const phones = ['3201234567', '3301234567'];
      expect(selectBestPhone(phones)).toBe('+393201234567');
    });

    it('skips invalid numbers and returns first valid one', () => {
      const phones = ['invalid', '1234', '3301234567'];
      expect(selectBestPhone(phones)).toBe('+393301234567');
    });

    it('returns normalized version even if only one phone available', () => {
      const phones = ['320 123 4567'];
      expect(selectBestPhone(phones)).toBe('+393201234567');
    });

    it('handles phones with different formats', () => {
      const phones = ['+39 320 123 4567', '00393301234567', '340-123-4567'];
      expect(selectBestPhone(phones)).toBe('+393201234567');
    });

    it('returns normalized first phone if all are invalid', () => {
      const phones = ['123', '456'];
      const result = selectBestPhone(phones);
      expect(result).toBe(''); // normalizePhone returns empty for invalid
    });
  });

  describe('generateSlug', () => {
    it('generates kebab-case slug from name and phone', () => {
      const slug = generateSlug('Mario Rossi', '+393201234567');
      expect(slug).toBe('mario-rossi-393201234567');
    });

    it('removes special characters from name', () => {
      const slug = generateSlug('Mario D\'Angelo', '+393201234567');
      expect(slug).toBe('mario-dangelo-393201234567');
    });

    it('converts multiple spaces to single dash', () => {
      const slug = generateSlug('Mario   Rossi', '+393201234567');
      expect(slug).toBe('mario-rossi-393201234567');
    });

    it('trims leading and trailing spaces', () => {
      const slug = generateSlug('  Mario Rossi  ', '+393201234567');
      expect(slug).toBe('mario-rossi-393201234567');
    });

    it('removes all non-digit characters from phone', () => {
      const slug = generateSlug('Mario Rossi', '+39 320-123-4567');
      expect(slug).toBe('mario-rossi-393201234567');
    });

    it('handles accented characters', () => {
      const slug = generateSlug('José García', '+393201234567');
      expect(slug).toBe('jos-garca-393201234567');
    });

    it('converts underscores to dashes', () => {
      const slug = generateSlug('Mario_Rossi', '+393201234567');
      expect(slug).toBe('mario-rossi-393201234567');
    });

    it('handles names with numbers', () => {
      const slug = generateSlug('Mario2 Rossi3', '+393201234567');
      expect(slug).toBe('mario2-rossi3-393201234567');
    });

    it('handles empty or minimal input', () => {
      expect(generateSlug('', '')).toBe('-');
      expect(generateSlug('A', '1')).toBe('a-1');
    });

    it('generates unique slugs for different users', () => {
      const slug1 = generateSlug('Mario Rossi', '+393201234567');
      const slug2 = generateSlug('Mario Rossi', '+393301234567');
      const slug3 = generateSlug('Luigi Rossi', '+393201234567');
      
      expect(slug1).not.toBe(slug2);
      expect(slug1).not.toBe(slug3);
      expect(slug2).not.toBe(slug3);
    });

    it('produces consistent output for same input', () => {
      const slug1 = generateSlug('Mario Rossi', '+393201234567');
      const slug2 = generateSlug('Mario Rossi', '+393201234567');
      expect(slug1).toBe(slug2);
    });
  });
});
