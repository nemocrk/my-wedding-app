// frontend-admin/src/pages/PaymentsPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, RefreshCw } from 'lucide-react';
import paymentService from '../services/paymentService';
import PaymentKPIBar from '../components/payments/PaymentKPIBar';
import PaymentEventModal from '../components/payments/PaymentEventModal';
import PayableRow from '../components/payments/PayableRow';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    setLoading(true);
    paymentService.getPayables()
      .then(data => setPayables(data?.results ?? data ?? []))
      .catch(() => setPayables([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleAddEvent = (payable) => {
    setSelectedPayable(payable);
    setEventToEdit(null);
    setModalOpen(true);
  };

  const handleEditEvent = (payable, ev) => {
    setSelectedPayable(payable);
    setEventToEdit(ev);
    setModalOpen(true);
  };

  // Apre il ConfirmDialog invece di window.confirm()
  const handleDeleteEvent = (ev) => {
    setEventToDelete(ev);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    if (!eventToDelete) return;
    try {
      await paymentService.deleteEvent(eventToDelete.id);
      refresh();
    } catch (err) {
      console.error('Delete event error:', err);
    } finally {
      setEventToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setEventToDelete(null);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    refresh();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <CreditCard size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('admin.payments.page_title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('admin.payments.page_subtitle')}
            </p>
          </div>
        </div>
        {/* FIX: era t('common.loading'), ora corretto in t('common.refresh') */}
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={15} />
          {t('common.refresh')}
        </button>
      </div>

      {/* KPI Bar — fetches summary internally, re-fetches on refreshKey change */}
      <PaymentKPIBar refreshKey={refreshKey} />

      {/* Payables section */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {t('admin.payments.payables.title')}
        </h2>

        {loading ? (
          // Skeleton migliorato: altezze variabili per maggior realismo
          <div className="space-y-3">
            {[14, 20, 16].map((h, i) => (
              <div
                key={i}
                className={`h-${h} bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse`}
              />
            ))}
          </div>
        ) : payables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CreditCard size={40} className="mb-3 opacity-40" />
            <p className="text-sm">{t('admin.payments.payables.empty')}</p>
            <p className="text-xs mt-1">{t('admin.payments.payables.empty_subtitle')}</p>
          </div>
        ) : (
          <div>
            {payables.map(p => (
              <PayableRow
                key={`${p.entity_type}-${p.object_id}`}
                payable={p}
                onAddEvent={handleAddEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Event Modal */}
      <PaymentEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleModalSaved}
        payable={selectedPayable}
        eventToEdit={eventToEdit}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('common.confirm_delete')}
        message={t('admin.payments.events.delete_confirm_message')}
        confirmLabel={t('common.delete')}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
