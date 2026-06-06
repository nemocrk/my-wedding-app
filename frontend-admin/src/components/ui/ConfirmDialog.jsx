// frontend-admin/src/components/ui/ConfirmDialog.jsx
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — modale di conferma generico.
 *
 * Props:
 *   isOpen   {boolean}  - controlla la visibilità
 *   title    {string}   - titolo del dialog (default: t('common.confirm'))
 *   message  {string}   - corpo del messaggio
 *   onConfirm {fn}      - callback chiamato alla conferma
 *   onCancel  {fn}      - callback chiamato all'annullamento / chiusura
 *   confirmLabel {string} - etichetta pulsante confirm (default: t('common.confirm'))
 *   confirmVariant {'danger'|'primary'} - default 'danger'
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmVariant = 'danger',
}) {
  const { t } = useTranslation();
  const cancelRef = useRef(null);

  // Focus trap: sposta il focus sul bottone Annulla all'apertura
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  // Chiudi con ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmClasses =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
        {/* Icona + Titolo */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-gray-900 dark:text-white leading-snug"
            >
              {title ?? t('common.confirm')}
            </h2>
            {message && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${confirmClasses}`}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
