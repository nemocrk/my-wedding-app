import React, { useState, useEffect } from 'react';
import { Plus, Home, Sparkles, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import AccommodationList from '../components/accommodations/AccommodationList';
import CreateAccommodationModal from '../components/accommodations/CreateAccommodationModal';
import EditAccommodationModal from '../components/accommodations/EditAccommodationModal';
import AutoAssignStrategyModal from '../components/accommodations/AutoAssignStrategyModal';
import { api } from '../services/api';
import ErrorModal from '../components/common/ErrorModal';

const AccommodationsPage = () => {
    const { t } = useTranslation();
    const { confirm } = useConfirm();
    const [accommodations, setAccommodations] = useState([]);
    const [unassignedInvitations, setUnassignedInvitations] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAccommodation, setEditingAccommodation] = useState(null);
    const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [accData, unassignedData] = await Promise.all([
                api.fetchAccommodations(),
                api.fetchUnassignedInvitations()
            ]);
            setAccommodations(accData);
            setUnassignedInvitations(unassignedData);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (data) => {
        try {
            await api.createAccommodation(data);
            setSuccessMsg(t('admin.accommodations.success.created'));
            fetchData();
            setIsCreateModalOpen(false);
        } catch (err) {
            setError(err);
        }
    };

    const handleEdit = (accommodation) => {
        setEditingAccommodation(accommodation);
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (id, data) => {
        try {
            await api.updateAccommodation(id, data);
            setSuccessMsg(t('admin.accommodations.success.updated'));
            fetchData();
            setIsEditModalOpen(false);
            setEditingAccommodation(null);
        } catch (err) {
            setError(err);
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: t('admin.accommodations.alerts.delete_title'),
            message: t('admin.accommodations.alerts.delete_confirm'),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            isDangerous: true
        });
        
        if (!isConfirmed) return;
        
        try {
            await api.deleteAccommodation(id);
            setSuccessMsg(t('admin.accommodations.success.deleted'));
            fetchData();
        } catch (err) {
            setError(err);
        }
    };

    const handleTogglePin = async (invitationId, isPinned) => {
        try {
            await api.updateInvitation(invitationId, { accommodation_assignment_pinned: isPinned });
            setSuccessMsg(isPinned 
                ? (t('admin.accommodations.success.pinned'))
                : (t('admin.accommodations.success.unpinned'))
            );
            fetchData();
        } catch (err) {
            setError(err);
        }
    };

    const handleStrategySuccess = (result) => {
        setSuccessMsg(t('admin.accommodations.success.assigned', { count: result.assigned_guests }));
        fetchData();
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('admin.accommodations.page_title')}</h1>
                    <p className="text-gray-500">{t('admin.accommodations.page_subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsStrategyModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Sparkles size={20} />
                        {t('admin.accommodations.buttons.auto_assign')}
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        {t('admin.accommodations.buttons.new_accommodation')}
                    </button>
                </div>
            </header>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <span className="block sm:inline">{successMsg}</span>
                    <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccessMsg('')}>
                        <span className="sr-only">{t('admin.accommodations.close_success')}</span>
                        <X className="h-6 w-6 text-green-500" role="button" />
                    </button>
                </div>
            )}

            {/* Unassigned Invitations Alert */}
            {unassignedInvitations.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                {t('admin.accommodations.alerts.unassigned_warning', { count: unassignedInvitations.length })}
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {unassignedInvitations.map((inv) => (
                                        <li key={inv.id}>
                                            <span className="font-semibold">{inv.name}</span> ({inv.adults_count} {t('admin.accommodations.alerts.adults')}, {inv.children_count} {t('admin.accommodations.alerts.children')})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AccommodationList 
                accommodations={accommodations} 
                onDelete={handleDelete}
                onEdit={handleEdit}
                onTogglePin={handleTogglePin}
            />

            <CreateAccommodationModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSave={handleCreate} 
            />

            <EditAccommodationModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingAccommodation(null);
                }}
                onSave={handleUpdate}
                accommodation={editingAccommodation}
            />

            <AutoAssignStrategyModal
                isOpen={isStrategyModalOpen}
                onClose={() => setIsStrategyModalOpen(false)}
                onSuccess={handleStrategySuccess}
                onError={setError}
            />

            {error && <ErrorModal errorDetails={error} onClose={() => setError(null)} isOpen={!!error} />}
        </div>
    );
};

export default AccommodationsPage;