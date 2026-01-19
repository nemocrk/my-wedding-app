import React from 'react';
import { Trash2, Users, Home, User, Baby, Bed, Edit2, Pin, PinOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AccommodationList = ({ accommodations, onDelete, onEdit, onTogglePin }) => {
    const { t } = useTranslation();
    
    if (!accommodations || accommodations.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <div className="flex justify-center mb-4">
                    <Home className="text-gray-400" size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{t('admin.accommodations.list.no_accommodations')}</h3>
                <p className="mt-1 text-gray-500">{t('admin.accommodations.list.no_accommodations_subtitle')}</p>
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
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onEdit(acc)}
                                    className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                                    aria-label="Edit"
                                    title={t('admin.accommodations.list.edit')}
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button 
                                    onClick={() => onDelete(acc.id)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    aria-label="Delete"
                                    title={t('admin.accommodations.list.delete')}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Capacity Bar - Struttura Totale */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Users size={16} />
                                    {t('admin.accommodations.list.total_capacity')}
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

                        {/* Rooms Grid - Con Ospiti Assegnati per Stanza */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Bed size={14} />
                                {t('admin.accommodations.list.rooms_title')}
                            </h4>
                            
                            {acc.rooms && acc.rooms.map(room => {
                                const roomCapacity = room.capacity_adults + room.capacity_children;
                                const roomOccupied = room.occupied_count || 0;
                                const roomPercent = roomCapacity > 0 ? Math.round((roomOccupied / roomCapacity) * 100) : 0;
                                const availableSlots = room.available_slots || { adult_slots_free: room.capacity_adults, child_slots_free: room.capacity_children };
                                
                                return (
                                    <div key={room.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        {/* Room Header */}
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <span className="font-bold text-gray-800 text-base">{room.room_number}</span>
                                                <span className="ml-3 text-xs text-gray-500">
                                                    {t('admin.accommodations.list.capacity_label')}: {t('admin.accommodations.list.adults_short')}:{room.capacity_adults} {t('admin.accommodations.list.children_short')}:{room.capacity_children}
                                                </span>
                                            </div>
                                            <div className="text-xs">
                                                <span className={`font-semibold ${
                                                    availableSlots.adult_slots_free === 0 && availableSlots.child_slots_free === 0 
                                                    ? 'text-red-600' 
                                                    : 'text-green-600'
                                                }`}>
                                                    {t('admin.accommodations.list.free_slots')}: {t('admin.accommodations.list.adults_short')}:{availableSlots.adult_slots_free} {t('admin.accommodations.list.children_short')}:{availableSlots.child_slots_free}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Occupancy Bar */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full transition-all ${
                                                        roomPercent === 100 ? 'bg-red-500' : roomPercent > 80 ? 'bg-orange-400' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${roomPercent}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 shrink-0 w-16 text-right">
                                                {roomOccupied}/{roomCapacity}
                                            </span>
                                        </div>

                                        {/* Assigned Guests in Room */}
                                        {room.assigned_guests && room.assigned_guests.length > 0 ? (
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold text-gray-500 mb-2">{t('admin.accommodations.list.assigned_guests')}:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {room.assigned_guests.map((guest, idx) => (
                                                        <div key={idx} className="flex items-center gap-1">
                                                            <span 
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border shadow-sm ${
                                                                    guest.is_child 
                                                                    ? 'bg-pink-50 text-pink-700 border-pink-200' 
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}
                                                            >
                                                                {guest.is_child ? <Baby size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                                                                {guest.first_name} {guest.last_name || ''}
                                                            </span>
                                                            {guest.invitation_id && onTogglePin && (
                                                                <button
                                                                    onClick={() => onTogglePin(guest.invitation_id, !guest.is_pinned)}
                                                                    className={`p-1 rounded transition-all ${
                                                                        guest.is_pinned 
                                                                        ? 'text-pink-600 hover:bg-pink-50' 
                                                                        : 'text-gray-400 hover:bg-gray-100'
                                                                    }`}
                                                                    title={guest.is_pinned ? t('admin.accommodations.list.unpin') : t('admin.accommodations.list.pin')}
                                                                >
                                                                    {guest.is_pinned ? <Pin size={14} /> : <PinOff size={14} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic mt-2">{t('admin.accommodations.list.empty_room')}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AccommodationList;
