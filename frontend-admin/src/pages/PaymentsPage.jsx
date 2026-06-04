import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentKPIBar from '../components/payments/PaymentKPIBar';
import { useToast } from '../contexts/ToastContext';
import { paymentService } from '../services/paymentService';

/**
 * PaymentsPage (#146)
 * Pagina principale del Payment Tracker.
 *
 * Struttura attuale (v1):
 *   - PaymentKPIBar  — 5 KPI aggregati (summary)
 *   - PayablesTable  — lista entità pagabili con eventi (TODO: prossimo commit)
 *
 * I componenti PayablesTable e PaymentEventModal saranno aggiunti
 * nel commit successivo per mantenere PR reviewable.
 */
const PaymentsPage = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [payables, setPayables] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPayables, setLoadingPayables] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await paymentService.getSummary();
      setSummary(data);
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_loading'));
    } finally {
      setLoadingSummary(false);
    }
  }, [toast, t]);

  const fetchPayables = useCallback(async () => {
    setLoadingPayables(true);
    try {
      const data = await paymentService.getPayables();
      setPayables(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      console.error(e);
      toast.error(t('common.error_loading'));
    } finally {
      setLoadingPayables(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchSummary();
    fetchPayables();
  }, [fetchSummary, fetchPayables, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  // ---- Status badge helper ----
  const statusConfig = {
    paid: { label: t('payments.status.paid'), cls: 'bg-green-100 text-green-700' },
    planned: { label: t('payments.status.planned'), cls: 'bg-amber-100 text-amber-700' },
    cancelled: { label: t('payments.status.cancelled'), cls: 'bg-gray-100 text-gray-500 line-through' },
  };

  const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="animate-fadeIn pb-24">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('payments.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('payments.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} />
            {t('common.refresh')}
          </button>
          <button
            disabled
            title={t('payments.add_event_coming_soon')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-pink-600 text-white rounded-lg opacity-50 cursor-not-allowed"
          >
            <Plus size={15} />
            {t('payments.add_event')}
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <PaymentKPIBar summary={summary} loading={loadingSummary} />

      {/* Payables List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700">{t('payments.payables_title')}</h2>
        </div>

        {loadingPayables ? (
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : payables.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">{t('payments.no_payables')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payables.map((item) => (
              <div key={`${item.entity_type}-${item.object_id}`} className="px-6 py-4">
                {/* Payable header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                      item.entity_type === 'room'
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-pink-50 text-pink-600'
                    }`}>
                      {t(`payments.entity_type.${item.entity_type}`)}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{t('payments.kpi.total_contracts')}: <strong className="text-gray-700 tabular-nums">{item.total_contract} {item.currency}</strong></span>
                    <span className="text-green-600 font-medium tabular-nums">✓ {item.total_paid} {item.currency}</span>
                    <span className="text-amber-600 font-medium tabular-nums">⏳ {item.total_planned} {item.currency}</span>
                    <span className="text-pink-600 font-medium tabular-nums">◻ {item.total_remaining} {item.currency}</span>
                  </div>
                </div>

                {/* Events list */}
                {item.payment_events && item.payment_events.length > 0 ? (
                  <div className="ml-2 space-y-1">
                    {item.payment_events.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge status={evt.status} />
                          <span className="text-sm text-gray-700">{evt.label}</span>
                          {evt.platform_name && (
                            <span className="text-xs text-gray-400">· {evt.platform_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm tabular-nums font-medium text-gray-700">
                            {evt.amount} {evt.currency}
                          </span>
                          <span className="text-xs text-gray-400">{evt.payment_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 ml-2 italic">{t('payments.no_events_for_entity')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
