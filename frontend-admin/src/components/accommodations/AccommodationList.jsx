import React from 'react';
import { Trash2, Users, Home, User, Baby, Bed } from 'lucide-react';

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
                
                // Calcola distribuzione stimata per camera
                const totalAssignedAdults = acc.assigned_invitations?.reduce((sum, inv) => sum + inv.adults_count, 0) || 0;
                const totalAssignedChildren = acc.assigned_invitations?.reduce((sum, inv) => sum + inv.children_count, 0) || 0;
                
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

                        {/* Capacity Bar - Struttura Totale */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Users size={16} />
                                    Capienza Totale Struttura
                                </span>
                                <span className="text-sm text-gray-600">
                                    <span className="font-bold">{used}</span> / {total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div 
                                    className={`h-2.5 rounded-full transition-all ${percentFull > 90 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${percentFull}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Rooms Grid - Con Occupazione Stimata */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bed size={14} />
                                    Stanze Configurate
                                </h4>
                                <div className="space-y-2">
                                    {acc.rooms.map(room => {
                                        const roomCapacity = room.capacity_adults + room.capacity_children;
                                        // Stima proporzionale dell'occupazione
                                        const roomOccupancy = total > 0 ? Math.round((used / total) * roomCapacity) : 0;
                                        const roomPercent = roomCapacity > 0 ? Math.round((roomOccupancy / roomCapacity) * 100) : 0;
                                        
                                        return (
                                            <div key={room.id} className="bg-white p-3 rounded border border-gray-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-gray-800">{room.room_number}</span>
                                                    <span className="text-xs text-gray-500">
                                                        A:{room.capacity_adults} B:{room.capacity_children}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                        <div 
                                                            className={`h-1.5 rounded-full transition-all ${roomPercent > 90 ? 'bg-red-400' : 'bg-blue-400'}`}
                                                            style={{ width: `${roomPercent}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-600 shrink-0">
                                                        ~{roomOccupancy}/{roomCapacity}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 italic mt-3">
                                    * Occupazione stimata proporzionalmente alla capienza totale
                                </p>
                            </div>

                            {/* Assigned Guests List */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Ospiti Assegnati</h4>
                                {acc.assigned_invitations && acc.assigned_invitations.length > 0 ? (
                                    <>
                                        <div className="mb-3 flex gap-3 text-xs">
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <User size={12} /> <strong>{totalAssignedAdults}</strong> Adulti
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Baby size={12} /> <strong>{totalAssignedChildren}</strong> Bambini
                                            </span>
                                        </div>
                                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                                            {acc.assigned_invitations.map(inv => (
                                                <li key={inv.id} className="flex justify-between items-center bg-white p-2 rounded border border-blue-100 shadow-sm">
                                                    <span className="text-sm font-medium text-gray-800 truncate" title={inv.name}>
                                                        {inv.name}
                                                    </span>
                                                    <div className="flex gap-2 text-xs text-gray-500 shrink-0">
                                                        <span className="flex items-center" title="Adulti">
                                                            <User size={12} className="mr-0.5" /> {inv.adults_count}
                                                        </span>
                                                        {inv.children_count > 0 && (
                                                            <span className="flex items-center" title="Bambini">
                                                                <Baby size={12} className="mr-0.5" /> {inv.children_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="text-sm text-blue-400 italic">Nessun ospite assegnato a questa struttura.</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AccommodationList;
