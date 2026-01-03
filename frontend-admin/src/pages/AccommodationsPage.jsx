import React, { useState, useEffect } from 'react';
import { Plus, Home, Sparkles } from 'lucide-react';
import AccommodationList from '../components/accommodations/AccommodationList';
import CreateAccommodationModal from '../components/accommodations/CreateAccommodationModal';
import { accommodationService } from '../services/accommodationService';
import ErrorModal from '../components/common/ErrorModal';

const AccommodationsPage = () => {
    const [accommodations, setAccommodations] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    const fetchAccommodations = async () => {
        try {
            setIsLoading(true);
            const data = await accommodationService.getAll();
            setAccommodations(data);
        } catch (err) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccommodations();
    }, []);

    const handleCreate = async (data) => {
        try {
            await accommodationService.create(data);
            setSuccessMsg('Alloggio creato con successo!');
            fetchAccommodations();
        } catch (err) {
            setError(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo alloggio?")) return;
        try {
            await accommodationService.delete(id);
            setSuccessMsg('Alloggio eliminato.');
            fetchAccommodations();
        } catch (err) {
            setError(err);
        }
    };

    const handleAutoAssign = async () => {
        if (!window.confirm("Avviare l'assegnazione automatica? Questo assegnerà gli invitati agli alloggi disponibili.")) return;
        try {
            const result = await accommodationService.autoAssign();
            setSuccessMsg(`Assegnazione completata! ${result.assigned_count} invitati assegnati.`);
            fetchAccommodations(); // Ricarica per aggiornare le capienze
        } catch (err) {
            setError(err);
        }
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
                        onClick={handleAutoAssign}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                        <Sparkles size={20} />
                        Assegnazione Auto
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
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
                    <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccessMsg('')}>
                        <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                    </span>
                </div>
            )}

            <AccommodationList 
                accommodations={accommodations} 
                onDelete={handleDelete}
            />

            <CreateAccommodationModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleCreate} 
            />

            {error && <ErrorModal error={error} onClose={() => setError(null)} />}
        </div>
    );
};

export default AccommodationsPage;
