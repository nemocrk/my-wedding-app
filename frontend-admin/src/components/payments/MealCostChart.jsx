// frontend-admin/src/components/payments/MealCostChart.jsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { UtensilsCrossed } from 'lucide-react';

// ── Palette ───────────────────────────────────────────────────────────────────
const COLOR_ADULTS   = '#f97316'; // orange-500
const COLOR_CHILDREN = '#fb923c'; // orange-400 (più chiaro)
const COLOR_PAID     = '#22c55e'; // green-500
const COLOR_PLANNED  = '#facc15'; // yellow-400
const COLOR_REMAINING = '#f43f5e'; // rose-500

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v, currency = 'EUR') =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(v) || 0);

/**
 * Calcola i totali pagati/pianificati dagli eventi di un payable.
 */
function calcEventTotals(events = []) {
  let paid = 0, planned = 0;
  for (const ev of events) {
    const amount = parseFloat(ev.amount || 0);
    if (ev.status === 'paid')    paid    += amount;
    if (ev.status === 'planned') planned += amount;
  }
  return { paid, planned };
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────────
function MealTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-800 dark:text-white mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: entry.fill || entry.color }}
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
/**
 * MealCostChart
 * Visualizza un BarChart grouped dei costi pasto per ogni payable di tipo meal.
 *
 * Ogni barra mostra:
 *   • Costo adulti (count × unit_cost)
 *   • Costo bambini (count × unit_cost)
 *
 * Un secondo pannello mostra lo stato pagamenti (paid / planned / remaining).
 *
 * Props:
 *   payables  {object[]}  — lista di payable con entity_type === 'meal'
 */
const MealCostChart = ({ payables = [] }) => {
  const { t } = useTranslation();

  // Dati per il grafico composizione costi
  const breakdownData = useMemo(() => {
    return payables
      .map(p => {
        const adults   = (parseFloat(p.meal_adults_count  || 0)) * (parseFloat(p.meal_adult_unit_cost  || 0));
        const children = (parseFloat(p.meal_children_count || 0)) * (parseFloat(p.meal_child_unit_cost  || 0));
        return {
          name:     p.entity_name,
          adulti:   Math.round(adults   * 100) / 100,
          bambini:  Math.round(children * 100) / 100,
          currency: p.currency || 'EUR',
        };
      })
      .filter(d => d.adulti > 0 || d.bambini > 0);
  }, [payables]);

  // Dati per il grafico stato pagamenti
  const paymentData = useMemo(() => {
    return payables.map(p => {
      const { paid, planned } = calcEventTotals(p.events);
      const contract  = parseFloat(p.contract_amount || 0);
      const remaining = Math.max(0, contract - paid - planned);
      return {
        name:      p.entity_name,
        pagato:    Math.round(paid      * 100) / 100,
        pianificato: Math.round(planned  * 100) / 100,
        rimanente: Math.round(remaining * 100) / 100,
        currency:  p.currency || 'EUR',
      };
    });
  }, [payables]);

  const currency = payables[0]?.currency || 'EUR';

  // Non renderizzare se non ci sono dati significativi
  const hasBreakdown = breakdownData.length > 0;
  const hasPayments  = paymentData.some(d => d.pagato > 0 || d.pianificato > 0 || d.rimanente > 0);

  if (!hasBreakdown && !hasPayments) return null;

  return (
    <div className="mt-6 mb-2 grid grid-cols-1 gap-4 md:grid-cols-2">

      {/* ── Grafico 1: Composizione costo pasto ── */}
      {hasBreakdown && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed size={16} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              {t('admin.payments.charts.meal_breakdown_title')}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={breakdownData}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(v, currency)}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={<MealTooltip currency={currency} />}
                cursor={{ fill: 'rgba(249,115,22,0.06)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                dataKey="adulti"
                name={t('admin.payments.charts.meal_adults')}
                fill={COLOR_ADULTS}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="bambini"
                name={t('admin.payments.charts.meal_children')}
                fill={COLOR_CHILDREN}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Grafico 2: Stato pagamenti pasto ── */}
      {hasPayments && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed size={16} className="text-green-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              {t('admin.payments.charts.meal_payment_status_title')}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={paymentData}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(v, currency)}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                content={<MealTooltip currency={currency} />}
                cursor={{ fill: 'rgba(34,197,94,0.06)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                dataKey="pagato"
                name={t('admin.payments.charts.meal_paid')}
                fill={COLOR_PAID}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pianificato"
                name={t('admin.payments.charts.meal_planned')}
                fill={COLOR_PLANNED}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="rimanente"
                name={t('admin.payments.charts.meal_remaining')}
                fill={COLOR_REMAINING}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
};

export default MealCostChart;
