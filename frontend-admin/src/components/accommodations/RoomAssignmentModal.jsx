import { Baby, Check, ChevronDown, ChevronUp, Loader, Search, User, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const RoomAssignmentModal = ({ isOpen, onClose, room, onSuccess }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [invitations, setInvitations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedGuests, setSelectedGuests] = useState(new Set());
    const [expandedInvitations, setExpandedInvitations] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Reset state when modal opens/closes or room changes
    useEffect(() => {
        if (isOpen && room) {
            fetchCandidates();
            setSelectedGuests(new Set());
            setSearchTerm('');
            setExpandedInvitations(new Set());
        }
    }, [isOpen, room]);

    const fetchCandidates = async () => {
        setIsLoading(true);
        try {
            // Fetch all confirmed invitations
            // Note: Ideally backend should filter, but for now we filter client-side as per requirements
            const response = await api.fetchInvitations({ status: 'confirmed' });

            // Filter: accommodation requested AND has unassigned guests (or assigned to other rooms)
            // We want to show guests that are NOT already in THIS room.
            const candidates = response.filter(inv =>
                inv.accommodation_requested &&
                inv.guests.some(g => !g.not_coming && (g.assigned_room !== room.id))
            );

            setInvitations(candidates);
        } catch (error) {
            console.error("Failed to fetch invitations", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleInvitation = (id) => {
        const newExpanded = new Set(expandedInvitations);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedInvitations(newExpanded);
    };

    const getRoomOccupancy = () => {
        if (!room) return { adults: 0, children: 0 };
        const currentAdults = (room.assigned_guests || []).filter(g => !g.is_child).length;
        const currentChildren = (room.assigned_guests || []).filter(g => g.is_child).length;

        let newAdults = 0;
        let newChildren = 0;

        invitations.forEach(inv => {
            inv.guests.forEach(g => {
                if (selectedGuests.has(g.id)) {
                    if (g.is_child) newChildren++;
                    else newAdults++;
                }
            });
        });

        return {
            totalAdults: currentAdults + newAdults,
            totalChildren: currentChildren + newChildren,
            newAdults,
            newChildren
        };
    };

    const occupancy = getRoomOccupancy();

    const canSelectGuest = (guest) => {
        if (selectedGuests.has(guest.id)) return true; // Can always deselect

        const { totalAdults, totalChildren } = occupancy;

        // Adult logic: Must have adult slots
        if (!guest.is_child) {
            return totalAdults < room.capacity_adults;
        }

        // Child logic: Can take child slot OR adult slot
        const freeChildSlots = room.capacity_children - totalChildren;
        const freeAdultSlots = room.capacity_adults - totalAdults;

        if (freeChildSlots > 0) return true;
        if (freeAdultSlots > 0) return true;

        return false;
    };

    const handleToggleGuest = (guestId) => {
        const newSelected = new Set(selectedGuests);
        if (newSelected.has(guestId)) {
            newSelected.delete(guestId);
        } else {
            // Find guest object for validation
            let guest = null;
            for (const inv of invitations) {
                const found = inv.guests.find(g => g.id === guestId);
                if (found) {
                    guest = found;
                    break;
                }
            }
            if (guest && canSelectGuest(guest)) {
                newSelected.add(guestId);
            }
        }
        setSelectedGuests(newSelected);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Group selected guests by invitation
            const guestsByInvitation = {};

            for (const guestId of selectedGuests) {
                let foundInv = null;
                let foundGuest = null;
                for (const inv of invitations) {
                    const g = inv.guests.find(x => x.id === guestId);
                    if (g) {
                        foundInv = inv;
                        foundGuest = g;
                        break;
                    }
                }

                if (foundInv && foundGuest) {
                    if (!guestsByInvitation[foundInv.id]) {
                        guestsByInvitation[foundInv.id] = foundInv;
                    }
                    guestsByInvitation[foundInv.id] = {
                        ...guestsByInvitation[foundInv.id],
                        guests: guestsByInvitation[foundInv.id].guests.map(
                            (guest) => {
                                if (guest.id === foundGuest.id)
                                    return {
                                        ...guest,
                                        assigned_room: room.id,
                                        accommodation_pinned: true
                                    }
                                return guest;
                            }
                        )
                    };
                }
            }

            // Execute updates sequentially
            for (const [invId, invPayload] of Object.entries(guestsByInvitation)) {
                await api.updateInvitation(invId, invPayload);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to assign guests", error);
            // Ideally show error toast
        } finally {
            setIsSaving(false);
        }
    };

    const filteredInvitations = invitations.filter(inv =>
        inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen || !room) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <UserPlus className="text-purple-600" />
                            {t('admin.room_assignment.title', 'Assegna Ospiti alla Stanza')} {room.room_number}
                        </h2>
                        <div className="mt-2 flex gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                                <User size={16} />
                                {t('admin.accommodations.list.adults_short')}: {occupancy.totalAdults}/{room.capacity_adults}
                                {occupancy.newAdults > 0 && <span className="text-green-600 font-bold ml-1">(+{occupancy.newAdults})</span>}
                            </span>
                            <span className="flex items-center gap-1">
                                <Baby size={16} />
                                {t('admin.accommodations.list.children_short')}: {occupancy.totalChildren}/{room.capacity_children}
                                {occupancy.newChildren > 0 && <span className="text-green-600 font-bold ml-1">(+{occupancy.newChildren})</span>}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder={t('admin.room_assignment.search_placeholder', 'Cerca invito per nome o codice...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader className="animate-spin text-purple-600" size={32} />
                        </div>
                    ) : filteredInvitations.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            {searchTerm ? t('common.no_results', 'Nessun risultato') : t('admin.room_assignment.no_candidates', 'Nessun invito disponibile')}
                        </p>
                    ) : (
                        filteredInvitations.map(inv => {
                            const isExpanded = expandedInvitations.has(inv.id) || searchTerm.length > 0;
                            const unassignedGuests = inv.guests.filter(g => !g.not_coming && g.assigned_room !== room.id);

                            if (unassignedGuests.length === 0) return null;

                            return (
                                <div key={inv.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleInvitation(inv.id)}
                                        className="w-full px-4 py-3 bg-white hover:bg-gray-50 flex justify-between items-center transition-colors"
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-800">{inv.name}</span>
                                            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{inv.code}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="bg-gray-50 px-4 py-2 space-y-2 border-t border-gray-200">
                                            {unassignedGuests.map(guest => {
                                                const isSelected = selectedGuests.has(guest.id);
                                                const disabled = !isSelected && !canSelectGuest(guest);

                                                return (
                                                    <label
                                                        key={guest.id}
                                                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                                                            } ${isSelected ? 'bg-purple-50 border border-purple-200' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => !disabled && handleToggleGuest(guest.id)}
                                                            disabled={disabled}
                                                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                                        />
                                                        <div className="ml-3 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-700">
                                                                    {guest.first_name} {guest.last_name}
                                                                </span>
                                                                {guest.is_child ? (
                                                                    <span className="text-xs flex items-center text-pink-600 bg-pink-50 px-1.5 rounded">
                                                                        <Baby size={12} className="mr-0.5" /> Bambino
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs flex items-center text-blue-600 bg-blue-50 px-1.5 rounded">
                                                                        <User size={12} className="mr-0.5" /> Adulto
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {guest.assigned_room && (
                                                                <p className="text-xs text-orange-600 mt-0.5">
                                                                    Attualmente in Stanza {guest.assigned_room_number}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        {t('common.cancel', 'Annulla')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedGuests.size === 0 || isSaving}
                        className={`flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg shadow-sm transition-all ${selectedGuests.size === 0 || isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
                            }`}
                    >
                        {isSaving ? <Loader className="animate-spin" size={20} /> : <Check size={20} />}
                        {t('admin.room_assignment.save_btn', 'Assegna Selezionati')} ({selectedGuests.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomAssignmentModal;
