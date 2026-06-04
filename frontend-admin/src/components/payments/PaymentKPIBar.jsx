// frontend-admin/src/components/payments/PaymentKPIBar.jsx
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingDown, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import paymentService from '../../services/paymentService';

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (value, currency = 'EUR') => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(value));
};

const KPICard = ({ icon: Icon, label, value, colorClass, bgClass }) => (
  <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${bgClass} flex-1 min-w-[160px]`}>
    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon size={20} className={colorClass} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className="text-lg font-bold text-gray-800 tabular-nums truncate">{value}</p>
    </div>
  </div>
);

const KPICardSkeleton = () => (
  <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-100 bg-white flex-1 min-w-[160px] animate-pulse">
    <div className="w-9 h-9 rounded-lg bg-gray-100" />
    <div className="flex-1">
      <div className="h-3 bg-gray-100 rounded mb-2 w-2/3" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * PaymentKPIBar
 * Fetches payment summary internally and renders 5 KPI cards.
 *
 * Props:
 *   refreshKey  {number}  — increment to trigger a re-fetch
 */
const PaymentKPIBar = ({ refreshKey = 0 }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    paymentService.getSummary()
      .then(data => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-3 mb-6">
        {[...Array(5)].map((_, i) => <KPICardSkeleton key={i} />)}
      </div>
    );
  }

  if (!summary) return null;

  const nextDeadlineLabel = summary.next_deadline
    ? `${summary.next_deadline.label} · ${summary.next_deadline.date}`
    : t('admin.payments.kpi.next_deadline_none');

  const kpis = [
    {
      icon: Wallet,
      label: t('admin.payments.kpi.total_contracts'),
      value: formatCurrency(summary.total_contracts),
      colorClass: 'text-indigo-600',
      bgClass: 'bg-white border-gray-100',
    },
    {
      icon: CheckCircle2,
      label: t('admin.payments.kpi.total_paid'),
      value: formatCurrency(summary.total_paid),
      colorClass: 'text-green-600',
      bgClass: 'bg-green-50 border-green-100',
    },
    {
      icon: Clock,
      label: t('admin.payments.kpi.total_planned'),
      value: formatCurrency(summary.total_planned),
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50 border-amber-100',
    },
    {
      icon: TrendingDown,
      label: t('admin.payments.kpi.total_remaining'),
      value: formatCurrency(summary.total_remaining),
      colorClass: 'text-pink-600',
      bgClass: 'bg-pink-50 border-pink-100',
    },
    {
      icon: AlertCircle,
      label: t('admin.payments.kpi.next_deadline'),
      value: nextDeadlineLabel,
      colorClass: summary.next_deadline ? 'text-orange-500' : 'text-gray-400',
      bgClass: summary.next_deadline ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-100',
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
};

export default PaymentKPIBar;
