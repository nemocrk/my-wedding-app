import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useWhatsAppSSE } from '../../hooks/useWhatsAppSSE';

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.readyState = 0;
    MockEventSource.instances.push(this);
  }
  close() {
    this.readyState = 2;
  }
  emitOpen() {
    this.onopen && this.onopen();
  }
  emitMessage(payload) {
    this.onmessage && this.onmessage({ data: JSON.stringify(payload) });
  }
  emitError() {
    this.onerror && this.onerror(new Event('error'));
  }
}
MockEventSource.instances = [];

beforeEach(() => {
  MockEventSource.instances = [];
  global.EventSource = MockEventSource;
});

function TestComponent() {
  const { realtimeStatus, connectionStatus } = useWhatsAppSSE();
  return (
    <div>
      <div data-testid="conn">{connectionStatus}</div>
      <div data-testid="rt">
        {realtimeStatus['39333111222@c.us']?.status || 'none'}
      </div>
    </div>
  );
}

test('sets connected on SSE open and updates realtimeStatus on message', () => {
  render(<TestComponent />);

  const es = MockEventSource.instances[0];
  expect(es.url).toBe('/api/whatsapp-service/events');

  act(() => es.emitOpen());
  expect(screen.getByTestId('conn').textContent).toBe('connected');

  act(() =>
    es.emitMessage({
      type: 'message_status',
      session: 'groom',
      chatId: '39333111222@c.us',
      status: 'typing',
      timestamp: '2026-01-06T12:00:00Z',
    })
  );

  expect(screen.getByTestId('rt').textContent).toBe('typing');
});

test('sets error on SSE error', () => {
  render(<TestComponent />);
  const es = MockEventSource.instances[0];

  act(() => es.emitError());
  expect(screen.getByTestId('conn').textContent).toBe('error');
});
