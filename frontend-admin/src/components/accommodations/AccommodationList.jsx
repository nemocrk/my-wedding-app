import React from 'react';
import { Box, Heading, Button, Label, Text, ProgressBar } from '@primer/react';
import { TrashIcon, PeopleIcon, HomeIcon } from '@primer/octicons-react';

const AccommodationList = ({ accommodations, onDelete, onAutoAssign }) => {
    
    if (!accommodations || accommodations.length === 0) {
        return (
            <Box p={5} textAlign="center" border="1px dashed" borderColor="border.default" borderRadius={2} mt={3}>
                <HomeIcon size={24} className="color-fg-muted" />
                <Heading fontSize={2} mt={2}>Nessun alloggio configurato</Heading>
                <Text color="fg.muted">Aggiungi una struttura per iniziare a gestire gli assegnamenti.</Text>
            </Box>
        );
    }

    return (
        <Box display="flex" flexDirection="column" gap={3} mt={3}>
            {/* Header azioni globali */}
            <Box display="flex" justifyContent="flex-end" mb={2}>
                 <Button variant="default" onClick={onAutoAssign}>
                    🪄 Assegnazione Automatica
                </Button>
            </Box>

            {accommodations.map(acc => {
                const percentFull = acc.total_capacity > 0 
                    ? Math.round(((acc.total_capacity - acc.available_capacity) / acc.total_capacity) * 100) 
                    : 0;
                
                return (
                    <Box key={acc.id} border="1px solid" borderColor="border.default" borderRadius={2} p={3}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                            <Box>
                                <Heading fontSize={2}>{acc.name}</Heading>
                                <Text color="fg.muted" fontSize={1}>{acc.address}</Text>
                            </Box>
                            <Button variant="danger" size="small" icon={TrashIcon} onClick={() => onDelete(acc.id)}>
                                Elimina
                            </Button>
                        </Box>

                        <Box display="flex" gap={2} alignItems="center" mb={3}>
                            <Label variant="secondary" size="large">
                                <PeopleIcon /> {acc.total_capacity - acc.available_capacity} / {acc.total_capacity} Posti Occupati
                            </Label>
                            <Box flexGrow={1} maxWidth="200px">
                                <ProgressBar progress={percentFull} bg={percentFull > 90 ? "danger.emphasis" : "success.emphasis"} />
                            </Box>
                        </Box>

                        <Box bg="canvas.subtle" p={2} borderRadius={2}>
                            <Text fontSize={0} fontWeight="bold" display="block" mb={2}>STANZE:</Text>
                            <Box display="flex" flexWrap="wrap" gap={2}>
                                {acc.rooms.map(room => (
                                    <Label key={room.id} variant="accent">
                                        {room.room_number} (A:{room.capacity_adults} B:{room.capacity_children})
                                    </Label>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export default AccommodationList;
