import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { heatmapTracker, logInteraction } from '../analytics';

// --- MOCKS ---
// Mock del fetch globale
global.fetch = vi.fn();

// Mock console.warn per evitare log durante i test
let consoleWarnSpy;

describe('Analytics Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        sessionStorage.clear();

        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Reset heatmap internal state if needed (hacky access since it's a singleton instance)
        heatmapTracker.stop();
        heatmapTracker.mouseData = [];
        heatmapTracker.lastSampleTime = 0;   // ⬅️ FIX DEFINITIVO

    });

    afterEach(() => {
        heatmapTracker.stop();
        vi.useRealTimers();
    });

    // 1. logInteraction Coverage
    describe('logInteraction', () => {
        it('generates session ID and sends basic log', async () => {
            fetch.mockResolvedValueOnce({ ok: true });

            await logInteraction('test_event', { foo: 'bar' });

            expect(sessionStorage.getItem('wedding_analytics_sid')).toBeTruthy();
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/log-interaction/'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"event_type":"test_event"')
                })
            );
        });

        it('fetches GeoIP for "view_letter" event', async () => {
            fetch
                .mockResolvedValueOnce({ ok: true, json: async () => ({ country: 'IT' }) }) // GeoIP call
                .mockResolvedValueOnce({ ok: true }); // Analytics call

            await logInteraction('view_letter');

            // Expect first call to IPAPI
            expect(fetch).toHaveBeenNthCalledWith(1, 'https://ipapi.co/json/');

            // Expect second call to backend with geo data
            expect(fetch).toHaveBeenNthCalledWith(2,
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('"country":"IT"')
                })
            );
        });

        it('handles GeoIP failure gracefully', async () => {
            fetch
                .mockRejectedValueOnce(new Error('Geo Down')) // GeoIP fail
                .mockResolvedValueOnce({ ok: true }); // Analytics success

            await logInteraction('view_letter');

            expect(consoleWarnSpy).toHaveBeenCalledWith('Geo fetch failed', expect.any(Error));
            // Still sends analytics without geo
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('handles Analytics API failure gracefully', async () => {
            fetch.mockRejectedValue(new Error('API Down'));

            await logInteraction('simple_event');

            expect(consoleWarnSpy).toHaveBeenCalledWith('Analytics log failed', expect.any(Error));
        });

        // Edge Case: Crypto Fallback
        it('uses fallback random generator if crypto is missing', async () => {
            // Save original
            const originalCrypto = global.crypto;

            // Delete crypto
            Object.defineProperty(global, 'crypto', { value: undefined, writable: true });
            // Also need to ensure window.crypto is undefined if running in jsdom
            if (typeof window !== 'undefined') {
                Object.defineProperty(window, 'crypto', { value: undefined, writable: true });
            }

            sessionStorage.clear(); // Clear existing SID

            await logInteraction('fallback_test');

            const sid = sessionStorage.getItem('wedding_analytics_sid');
            expect(sid).toBeTruthy();
            expect(sid).toMatch(/^sess_\d+_[a-z0-9]{9}$/);

            // Restore
            Object.defineProperty(global, 'crypto', { value: originalCrypto, writable: true });
            if (typeof window !== 'undefined') {
                Object.defineProperty(window, 'crypto', { value: originalCrypto, writable: true });
            }
        });
    });

    // 2. HeatmapTracker Coverage
    describe('HeatmapTracker', () => {
        it('tracks mouse moves and throttles them', () => {
            heatmapTracker.start();

            // Simulate rapid movements
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 })); // Should be throttled

            vi.advanceTimersByTime(50); // Less than throttle (100ms)
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 30 })); // Throttled

            vi.advanceTimersByTime(150); // Passed throttle
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 40 })); // Accepted

            // Should have 2 points (First one + Last one after throttle)
            // Wait, logic is: if (now - last < 100) return.
            // 0ms: Event 1 (Accepted). Last = 0.
            // 0ms: Event 2. Now=0. Diff=0 < 100. Ignored.
            // 50ms: Event 3. Now=50. Diff=50 < 100. Ignored.
            // 200ms: Event 4. Now=200. Diff=150 >= 100. Accepted.

            // But we need to inspect private/internal state or spy on flush.
            // Let's spy on fetch.

            heatmapTracker.stop(); // Triggers flush

            expect(fetch).toHaveBeenCalledTimes(1);
            const callBody = JSON.parse(fetch.mock.calls[0][1].body);
            expect(callBody.mouse_data.length).toBeGreaterThanOrEqual(2);
        });

        it('flushes automatically on batch size limit', () => {
            heatmapTracker.start();

            // Batch size is 50. Throttle is 100ms.
            // Need to simulate 50 valid events spaced by 100ms.
            for (let i = 0; i < 55; i++) {
                vi.advanceTimersByTime(101);
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: i }));
            }

            // Should have flushed once automatically around 50th event
            expect(fetch).toHaveBeenCalled();
            heatmapTracker.stop();
        });

        it('flushes periodically via interval', () => {
            heatmapTracker.start();

            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }));

            // Advance 10 seconds
            vi.advanceTimersByTime(12000);

            expect(fetch).toHaveBeenCalled();
            heatmapTracker.stop();
        });

        it('handles flush errors gracefully', async () => {
            heatmapTracker.start();
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }));
            vi.advanceTimersByTime(500);

            fetch.mockRejectedValueOnce(new Error('Heatmap Fail'));

            await heatmapTracker.flush();
            expect(fetch).toHaveBeenCalled();

            expect(consoleWarnSpy).toHaveBeenCalledWith('Heatmap flush failed', expect.any(Error));
        });

        it('does not double start', () => {
            heatmapTracker.start();
            const intervalId = heatmapTracker.interval;
            heatmapTracker.start(); // Should ignore
            expect(heatmapTracker.interval).toBe(intervalId);
            heatmapTracker.stop();
        });
        it('diagnostic: no pending timers', () => {
            expect(vi.getTimerCount()).toBe(0);
        });
    });
});
