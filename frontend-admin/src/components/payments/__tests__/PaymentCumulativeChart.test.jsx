// frontend-admin/src/components/payments/__tests__/PaymentCumulativeChart.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  buildChartData,
  getWeekStart,
  formatWeekLabel,
} from '../PaymentCumulativeChart';

// ── Mock Recharts ────────────────────────────────────────────────────────────────
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

// ── Import del componente (dopo i mock) ─────────────────────────────────────────
// eslint-disable-next-line import/first
import PaymentCumulativeChart from '../PaymentCumulativeChart';

// ── Fixtures ───────────────────────────────────────────────────────────────────

/** Due payable con eventi in settimane diverse. */
const PAYABLES_FIXTURE = [
  {
    id: 1,
    entity_type: 'supplier',
    entity_name: 'Fotografo',
    contract_amount: '3000',
    events: [
      // Lunedì 12 mag 2025
      { id: 10, status: 'paid',    payment_date: '2025-05-14', amount: '500' },
      // Stessa settimana (12 mag)
      { id: 11, status: 'paid',    payment_date: '2025-05-16', amount: '300' },
      // Settimana successiva (19 mag)
      { id: 12, status: 'planned', payment_date: '2025-05-20', amount: '1000' },
    ],
  },
  {
    id: 2,
    entity_type: 'room',
    entity_name: 'Sala ricevimento',
    contract_amount: '5000',
    events: [
      // Stessa settimana del primo paid (12 mag)
      { id: 20, status: 'paid',    payment_date: '2025-05-13', amount: '200' },
      // Settimana 26 mag
      { id: 21, status: 'planned', payment_date: '2025-05-28', amount: '2000' },
    ],
  },
];

// ── Unit test: getWeekStart ───────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('restituisce il lunedì per un giorno feriale', () => {
    // Mercoledì 14 mag 2025 → lunedì 12 mag 2025
    const result = getWeekStart(new Date('2025-05-14'));
    expect(result.toISOString().slice(0, 10)).toBe('2025-05-12');
  });

  it('restituisce lo stesso giorno se è già lunedì', () => {
    const result = getWeekStart(new Date('2025-05-12'));
    expect(result.toISOString().slice(0, 10)).toBe('2025-05-12');
  });

  it('gestisce la domenica riportandola alla settimana precedente', () => {
    // Domenica 11 mag 2025 → lunedì 5 mag 2025
    const result = getWeekStart(new Date('2025-05-11'));
    expect(result.toISOString().slice(0, 10)).toBe('2025-05-05');
  });
});

// ── Unit test: formatWeekLabel ────────────────────────────────────────────────────────

describe('formatWeekLabel', () => {
  it('formatta come "12 mag" per il 12 maggio', () => {
    const label = formatWeekLabel(new Date('2025-05-12'));
    // L'output esatto dipende dal locale jsdom; verifichiamo che contenga "12"
    expect(label).toMatch(/12/);
  });
});

// ── Unit test: buildChartData ─────────────────────────────────────────────────────────

describe('buildChartData', () => {
  it('restituisce array vuoto se non ci sono payables', () => {
    expect(buildChartData([])).toEqual([]);
  });

  it('restituisce array vuoto se gli eventi non hanno payment_date', () => {
    const payables = [{ events: [{ status: 'paid', amount: '100' }] }];
    expect(buildChartData(payables)).toEqual([]);
  });

  it('ignora eventi con status diverso da paid/planned', () => {
    const payables = [{
      events: [
        { status: 'cancelled', payment_date: '2025-05-14', amount: '999' },
      ],
    }];
    expect(buildChartData(payables)).toEqual([]);
  });

  it('aggrega correttamente più eventi nella stessa settimana', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    // Prima settimana (12 mag): paid 500+300+200=1000, planned 0
    const firstWeek = data[0];
    expect(firstWeek.paid).toBe(1000);
    expect(firstWeek.planned).toBe(0);
  });

  it('calcola il cumulato tra settimane', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    // Seconda settimana (19 mag): planned += 1000 → cumulato planned = 1000
    const secondWeek = data[1];
    expect(secondWeek.paid).toBe(1000);    // nessun nuovo paid in questa settimana
    expect(secondWeek.planned).toBe(1000); // primo planned
  });

  it('ordina le settimane in modo crescente', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    const keys = data.map(d => d.weekKey);
    expect(keys).toEqual([...keys].sort());
  });

  it('produce 3 punti dati per il fixture (12 mag, 19 mag, 26 mag)', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    expect(data).toHaveLength(3);
  });

  it('il cumulato finale paid è la somma di tutti gli eventi paid', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    const lastPoint = data[data.length - 1];
    // 500 + 300 + 200 = 1000
    expect(lastPoint.paid).toBe(1000);
  });

  it('il cumulato finale planned è la somma di tutti gli eventi planned', () => {
    const data = buildChartData(PAYABLES_FIXTURE);
    const lastPoint = data[data.length - 1];
    // 1000 + 2000 = 3000
    expect(lastPoint.planned).toBe(3000);
  });
});

// ── Render test: PaymentCumulativeChart ─────────────────────────────────────────────

describe('PaymentCumulativeChart (render)', () => {
  it('non renderizza nulla se payables è vuoto', () => {
    const { container } = render(<PaymentCumulativeChart payables={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('non renderizza nulla se gli eventi non hanno dati validi', () => {
    const payables = [{ events: [{ status: 'paid', amount: '100' }] }];
    const { container } = render(<PaymentCumulativeChart payables={payables} />);
    expect(container.firstChild).toBeNull();
  });

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
