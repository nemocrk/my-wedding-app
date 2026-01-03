import React, { useState } from 'react';
import { Dialog, Box, TextInput, Button, Heading, Text, FormControl } from '@primer/react';
import { XIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';

const CreateAccommodationModal = ({ isOpen, onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        rooms: [
            { room_number: '101', capacity_adults: 2, capacity_children: 0 }
        ]
    });

    const handleBaseChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRoomChange = (index, field, value) => {
        const newRooms = [...formData.rooms];
        newRooms[index] = { ...newRooms[index], [field]: value };
        setFormData(prev => ({ ...prev, rooms: newRooms }));
    };

    const addRoom = () => {
        setFormData(prev => ({
            ...prev,
            rooms: [...prev.rooms, { room_number: '', capacity_adults: 2, capacity_children: 0 }]
        }));
    };

    const removeRoom = (index) => {
        setFormData(prev => ({
            ...prev,
            rooms: prev.rooms.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = () => {
        onSave(formData);
        onClose();
        setStep(1); // Reset
    };

    if (!isOpen) return null;

    return (
        <Dialog isOpen={isOpen} onDismiss={onClose} aria-labelledby="header-id">
            <Dialog.Header id="header-id">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Heading fontSize={2}>Nuovo Alloggio (Step {step}/2)</Heading>
                    <Button variant="invisible" onClick={onClose} icon={XIcon} aria-label="Close" />
                </Box>
            </Dialog.Header>

            <Box p={3}>
                {step === 1 ? (
                    <Box display="flex" flexDirection="column" gap={3}>
                        <FormControl>
                            <FormControl.Label>Nome Struttura</FormControl.Label>
                            <TextInput 
                                value={formData.name} 
                                onChange={e => handleBaseChange('name', e.target.value)} 
                                block 
                                placeholder="Es. Hotel Vittoria"
                            />
                        </FormControl>
                        <FormControl>
                            <FormControl.Label>Indirizzo</FormControl.Label>
                            <TextInput 
                                value={formData.address} 
                                onChange={e => handleBaseChange('address', e.target.value)} 
                                block 
                                placeholder="Via Roma 1, Milano"
                            />
                        </FormControl>
                    </Box>
                ) : (
                    <Box display="flex" flexDirection="column" gap={3}>
                        <Text as="p" color="fg.muted" fontSize={1}>
                            Definisci le stanze disponibili in questa struttura.
                        </Text>
                        
                        {formData.rooms.map((room, idx) => (
                            <Box 
                                key={idx} 
                                border="1px solid" 
                                borderColor="border.default" 
                                p={2} 
                                borderRadius={2}
                                display="flex"
                                gap={2}
                                alignItems="flex-end"
                            >
                                <Box flexGrow={1}>
                                    <Text fontSize={0} display="block" mb={1}>Nome/Num</Text>
                                    <TextInput 
                                        value={room.room_number} 
                                        onChange={e => handleRoomChange(idx, 'room_number', e.target.value)}
                                        aria-label="Room Number"
                                        width="100%"
                                    />
                                </Box>
                                <Box width="80px">
                                    <Text fontSize={0} display="block" mb={1}>Adulti</Text>
                                    <TextInput 
                                        type="number" 
                                        value={room.capacity_adults} 
                                        onChange={e => handleRoomChange(idx, 'capacity_adults', parseInt(e.target.value) || 0)}
                                        width="100%"
                                    />
                                </Box>
                                <Box width="80px">
                                    <Text fontSize={0} display="block" mb={1}>Bambini</Text>
                                    <TextInput 
                                        type="number" 
                                        value={room.capacity_children} 
                                        onChange={e => handleRoomChange(idx, 'capacity_children', parseInt(e.target.value) || 0)}
                                        width="100%"
                                    />
                                </Box>
                                <Button variant="danger" icon={TrashIcon} onClick={() => removeRoom(idx)} aria-label="Remove room" />
                            </Box>
                        ))}
                        
                        <Button variant="outline" size="small" onClick={addRoom} icon={PlusIcon}>
                            Aggiungi Stanza
                        </Button>
                    </Box>
                )}
            </Box>

            <Box p={3} borderTop="1px solid" borderColor="border.default" display="flex" justifyContent="flex-end" gap={2}>
                {step === 1 ? (
                    <Button variant="primary" onClick={() => setStep(2)}>Avanti</Button>
                ) : (
                    <>
                        <Button onClick={() => setStep(1)}>Indietro</Button>
                        <Button variant="primary" onClick={handleSubmit}>Salva Alloggio</Button>
                    </>
                )}
            </Box>
        </Dialog>
    );
};

export default CreateAccommodationModal;
