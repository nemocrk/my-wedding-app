import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { TextProvider, useConfigurableText } from '../TextContext';
import { textConfigService } from '../../services/textConfig';

// Mock service
vi.mock('../../services/textConfig', () => ({
  textConfigService: {
    getAllTexts: vi.fn()
  }
}));

// Test component to consume context
const TestComponent = () => {
    const { getText, loading, error } = useConfigurableText();
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    return (
        <div>
            <span data-testid="value">{getText('welcome', 'Default')}</span>
        </div>
    );
};

describe('TextContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides fallback text while loading or if key missing', async () => {
    // Should start loading
    textConfigService.getAllTexts.mockImplementation(() => new Promise(() => {})); // Hang promise
    
    render(
        <TextProvider>
            <TestComponent />
        </TextProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads Dictionary format correctly', async () => {
    textConfigService.getAllTexts.mockResolvedValue({ 'welcome': 'Benvenuti' });

    render(
        <TextProvider>
            <TestComponent />
        </TextProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('Benvenuti');
    });
  });

  it('loads Array format correctly', async () => {
    textConfigService.getAllTexts.mockResolvedValue([
        { key: 'welcome', content: 'Welcome Array' }
    ]);

    render(
        <TextProvider>
            <TestComponent />
        </TextProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('Welcome Array');
    });
  });

  it('loads DRF Results format correctly', async () => {
    textConfigService.getAllTexts.mockResolvedValue({
        results: [{ key: 'welcome', content: 'Welcome DRF' }]
    });

    render(
        <TextProvider>
            <TestComponent />
        </TextProvider>
    );

    await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('Welcome DRF');
    });
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    textConfigService.getAllTexts.mockRejectedValue(new Error('Fetch Fail'));

    render(
        <TextProvider>
            <TestComponent />
        </TextProvider>
    );

    // It should stop loading but expose error? 
    // The implementation sets error state.
    await waitFor(() => {
        expect(screen.getByText('Error: Fetch Fail')).toBeInTheDocument();
    });
  });

  it('throws if hook used outside provider', () => {
    // Suppress console error from React for boundary
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow('useConfigurableText must be used within a TextProvider');
    
    consoleSpy.mockRestore();
  });
});
