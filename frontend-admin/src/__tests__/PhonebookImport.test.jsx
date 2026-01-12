import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import PhonebookImportModal from '../components/invitations/PhonebookImportModal';
import { api } from '../services/api';
import { normalizePhone, generateSlug } from '../utils/phonebookUtils';

// Mock API
vi.mock('../services/api', () => ({
  api: {
    fetchInvitations: vi.fn(),
    createInvitation: vi.fn(),
  },
}));

// Mock Navigator Contacts
const mockContactsSelect = vi.fn();

describe('Phonebook Import Feature', () => {
  beforeEach(() => {
    // Setup navigator mock
    Object.defineProperty(navigator, 'contacts', {
      value: { select: mockContactsSelect },
      configurable: true,
      writable: true,
    });
    // Setup ContactsManager mock
    window.ContactsManager = class {};
    
    // API Mocks default
    api.fetchInvitations.mockResolvedValue([]);
    api.createInvitation.mockResolvedValue({ id: 123 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- UTILS TESTS ---
  describe('Utilities', () => {
    it('normalizes phone numbers correctly', () => {
      expect(normalizePhone('320 123 4567')).toBe('+393201234567');
      expect(normalizePhone('0039 320 123 4567')).toBe('+393201234567');
      expect(normalizePhone('+44 123 456')).toBe('');
    });

    it('generates slug correctly', () => {
      const slug = generateSlug('Mario Rossi', '+393201234567');
      expect(slug).toBe('mario-rossi-393201234567');
    });
  });

  // --- COMPONENT TESTS ---
  describe('PhonebookImportModal', () => {
    it('renders correctly', () => {
      render(<PhonebookImportModal onClose={() => {}} onSuccess={() => {}} />);
      expect(screen.getByText('Importa da Rubrica')).toBeInTheDocument();
      expect(screen.getByText('Apri Rubrica')).toBeInTheDocument();
    });

    it('handles contact selection flow', async () => {
      // Mock user selecting contacts
      mockContactsSelect.mockResolvedValue([
        { name: ['Test User'], tel: ['3201234567'] }
      ]);

      render(<PhonebookImportModal onClose={() => {}} onSuccess={() => {}} />);

      const importBtn = screen.getByText('Apri Rubrica');
      fireEvent.click(importBtn);

      await waitFor(() => {
        expect(mockContactsSelect).toHaveBeenCalled();
      });

      // Should show selection count
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Contatti Selezionati')).toBeInTheDocument();
      });

      // Click Confirm
      const confirmBtn = screen.getByText('Conferma Importazione');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.createInvitation).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Test User',
          phone_number: '+393201234567',
          origin: 'groom' // default
        }));
      });
    });

    it('skips duplicates based on phone number', async () => {
      // Mock existing invitation
      api.fetchInvitations.mockResolvedValue([
        { id: 1, phone_number: '+393201234567' }
      ]);

      // Mock selecting SAME phone number
      mockContactsSelect.mockResolvedValue([
        { name: ['Duplicate User'], tel: ['3201234567'] }
      ]);

      render(<PhonebookImportModal onClose={() => {}} onSuccess={() => {}} />);
      
      fireEvent.click(screen.getByText('Apri Rubrica'));
      
      await waitFor(() => screen.getByText('Conferma Importazione'));
      
      fireEvent.click(screen.getByText('Conferma Importazione'));

      await waitFor(() => {
        expect(api.createInvitation).not.toHaveBeenCalled();
      });
      
      // Should show duplicate message
      expect(screen.getByText(/Nessun nuovo contatto importato/i)).toBeInTheDocument();
    });
  });
});
