import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import { supplierService } from '../services/supplierService';

const SuppliersPage = () => {
    const { t } = useTranslation();
    const toast = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type_id: '', cost: '', currency: 'EUR', contact: '', notes: '' });
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [typesData, suppliersData] = await Promise.all([
                supplierService.getTypes(),
                supplierService.getSuppliers(),
            ]);
            setTypes(typesData.results || typesData);
            setSuppliers(suppliersData.results || suppliersData);
        } catch (e) {
            console.error(e);
            toast.error(t('common.error_loading'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const openCreate = () => { setEditing(null); setForm({ name: '', type_id: types[0]?.id || '', cost: '', currency: 'EUR', contact: '', notes: '' }); setIsModalOpen(true); };
    const openEdit = (s) => { setEditing(s); setForm({ name: s.name, type_id: s.type?.id || '', cost: s.cost, currency: s.currency || 'EUR', contact: JSON.stringify(s.contact || {}), notes: s.notes || '' }); setIsModalOpen(true); };

    const confirmDelete = (id) => { setToDelete(id); setIsDeleteOpen(true); };

    const handleDelete = async () => {
        try {
            await supplierService.deleteSupplier(toDelete);
            setSuppliers(prev => prev.filter(s => s.id !== toDelete));
            toast.success(t('common.deleted'));
        } catch (e) { console.error(e); toast.error(t('common.error')); } finally { setIsDeleteOpen(false); setToDelete(null); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                type_id: form.type_id,
                cost: parseFloat(form.cost) || 0,
                currency: form.currency,
                contact: form.contact ? JSON.parse(form.contact) : {},
                notes: form.notes,
            };
            if (editing) {
                await supplierService.updateSupplier(editing.id, payload);
                toast.success(t('common.updated'));
            } else {
                await supplierService.createSupplier(payload);
                toast.success(t('common.created'));
            }
            setIsModalOpen(false);
            fetchAll();
        } catch (err) {
            console.error(err);
            toast.error(t('common.error'));
        }
    };

    return (
        <div className="animate-fadeIn pb-24">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('admin.suppliers.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('admin.suppliers.subtitle')}</p>
                </div>
                <button onClick={openCreate} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center">
                    <Plus size={18} className="mr-2" />{t('common.new')}
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">{t('common.loading')}</div>
                ) : suppliers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">{t('admin.suppliers.no_suppliers')}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto hidden lg:block">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('common.name')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.suppliers.table.type')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">{t('admin.suppliers.table.cost')}</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {suppliers.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{s.type?.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{s.cost} {s.currency}</td>
                                            <td className="px-6 py-4 text-right text-sm">
                                                <button onClick={() => openEdit(s)} className="text-indigo-600 mr-3"><Edit2 size={16} /></button>
                                                <button onClick={() => confirmDelete(s.id)} className="text-red-600"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:hidden space-y-3">
                            {suppliers.map((s) => (
                                <div key={s.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="px-6 py-4 text-sm text-gray-500">{s.type?.name}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</span>
                                            <span className="px-6 py-4 text-sm text-gray-700">{s.cost} {s.currency}</span>
                                        </div>
                                    </div>
                                    {/* Footer: Azioni */}
                                    <div className="flex justify-between items-end pt-2 border-t border-gray-100 flex-col">
                                        <div className="flex gap-3">
                                            <button onClick={() => openEdit(s)} className="text-indigo-600 mr-3"><Edit2 size={16} /></button>
                                            <button onClick={() => confirmDelete(s.id)} className="text-red-600"><Trash2 size={16} /></button>
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
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b">
                            <h3 className="font-bold">{editing ? t('common.edit') : t('common.create')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm text-gray-700 mb-1">{t('common.name')}</label>
                                    <input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="type" className="block text-sm text-gray-700 mb-1">{t('admin.suppliers.table.type')}</label>
                                    <select id="type" required value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} className="w-full px-4 py-2 border rounded">
                                        <option value="">--</option>
                                        {types.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="cost" className="block text-sm text-gray-700 mb-1">{t('admin.suppliers.table.cost')}</label>
                                    <input id="cost" required type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full px-4 py-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="currency" className="block text-sm text-gray-700 mb-1">{t('admin.suppliers.table.currency')}</label>
                                    <input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-4 py-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="contact" className="block text-sm text-gray-700 mb-1">{t('common.contact')}</label>
                                    <input id="contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-4 py-2 border rounded font-mono" placeholder='{"phone":"3933...","email":"x@x.com"}' />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="notes" className="block text-sm text-gray-700 mb-1">{t('common.notes')}</label>
                                <textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-2 border rounded" />
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

export default SuppliersPage;
