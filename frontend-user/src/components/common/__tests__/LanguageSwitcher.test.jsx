import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';
import '../../../__tests__/setup.jsx'; // Import i18n mock (corrected extension)
import { changeLanguageMock } from '../../../__tests__/setup.jsx';

import * as api from '../../../services/api';
import LanguageFab from '../LanguageSwitcher';

// Partially mock API to spy on fetchLanguages
vi.mock('../../../services/api', async (importOriginal) => {
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
    api.fetchLanguages.mockResolvedValue(mockLanguages);

    render(<LanguageFab />);
    const fab = await waitFor(() => screen.getByLabelText('Change Language'));
    fireEvent.click(fab);

    await waitFor(() => screen.getByText('🇬🇧'));
    fireEvent.click(screen.getByText('🇬🇧'));

    await waitFor(() => expect(changeLanguageMock).toHaveBeenCalledWith('en'));
  });

  test('hides if only one language', async () => {
    api.fetchLanguages.mockResolvedValue([{ code: 'it' }]);

    const { container } = render(<LanguageFab />);

    // Wait for effect to settle
    await waitFor(() => { });

    // It should NOT render anything visible (empty or null)
    expect(container.firstChild).toBeNull();
  });
});
