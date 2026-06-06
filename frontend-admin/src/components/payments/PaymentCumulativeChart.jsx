// frontend-admin/src/components/payments/PaymentCumulativeChart.jsx
/**
 * PaymentCumulativeChart
 *
 * Visualizza il cumulato dei pagamenti nel tempo aggregato per settimana.
 *
 * - Linea piena verde   → cumulato eventi con status === 'paid'
 * - Linea tratteggiata gialla → cumulato eventi con status === 'planned'
 *
 * Asse X: data di inizio settimana (lunedì) nel formato "12 mag"
 * Asse Y: importo cumulativo in valuta (EUR default)
 *
 * Posizionamento: all'interno della sezione KPI, dopo PaymentKPIBar e prima
 * della lista payables.
 *
 * Props:
 *   payables  {object[]}  — tutti i payable con relativi events[]
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

// ── Costanti ──────────────────────────────────────────────────────────────────
const COLOR_PAID    = '#22c55e'; // green-500
const COLOR_PLANNED = '#facc15'; // yellow-400
const TICK_COLOR    = '#9ca3af'; // gray-400

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formatta un importo in valuta con Intl */
const fmt = (v, currency = 'EUR') =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(v) || 0);

/**
 * Dato un Date, restituisce il lunedì della settimana corrente come Date.
 * Usato per raggruppare eventi nella stessa settimana.
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom, 1=lun, ...
  const diff = (day === 0 ? -6 : 1 - day); // giorni da sottrarre per arrivare a lunedì
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Formatta la data di inizio settimana come etichetta asse X.
 * Esempio: Date(2025-05-12) → "12 mag"
 */
export function formatWeekLabel(date) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(date);
}

/**
 * Estrae e aggrega tutti gli eventi paid/planned da tutti i payables,
 * li raggruppa per settimana e calcola il cumulato.
 *
 * @param {object[]} payables
 * @returns {{ weekKey: string, label: string, paid: number, planned: number }[]}
 */
export function buildChartData(payables) {
  // Raccoglie tutti gli eventi con data valida
  const byWeek = {}; // Map<isoLunedì, { paid, planned }>

  for (const payable of payables) {
    for (const ev of (payable.events ?? [])) {
      if (!ev.payment_date) continue;
      if (ev.status !== 'paid' && ev.status !== 'planned') continue;

      const weekStart = getWeekStart(new Date(ev.payment_date));
      const key = weekStart.toISOString().slice(0, 10); // "YYYY-MM-DD" del lunedì

      if (!byWeek[key]) {
        byWeek[key] = { weekStart, paid: 0, planned: 0 };
      }
      byWeek[key][ev.status] += parseFloat(ev.amount || 0);
    }
  }

  if (Object.keys(byWeek).length === 0) return [];

  // Ordina per data crescente
  const sorted = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b));

  // Calcola il cumulato
  let cumulPaid = 0;
  let cumulPlanned = 0;

  return sorted.map(([key, { weekStart, paid, planned }]) => {
    cumulPaid    += paid;
    cumulPlanned += planned;
    return {
      weekKey:  key,
      label:    formatWeekLabel(weekStart),
      paid:     Math.round(cumulPaid    * 100) / 100,
      planned:  Math.round(cumulPlanned * 100) / 100,
    };
  });
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, currency, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700
        rounded-xl shadow-lg px-4 py-3 text-xs"
      role="tooltip"
    >
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {t('admin.payments.charts.week_of')} {label}
      </p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-gray-500 dark:text-gray-400">{entry.name}:</span>
          <span className="font-medium text-gray-800 dark:text-white">
            {fmt(entry.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const PaymentCumulativeChart = ({ payables = [] }) => {
  const { t } = useTranslation();

  const data     = useMemo(() => buildChartData(payables), [payables]);
  const currency = payables[0]?.events?.[0]?.currency ?? 'EUR';

  // Non renderizzare se non ci sono dati
  if (data.length === 0) return null;

  // Linea di riferimento alla data odierna
  const todayLabel = formatWeekLabel(getWeekStart(new Date()));
  const todayInData = data.some(d => d.label === todayLabel);

  return (
    <div
      className="mt-4 mb-2 bg-white dark:bg-gray-900 border border-gray-100
        dark:border-gray-800 rounded-2xl p-5"
      data-testid="payment-cumulative-chart"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={16} className="text-green-500" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
          {t('admin.payments.charts.cumulative_title')}
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        >
          {/* Griglia orizzontale leggera */}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(156,163,175,0.2)"
          />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: TICK_COLOR }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={v => fmt(v, currency)}
            tick={{ fontSize: 10, fill: TICK_COLOR }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          <Tooltip
            content={<ChartTooltip currency={currency} t={t} />}
            cursor={{ stroke: 'rgba(156,163,175,0.3)', strokeWidth: 1 }}
          />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />

          {/* Linea piena — paid cumulato */}
          <Line
            type="monotone"
            dataKey="paid"
            name={t('admin.payments.charts.cumulative_paid')}
            stroke={COLOR_PAID}
            strokeWidth={2}
            dot={{ r: 3, fill: COLOR_PAID }}
            activeDot={{ r: 5 }}
          />

          {/* Linea tratteggiata — planned cumulato */}
          <Line
            type="monotone"
            dataKey="planned"
            name={t('admin.payments.charts.cumulative_planned')}
            stroke={COLOR_PLANNED}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: COLOR_PLANNED }}
            activeDot={{ r: 5 }}
          />

          {/* Linea verticale sulla settimana corrente */}
          {todayInData && (
            <ReferenceLine
              x={todayLabel}
              stroke="rgba(156,163,175,0.5)"
              strokeDasharray="4 3"
              label={{
                value: t('admin.payments.charts.today'),
                position: 'insideTopRight',
                fontSize: 10,
                fill: TICK_COLOR,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PaymentCumulativeChart;
