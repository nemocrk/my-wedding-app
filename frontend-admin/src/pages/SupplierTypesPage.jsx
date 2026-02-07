import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import { supplierService } from '../services/supplierService';

const SupplierTypesPage = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const data = await supplierService.getTypes();
            setTypes(data.results || data);
        } catch (e) {
            console.error(e);
            toast.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTypes();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', description: '' });
        setIsModalOpen(true);
    };

    const openEdit = (item) => {
        setEditing(item);
        setForm({ name: item.name, description: item.description || '' });
        setIsModalOpen(true);
    };

    const confirmDelete = (id) => {
        setToDelete(id);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        try {
            await supplierService.deleteType(toDelete);
            setTypes(prev => prev.filter(p => p.id !== toDelete));
            toast.success(t('common.deleted'));
        } catch (e) {
            console.error(e);
            toast.error(t('common.error'));
        } finally {
            setIsDeleteOpen(false);
            setToDelete(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await supplierService.updateType(editing.id, form);
                toast.success(t('common.updated'));
            } else {
                await supplierService.createType(form);
                toast.success(t('common.created'));
            }
            setIsModalOpen(false);
            fetchTypes();
        } catch (e) {
            console.error(e);
            toast.error(t('common.error'));
        }
    };

    return (
        <div className="animate-fadeIn pb-24">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('admin.suppliers.types_title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('admin.suppliers.types_subtitle')}</p>
                </div>
                <button onClick={openCreate} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center">
                    <Plus size={18} className="mr-2" />{t('common.new')}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">{t('common.loading')}</div>
                ) : types.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">{t('admin.suppliers.no_types')}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden lg:block">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('common.name')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('common.description')}</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {types.map((tpe) => (
                                        <tr key={tpe.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{tpe.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{tpe.description}</td>
                                            <td className="px-6 py-4 text-right text-sm">
                                                <button onClick={() => openEdit(tpe)} className="text-indigo-600 mr-3"><Edit2 size={16} /></button>
                                                <button onClick={() => confirmDelete(tpe.id)} className="text-red-600"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:hidden space-y-3">
                            {types.map((tpe) => (
                                <div key={tpe.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="px-6 py-4 text-sm text-gray-500">{tpe.name}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-6 py-4 text-sm font-medium text-gray-900">{tpe.description}</span>
                                        </div>
                                    </div>
                                    {/* Footer: Azioni */}
                                    <div className="flex justify-between items-end pt-2 border-t border-gray-100 flex-col">
                                        <div className="flex gap-3">
                                            <button onClick={() => openEdit(tpe)} className="text-indigo-600 mr-3"><Edit2 size={16} /></button>
                                            <button onClick={() => confirmDelete(tpe.id)} className="text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <h3 className="font-bold">{editing ? t('common.edit') : t('common.create')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm text-gray-700 mb-1">{t('common.name')}</label>
                                    <input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm text-gray-700 mb-1">{t('common.description')}</label>
                                    <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border rounded" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded">{t('common.save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title={t('common.delete')} message={t('common.confirm_delete')} confirmText={t('common.delete')} isDangerous={true} />
        </div>
    );
};

export default SupplierTypesPage;
