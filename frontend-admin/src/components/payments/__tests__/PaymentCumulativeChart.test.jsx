// frontend-admin/src/components/payments/__tests__/PaymentCumulativeChart.test.jsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  buildChartData,
  formatWeekLabel,
  getWeekStart,
} from '../PaymentCumulativeChart';

// ── Mock Recharts ─────────────────────────────────────────────────────────────
// Recharts usa ResizeObserver che non esiste in jsdom — mockkiamo il modulo.
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock react-i18next — restituisce la chiave come testo
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

// ── Import del componente (dopo i mock) ───────────────────────────────────────
// eslint-disable-next-line import/first
import PaymentCumulativeChart from '../PaymentCumulativeChart';

// ── Helpers di test ───────────────────────────────────────────────────────────

/**
 * Serializza un Date come "YYYY-MM-DD" usando metodi UTC,
 * coerente con getWeekStart che opera in UTC.
 */
const toUTCDateString = (d) => d.toISOString().slice(0, 10);

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Due payable con eventi in settimane diverse. */
const PAYABLES_FIXTURE = [
  {
    id: 1,
    entity_type: 'supplier',
    entity_name: 'Fotografo',
    contract_amount: '3000',
    events: [
      // Mercoledì 14 mag 2025 → settimana del lunedì 12 mag
      { id: 10, status: 'paid', payment_date: '2025-05-14', amount: '500' },
      // Venerdì 16 mag 2025 → stessa settimana (12 mag)
      { id: 11, status: 'paid', payment_date: '2025-05-16', amount: '300' },
      // Martedì 20 mag 2025 → settimana del lunedì 19 mag
      { id: 12, status: 'planned', payment_date: '2025-05-20', amount: '1000' },
    ],
  },
  {
    id: 2,
    entity_type: 'room',
    entity_name: 'Sala ricevimento',
    contract_amount: '5000',
    events: [
      // Martedì 13 mag 2025 → stessa settimana del primo paid (12 mag)
      { id: 20, status: 'paid', payment_date: '2025-05-13', amount: '200' },
      // Mercoledì 28 mag 2025 → settimana del lunedì 26 mag
      { id: 21, status: 'planned', payment_date: '2025-05-28', amount: '2000' },
    ],
  },
];

// ── Unit test: getWeekStart ───────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('restituisce il lunedì per un giorno feriale (mercoledì 14 mag → lunedì 12 mag)', () => {
    const result = getWeekStart('2025-05-14'); // stringa ISO → UTC midnight
    expect(toUTCDateString(result)).toBe('2025-05-12');
  });

  it('restituisce lo stesso giorno se è già lunedì', () => {
    const result = getWeekStart('2025-05-12');
    expect(toUTCDateString(result)).toBe('2025-05-12');
  });

  it('gestisce la domenica riportandola al lunedì della settimana precedente', () => {
    // Domenica 11 mag 2025 → lunedì 5 mag 2025
    const result = getWeekStart('2025-05-11');
    expect(toUTCDateString(result)).toBe('2025-05-05');
  });

  it('gestisce il sabato correttamente (sabato 10 mag → lunedì 5 mag)', () => {
    const result = getWeekStart('2025-05-10');
    expect(toUTCDateString(result)).toBe('2025-05-05');
  });

  it('gestisce correttamente il cambio mese', () => {
    // Giovedì 1 mag 2025 → lunedì 28 apr 2025
    const result = getWeekStart('2025-05-01');
    expect(toUTCDateString(result)).toBe('2025-04-28');
  });
});

// ── Unit test: formatWeekLabel ────────────────────────────────────────────────

describe('formatWeekLabel', () => {
  it('contiene il numero del giorno atteso', () => {
    const label = formatWeekLabel(getWeekStart('2025-05-14')); // → lunedì 12 mag
    expect(label).toMatch(/12/);
  });

  it('non contiene l\'anno', () => {
    const label = formatWeekLabel(getWeekStart('2025-05-14'));
    expect(label).not.toMatch(/2025/);
  });
});

// ── Unit test: buildChartData ─────────────────────────────────────────────────

describe('buildChartData', () => {
  it('restituisce solo data corrente se payables è vuoto', () => {
    expect(buildChartData([])).toHaveLength(1);
  });

  it('restituisce solo data corrente se gli eventi non hanno payment_date', () => {
    const payables = [{ events: [{ status: 'paid', amount: '100' }] }];
    expect(buildChartData(payables)).toHaveLength(1);
  });

  it('ignora eventi con status diverso da paid/planned', () => {
    const payables = [{
      events: [
        { status: 'cancelled', payment_date: '2025-05-14', amount: '999' },
        { status: 'pending', payment_date: '2025-05-14', amount: '500' },
      ],
    }];
    expect(buildChartData(payables)).toHaveLength(1);
  });

  it('aggrega correttamente più eventi nella stessa settimana', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    // Settimana 12 mag: paid 500 (id10) + 300 (id11) + 200 (id20) = 1000
    const firstWeek = data[0];
    expect(firstWeek.weekKey).toBe('2025-05-12');
    expect(firstWeek.paid).toBe(1000);
    expect(firstWeek.planned).toBe(null);
  });

  it('calcola il cumulato paid tra settimane', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    // Settimana 19 mag: nessun nuovo paid → cumulato paid invariato = 1000
    const secondWeek = data[1];
    expect(secondWeek.weekKey).toBe('2025-05-19');
    expect(secondWeek.paid).toBe(1000);
  });

  it('calcola il cumulato planned tra settimane', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    // Settimana 19 mag: planned += 1000 → cumulato planned = 1000
    expect(data[1].planned).toBe(2000);
    // Settimana 26 mag: planned += 2000 → cumulato planned = 3000
    expect(data[2].planned).toBe(4000);
  });

  it('ordina le settimane in ordine crescente', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    const keys = data.map(d => d.weekKey);
    expect(keys).toEqual([...keys].sort());
  });

  it('produce 3 punti dati per il fixture (12 mag, 19 mag, 26 mag)', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    expect(data).toHaveLength(3 + 1);
  });

  it('il cumulato finale paid è la somma di tutti gli eventi paid', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    expect(data[data.length - 1].paid).toBe(1000); // 500+300+200
  });

  it('il cumulato finale planned è la somma di tutti gli eventi planned', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    expect(data[data.length - 1].planned).toBe(4000); // 1000+2000
  });
});

// ── Render test: PaymentCumulativeChart ───────────────────────────────────────

describe('PaymentCumulativeChart (render)', () => {

  it('renderizza il wrapper con data-testid quando ci sono dati validi', () => {
    render(<PaymentCumulativeChart payables={PAYABLES_FIXTURE} />);
    expect(screen.getByTestId('payment-cumulative-chart')).toBeInTheDocument();
  });

  it('mostra il titolo del grafico (chiave i18n)', () => {
    render(<PaymentCumulativeChart payables={PAYABLES_FIXTURE} />);
    expect(
      screen.getByText('admin.payments.charts.cumulative_title')
    ).toBeInTheDocument();
  });

  it('renderizza il LineChart tramite Recharts mock', () => {
    render(<PaymentCumulativeChart payables={PAYABLES_FIXTURE} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
