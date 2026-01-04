import React, { useState, useEffect } from 'react';
import { Plus, Home, Sparkles, AlertCircle } from 'lucide-react';
import AccommodationList from '../components/accommodations/AccommodationList';
import CreateAccommodationModal from '../components/accommodations/CreateAccommodationModal';
import AutoAssignStrategyModal from '../components/accommodations/AutoAssignStrategyModal';
import { api } from '../services/api';
import ErrorModal from '../components/common/ErrorModal';

const AccommodationsPage = () => {
    const [accommodations, setAccommodations] = useState([]);
    const [unassignedInvitations, setUnassignedInvitations] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
            setSuccessMsg('Alloggio creato con successo!');
            fetchData();
            setIsCreateModalOpen(false);
        } catch (err) {
            setError(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo alloggio?")) return;
        try {
            await api.deleteAccommodation(id);
            setSuccessMsg('Alloggio eliminato.');
            fetchData();
        } catch (err) {
            setError(err);
        }
    };

    const handleStrategySuccess = (result) => {
        setSuccessMsg(`Assegnazione completata! ${result.assigned_guests} invitati assegnati con la strategia scelta.`);
        fetchData();
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestione Alloggi</h1>
                    <p className="text-gray-500">Configura le strutture ricettive e assegna gli ospiti.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsStrategyModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Sparkles size={20} />
                        Auto Assign (Arena)
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Nuovo Alloggio
                    </button>
                </div>
            </header>

            {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <span className="block sm:inline">{successMsg}</span>
                    <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccessMsg('')}>
                        <span className="sr-only">Chiudi</span>
                        <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
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
                                Attenzione: {unassignedInvitations.length} gruppi/inviti non assegnati
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    {unassignedInvitations.map((inv) => (
                                        <li key={inv.id}>
                                            <span className="font-semibold">{inv.name}</span> ({inv.adults_count} Adulti, {inv.children_count} Bambini)
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
            />

            <CreateAccommodationModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSave={handleCreate} 
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
