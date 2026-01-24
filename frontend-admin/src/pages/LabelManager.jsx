import { Edit2, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { api } from '../services/api';

const LabelManager = () => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);

  // Delete handling
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });
  const [saving, setSaving] = useState(false);

  // Predefined colors
  const colorPalette = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
    '#64748B', '#000000'
  ];

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitationLabels();
      setLabels(data.results || data);
    } catch (error) {
      console.error('Failed to load labels', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreate = () => {
    setEditingLabel(null);
    setFormData({ name: '', color: '#3B82F6' });
    setIsModalOpen(true);
  };

  const handleEdit = (label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteInvitationLabel(itemToDelete);
      setLabels(prev => prev.filter(l => l.id !== itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Failed to delete label', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLabel) {
        await api.updateInvitationLabel(editingLabel.id, formData);
      } else {
        await api.createInvitationLabel(formData);
      }
      setIsModalOpen(false);
      fetchLabels();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('admin.labels.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin.labels.subtitle')}</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-pink-200"
        >
          <Plus size={20} className="mr-2" />
          {t('admin.labels.new_label')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          </div>
        ) : labels.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Tag size={48} className="text-gray-300 mb-3 mx-auto" />
            <p className="text-lg font-medium text-gray-900">{t('admin.labels.no_labels')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    {t('admin.labels.table.preview')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    {t('admin.labels.table.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                    {t('admin.labels.table.color')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin.labels.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labels.map((label) => (
                  <tr key={label.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {label.name}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      {label.color}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(label)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(label.id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label={`Delete ${label.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">
                {editingLabel ? (t('admin.labels.edit_title')) : (t('admin.labels.create_title'))}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" for="nome-label">
                  {t('admin.labels.form.name')}
                </label>
                <input
                  id="nome-label"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="es. VIP, Colleghi..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.labels.form.color')}
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {colorPalette.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-9 w-14 p-0 border-0 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg flex items-center font-medium shadow-sm transition-all"
                >
                  {saving ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {t('common.save')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('admin.labels.delete_modal.title')}
        message={t('admin.labels.delete_modal.message')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDangerous={true}
      />
    </div>
  );
};

export default LabelManager;