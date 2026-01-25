import { vi, describe, beforeEach, test, expect, afterEach } from 'vitest';
import * as analytics from '../analytics';

const mockFetch = (ok = true) => {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve({ country: 'IT' })
  });
};

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetch();
    sessionStorage.clear();
    
    // Reset Heatmap singleton state
    analytics.heatmapTracker.mouseData = [];
    analytics.heatmapTracker.isTracking = false;
    if (analytics.heatmapTracker.interval) clearInterval(analytics.heatmapTracker.interval);
  });

  test('logInteraction sends correct payload', async () => {
    await analytics.logInteraction('click_cta', { btn: 'save' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/log-interaction/'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"event_type":"click_cta"')
      })
    );
    
    // Check session enrichment
    const callArgs = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callArgs.metadata.session_id).toBeDefined();
    expect(callArgs.metadata.btn).toBe('save');
  });

  test('logInteraction handles geo fetch on view_letter', async () => {
    // First call to fetchGeoLocation
    await analytics.logInteraction('view_letter');

    // Should trigger 2 fetches: 1 for Geo (ipapi), 1 for Log
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/');
  });

  test('logInteraction fails silently', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('Fail'));

    await analytics.logInteraction('test');
    
    expect(consoleSpy).toHaveBeenCalledWith('Analytics log failed', expect.any(Error));
  });

  describe('HeatmapTracker', () => {
    test('start initiates listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      analytics.heatmapTracker.start();
      expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    test('track mouse movement throttled', () => {
      analytics.heatmapTracker.start();
      
      // Simulate moves
      const event = { pageX: 10, pageY: 20 };
      analytics.heatmapTracker.handleMouseMove(event);
      
      expect(analytics.heatmapTracker.mouseData).toHaveLength(1);
      
      // Immediate second move should be throttled (throttleMs = 100)
      analytics.heatmapTracker.handleMouseMove(event);
      expect(analytics.heatmapTracker.mouseData).toHaveLength(1);
    });

    test('flush sends data', async () => {
        analytics.heatmapTracker.mouseData = [{ x: 1, y: 1, t: 123 }];
        await analytics.heatmapTracker.flush();
        
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/log-heatmap/'),
            expect.anything()
        );
        expect(analytics.heatmapTracker.mouseData).toHaveLength(0);
    });

    test('stop clears listeners and flushes', async () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const flushSpy = vi.spyOn(analytics.heatmapTracker, 'flush');
        
        analytics.heatmapTracker.start();
        analytics.heatmapTracker.stop();
        
        expect(removeSpy).toHaveBeenCalled();
        expect(flushSpy).toHaveBeenCalled();
    });
  });
});
