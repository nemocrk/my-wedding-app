import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowLeft, ArrowRight, Save } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Nuovo Alloggio</h2>
                        <p className="text-sm text-gray-500">Step {step} di 2</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Struttura</label>
                                <input 
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Es. Hotel Vittoria"
                                    value={formData.name}
                                    onChange={e => handleBaseChange('name', e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                                <input 
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Via Roma 1, Milano"
                                    value={formData.address}
                                    onChange={e => handleBaseChange('address', e.target.value)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
                                Definisci le stanze disponibili in questa struttura. Puoi aggiungerne quante ne vuoi.
                            </div>
                            
                            {formData.rooms.map((room, idx) => (
                                <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex-grow">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome/Numero</label>
                                        <input 
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 outline-none"
                                            value={room.room_number}
                                            onChange={e => handleRoomChange(idx, 'room_number', e.target.value)}
                                            placeholder="101"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Adulti</label>
                                        <input 
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 outline-none"
                                            value={room.capacity_adults}
                                            onChange={e => handleRoomChange(idx, 'capacity_adults', parseInt(e.target.value) || 0)}
                                            min="0"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Bambini</label>
                                        <input 
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500 outline-none"
                                            value={room.capacity_children}
                                            onChange={e => handleRoomChange(idx, 'capacity_children', parseInt(e.target.value) || 0)}
                                            min="0"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => removeRoom(idx)}
                                        className="mb-1 p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Rimuovi stanza"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            
                            <button 
                                onClick={addRoom}
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-500 hover:text-pink-600 transition-all flex justify-center items-center gap-2 font-medium"
                            >
                                <Plus size={20} />
                                Aggiungi Stanza
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-gray-50">
                    {step === 1 ? (
                        <div className="ml-auto">
                            <button 
                                onClick={() => setStep(2)}
                                disabled={!formData.name}
                                className="flex items-center gap-2 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Avanti <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 font-medium"
                            >
                                <ArrowLeft size={18} /> Indietro
                            </button>
                            <button 
                                onClick={handleSubmit}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Save size={18} /> Salva Alloggio
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateAccommodationModal;
