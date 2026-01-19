import React, { useState, useEffect } from 'react';
import { X, Loader, Tag, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const BulkLabelModal = ({ open, onClose, selectedIds, onSuccess }) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]); // Array of IDs
  const [action, setAction] = useState('add'); // 'add' or 'remove'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchLabels();
      setSelectedLabels([]);
      setAction('add');
      setError(null);
    }
  }, [open]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitationLabels();
      setLabels(data.results || data);
    } catch (err) {
      console.error("Error fetching labels:", err);
      setError(t('admin.common.error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedLabels.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.bulkManageLabels(selectedIds, selectedLabels, action);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error bulk updating labels:", err);
      setError(t('admin.common.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLabel = (id) => {
    setSelectedLabels(prev =>
      prev.includes(id)
        ? prev.filter(l => l !== id)
        : [...prev, id]
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                <Tag size={20} className="text-pink-600" />
                {t('admin.invitations.bulk_labels.title')}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader size={32} className="animate-spin text-pink-600" />
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500">
                        {t('admin.invitations.bulk_labels.subtitle', { count: selectedIds.length })}
                    </p>

                    {/* Action Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.invitations.bulk_labels.action_label')}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`
                                flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm
                                ${action === 'add' ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium ring-1 ring-pink-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                            `}>
                                <input 
                                    type="radio" 
                                    name="action" 
                                    value="add" 
                                    checked={action === 'add'} 
                                    onChange={(e) => setAction(e.target.value)}
                                    className="sr-only"
                                />
                                {t('admin.invitations.bulk_labels.action_add')}
                            </label>

                            <label className={`
                                flex items-center justify-center px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm
                                ${action === 'remove' ? 'border-red-500 bg-red-50 text-red-700 font-medium ring-1 ring-red-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                            `}>
                                <input 
                                    type="radio" 
                                    name="action" 
                                    value="remove" 
                                    checked={action === 'remove'} 
                                    onChange={(e) => setAction(e.target.value)}
                                    className="sr-only"
                                />
                                {t('admin.invitations.bulk_labels.action_remove')}
                            </label>
                        </div>
                    </div>

                    {/* Labels Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                           {t('admin.invitations.bulk_labels.labels_select')}
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                            {labels.length === 0 && (
                                <span className="text-sm text-gray-400 italic">No labels available</span>
                            )}
                            {labels.map((label) => {
                                const isSelected = selectedLabels.includes(label.id);
                                return (
                                    <button
                                        key={label.id}
                                        onClick={() => toggleLabel(label.id)}
                                        className={`
                                            inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                                            ${isSelected 
                                                ? 'ring-2 ring-offset-1 ring-gray-400 shadow-sm' 
                                                : 'opacity-80 hover:opacity-100 hover:shadow-sm border-transparent'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: label.color || '#e5e7eb',
                                            color: '#ffffff',
                                            textShadow: '0px 1px 1px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        {isSelected && <Check size={14} className="mr-1.5" strokeWidth={3} />}
                                        {label.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
                {t('admin.common.cancel')}
            </button>
            <button
                onClick={handleSubmit}
                disabled={submitting || selectedLabels.length === 0}
                className="px-4 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
                {submitting && <Loader size={18} className="animate-spin mr-2" />}
                {t('admin.common.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BulkLabelModal;
