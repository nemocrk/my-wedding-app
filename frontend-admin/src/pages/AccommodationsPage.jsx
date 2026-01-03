import React, { useState, useEffect } from 'react';
import { Box, Heading, Button, Flash, PageLayout } from '@primer/react';
import { PlusIcon, HomeIcon } from '@primer/octicons-react';
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
        <PageLayout>
            <PageLayout.Header>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Heading>Gestione Alloggi</Heading>
                    <Button variant="primary" onClick={() => setIsModalOpen(true)} leadingIcon={PlusIcon}>
                        Nuovo Alloggio
                    </Button>
                </Box>
            </PageLayout.Header>

            <PageLayout.Content>
                {successMsg && (
                    <Flash variant="success" mb={3} onClose={() => setSuccessMsg('')}>
                        {successMsg}
                    </Flash>
                )}

                <AccommodationList 
                    accommodations={accommodations} 
                    onDelete={handleDelete}
                    onAutoAssign={handleAutoAssign}
                />

                <CreateAccommodationModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleCreate} 
                />

                {error && <ErrorModal error={error} onClose={() => setError(null)} />}
            </PageLayout.Content>
        </PageLayout>
    );
};

export default AccommodationsPage;
