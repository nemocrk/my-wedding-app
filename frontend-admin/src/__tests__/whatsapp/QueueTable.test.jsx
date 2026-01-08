import React from 'react';
import { render, screen } from '@testing-library/react';
import QueueTable from '../../components/whatsapp/QueueTable';

const baseMsg = {
  id: 1,
  recipient_number: '39333111222',
  session_type: 'groom',
  status: 'pending',
  scheduled_for: '2026-01-06T12:00:00Z',
  attempts: 0,
  error_log: null,
};

test('shows DB status when no realtime status exists', () => {
  render(
    <QueueTable
      messages={[baseMsg]}
      realtimeStatus={{}}
      onRetry={() => {}}
      onForceSend={() => {}}
    />
  );

  expect(screen.getByText('Pending')).toBeInTheDocument();
});

test('shows realtime status when available', () => {
  render(
    <QueueTable
      messages={[baseMsg]}
      realtimeStatus={{
        '39333111222@c.us': { status: 'typing', timestamp: '2026-01-06T12:00:10Z', session: 'groom' },
      }}
      onRetry={() => {}}
      onForceSend={() => {}}
    />
  );

  expect(screen.getByText(/Typing/i)).toBeInTheDocument();
});

test('shows error log when failed', () => {
  const failedMsg = { ...baseMsg, status: 'failed', error_log: 'Network error' };
  
  render(
    <QueueTable
      messages={[failedMsg]}
      realtimeStatus={{}}
      onRetry={() => {}}
      onForceSend={() => {}}
    />
  );

  expect(screen.getByText('Failed')).toBeInTheDocument();
  expect(screen.getByTitle('Network error')).toBeInTheDocument();
});
