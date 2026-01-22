// frontend-admin/src/components/invitations/BulkSendConfirmModal.jsx
import { AlertCircle, CheckCircle, Phone, Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

const BulkSendConfirmModal = ({ isOpen, onClose, selectedIds, invitations, onSuccess }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [isSending, setIsSending] = useState(false);

  // Filter selected invitations
  const selectedInvitations = useMemo(() => {
    return invitations.filter(inv => selectedIds.includes(inv.id));
  }, [invitations, selectedIds]);

  // Analyze contacts
  const { valid, invalid } = useMemo(() => {
    const valid = [];
    const invalid = [];

    selectedInvitations.forEach(inv => {
      // Logic: Contact is valid if it has a phone number
      // We might also check if it's already sent, but the API handles idempotency usually.
      // For UI clarity, we prioritize phone number presence.
      if (inv.phone_number && inv.phone_number.length > 5 && inv.status == 'created') {
        valid.push(inv);
      } else {
        invalid.push(inv);
      }
    });

    return { valid, invalid };
  }, [selectedInvitations]);

  const handleConfirm = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      // Only send valid IDs to the API
      const validIds = valid.map(inv => inv.id);

      if (validIds.length === 0) {
        // Should not happen due to button disabled state, but safety first
        onClose();
        return;
      }

      await api.bulkSendInvitations(validIds);

      // Artificial delay for UX
      setTimeout(() => {
        setIsSending(false);
        onSuccess();
        onClose();
      }, 500);

    } catch (error) {
      console.error("Bulk send failed", error);
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full mr-3">
              <Send size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('admin.invitations.bulk_send_confirm.title')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('admin.invitations.bulk_send_confirm.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center text-green-600 text-sm font-medium mb-1">
                <CheckCircle size={16} className="mr-1" />
                {t('admin.invitations.bulk_send_confirm.ready_to_send')}
              </div>
              <div className="text-3xl font-bold text-green-900">{valid.length}</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center text-red-600 text-sm font-medium mb-1">
                <AlertCircle size={16} className="mr-1" />
                {t('admin.invitations.bulk_send_confirm.missing_contact')}
              </div>
              <div className="text-3xl font-bold text-red-900">{invalid.length}</div>
            </div>
          </div>

          {/* Warning for Invalid */}
          {invalid.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    {t('admin.invitations.bulk_send_confirm.exclusion_warning')}
                  </h3>
                  <p className="text-sm text-yellow-800">
                    {t('admin.invitations.bulk_send_confirm.exclusion_details', { count: invalid.length })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Valid List */}
          {valid.length > 0 ? (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                {t('admin.invitations.bulk_send_confirm.recipient_list')}
              </h3>
              <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto divide-y divide-gray-200">
                {valid.map((inv) => (
                  <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                    <div className="flex items-center min-w-0">
                      <span className="text-xl mr-3" role="img" aria-label="origin">
                        {inv.origin === 'bride' ? '👰' : '🤵'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900 truncate">{inv.name}</div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Phone size={10} className="mr-1" />
                          <span className="font-mono">{inv.phone_number}</span>
                        </div>
                      </div>
                    </div>
                    {inv.status === 'sent' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {t('admin.invitations.status.already_sent')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle size={48} className="mx-auto text-gray-300 mb-2" />
              <p>{t('admin.invitations.bulk_send_confirm.no_valid_contacts')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={valid.length === 0 || isSending}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center text-white shadow-sm
                ${valid.length === 0 || isSending
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                }`}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  {t('admin.invitations.bulk_send_confirm.confirm_action')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkSendConfirmModal;