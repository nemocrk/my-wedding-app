import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import LanguageFab from '../components/LanguageSwitcher';
import * as api from '../services/api';

// Partially mock API to spy on fetchLanguages
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchLanguages: vi.fn(),
  };
});

// Mock API responses
const mockLanguages = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('changes language on click', async () => {
    api.fetchLanguages.mockResolvedValue({
      ok: true,
      json: async () => mockLanguages,
    });

    const { useTranslation } = await import('react-i18next');
    const changeLanguageMock = useTranslation().i18n.changeLanguage;

    render(<LanguageFab />);
    const fab = screen.getByLabelText('Change Language');
    fireEvent.click(fab);

    await waitFor(() => screen.getByText('🇬🇧'));
    fireEvent.click(screen.getByText('🇬🇧'));

    expect(changeLanguageMock).toHaveBeenCalledWith('en');
  });

  test('hides if only one language', async () => {
    api.fetchLanguages.mockResolvedValue({
      ok: true,
      json: async () => [{ code: 'it' }],
    });

    const { container } = render(<LanguageFab />);

    // Wait for effect to settle
    await waitFor(() => { });

    // It should NOT render anything visible (empty or null)
    expect(container.firstChild).toBeNull();
  });
});
