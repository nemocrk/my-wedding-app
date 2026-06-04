import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2 } from 'lucide-react';
import paymentService from '../../services/paymentService';

const STATUS_OPTIONS = ['planned', 'paid', 'cancelled'];

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-800',
  planned: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function PaymentEventModal({ isOpen, onClose, onSaved, payable, eventToEdit = null }) {
  const { t } = useTranslation();
  const isEdit = !!eventToEdit;

  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    label: '',
    amount: '',
    currency: 'EUR',
    payment_date: '',
    status: 'planned',
    platform: '',
  });

  // Load platforms on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingPlatforms(true);
    paymentService.getPlatforms()
      .then(data => setPlatforms(data?.results ?? data ?? []))
      .catch(() => setPlatforms([]))
      .finally(() => setLoadingPlatforms(false));
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (isEdit && eventToEdit) {
      setForm({
        label: eventToEdit.label ?? '',
        amount: eventToEdit.amount ?? '',
        currency: eventToEdit.currency ?? 'EUR',
        payment_date: eventToEdit.payment_date ?? '',
        status: eventToEdit.status ?? 'planned',
        platform: eventToEdit.platform ?? '',
      });
    } else {
      setForm({
        label: '',
        amount: '',
        currency: payable?.currency ?? 'EUR',
        payment_date: '',
        status: 'planned',
        platform: '',
      });
    }
    setErrors({});
  }, [isOpen, eventToEdit, payable]);

  const validate = () => {
    const e = {};
    if (!form.label.trim()) e.label = t('payments.modal.error_label_required');
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      e.amount = t('payments.modal.error_amount_required');
    if (!form.payment_date) e.payment_date = t('payments.modal.error_date_required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        platform: form.platform || null,
        content_type: payable?.content_type,
        object_id: payable?.object_id,
      };
      if (isEdit) {
        await paymentService.updateEvent(eventToEdit.id, payload);
      } else {
        await paymentService.createEvent(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('PaymentEventModal save error:', err);
      setErrors({ submit: t('common.error_occurred') });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEdit ? t('payments.modal.title_edit') : t('payments.modal.title_create')}
            </h2>
            {payable && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {payable.entity_name} &mdash; {payable.currency}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.modal.label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.label}
              onChange={e => handleChange('label', e.target.value)}
              placeholder={t('payments.modal.label_placeholder')}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                ${ errors.label ? 'border-red-400' : 'border-gray-200 dark:border-gray-700' }`}
            />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
          </div>

          {/* Amount + Currency (read-only) */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payments.modal.amount')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                  ${ errors.amount ? 'border-red-400' : 'border-gray-200 dark:border-gray-700' }`}
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payments.modal.currency')}
              </label>
              <input
                type="text"
                value={form.currency}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm
                  bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.modal.date')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.payment_date}
              onChange={e => handleChange('payment_date', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                ${ errors.payment_date ? 'border-red-400' : 'border-gray-200 dark:border-gray-700' }`}
            />
            {errors.payment_date && <p className="text-xs text-red-500 mt-1">{errors.payment_date}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.modal.status')}
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChange('status', s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${ form.status === s
                      ? `${STATUS_COLORS[s]} border-transparent ring-2 ring-offset-1 ring-current`
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  {t(`payments.status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payments.modal.platform')}
            </label>
            {loadingPlatforms ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <select
                value={form.platform}
                onChange={e => handleChange('platform', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm
                  bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('payments.modal.platform_none')}</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Submit error */}
          {errors.submit && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {errors.submit}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm
                font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60
                text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? t('common.processing') : t('payments.modal.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
