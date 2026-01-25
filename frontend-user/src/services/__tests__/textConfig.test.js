import { vi, describe, beforeEach, test, expect } from 'vitest';
import { textConfigService } from '../textConfig';
import * as api from '../api';

// Mock API
vi.mock('../api', () => ({
    fetchWithCredentials: vi.fn()
}));

describe('textConfig Service', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
    });

    test('getAllTexts returns data from API and caches it', async () => {
        const mockData = { welcome: 'Hello' };
        api.fetchWithCredentials.mockResolvedValue(mockData);

        const result = await textConfigService.getAllTexts();
        
        expect(result).toEqual(mockData);
        expect(api.fetchWithCredentials).toHaveBeenCalledWith(
            expect.stringContaining('/texts/')
        );
        
        // Check SessionStorage Cache
        const cached = sessionStorage.getItem('wedding_texts_config');
        expect(cached).toBe(JSON.stringify(mockData));
    });

    test('getAllTexts returns cached data if valid', async () => {
        const cachedData = { welcome: 'Cached' };
        sessionStorage.setItem('wedding_texts_config', JSON.stringify(cachedData));
        sessionStorage.setItem('wedding_texts_ts', Date.now().toString());

        const result = await textConfigService.getAllTexts();
        
        expect(result).toEqual(cachedData);
        expect(api.fetchWithCredentials).not.toHaveBeenCalled();
    });

    test('getAllTexts refreshes cache if expired (1 hour)', async () => {
        const cachedData = { welcome: 'Old' };
        const oldTime = Date.now() - (60 * 60 * 1000) - 1000; // 1 hour 1 sec ago
        sessionStorage.setItem('wedding_texts_config', JSON.stringify(cachedData));
        sessionStorage.setItem('wedding_texts_ts', oldTime.toString());

        const newData = { welcome: 'New' };
        api.fetchWithCredentials.mockResolvedValue(newData);

        const result = await textConfigService.getAllTexts();
        
        expect(result).toEqual(newData);
        expect(api.fetchWithCredentials).toHaveBeenCalled();
    });

    test('getAllTexts handles JSON parse error in cache', async () => {
        sessionStorage.setItem('wedding_texts_config', 'INVALID JSON');
        sessionStorage.setItem('wedding_texts_ts', Date.now().toString());

        const newData = { welcome: 'Recovered' };
        api.fetchWithCredentials.mockResolvedValue(newData);

        const result = await textConfigService.getAllTexts();
        expect(result).toEqual(newData);
    });
});
