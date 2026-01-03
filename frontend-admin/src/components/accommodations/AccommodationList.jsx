import React from 'react';
import { Trash2, Users, Home } from 'lucide-react';

const AccommodationList = ({ accommodations, onDelete, onAutoAssign }) => {
    
    if (!accommodations || accommodations.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <div className="flex justify-center mb-4">
                    <Home className="text-gray-400" size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Nessun alloggio configurato</h3>
                <p className="mt-1 text-gray-500">Aggiungi una struttura per iniziare a gestire gli assegnamenti.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            {accommodations.map(acc => {
                const used = acc.total_capacity - acc.available_capacity;
                const total = acc.total_capacity;
                const percentFull = total > 0 ? Math.round((used / total) * 100) : 0;
                
                return (
                    <div key={acc.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{acc.name}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <span role="img" aria-label="pin">📍</span> {acc.address}
                                </p>
                            </div>
                            <button 
                                onClick={() => onDelete(acc.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                aria-label="Delete"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* Capacity Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Users size={16} />
                                    Capienza Occupata
                                </span>
                                <span className="text-sm text-gray-600">
                                    <span className="font-bold">{used}</span> / {total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full ${percentFull > 90 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${percentFull}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Rooms Grid */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stanze Configurate</h4>
                            <div className="flex flex-wrap gap-2">
                                {acc.rooms.map(room => (
                                    <span key={room.id} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-gray-800 shadow-sm">
                                        <span className="font-bold mr-1">{room.room_number}</span>
                                        <span className="text-gray-500">(A:{room.capacity_adults} B:{room.capacity_children})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AccommodationList;
