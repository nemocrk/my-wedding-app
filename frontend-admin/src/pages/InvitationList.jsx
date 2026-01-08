// frontend-admin/src/pages/InvitationList.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, ExternalLink, Baby, User, Home, Bus, CheckCircle, HelpCircle, XCircle, ArrowRight, Copy, Loader, Activity, Send, FileText, Eye, Phone, RefreshCw, MessageCircle } from 'lucide-react';
import CreateInvitationModal from '../components/invitations/CreateInvitationModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import InteractionsModal from '../components/analytics/InteractionsModal';
import { api } from '../services/api';

const InvitationList = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [interactionInvitation, setInteractionInvitation] = useState(null);

  // Action States
  const [generatingLinkFor, setGeneratingLinkFor] = useState(null);
  const [openingPreviewFor, setOpeningPreviewFor] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [markingSentFor, setMarkingSentFor] = useState(null);
  const [verifyingContacts, setVerifyingContacts] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitations();
      setInvitations(data.results || data);
    } catch (error) {
      console.error("Failed to load invitations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  // --- SELECTION LOGIC ---
  const toggleSelectAll = () => {
    if (selectedIds.length === invitations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invitations.map(inv => inv.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  // --- BULK ACTIONS ---
  const handleBulkVerify = async () => {
    setVerifyingContacts(true);
    // Placeholder for actual API verification logic
    setTimeout(() => {
      alert(`Simulazione: Contatti verificati per ${selectedIds.length} inviti.`);
      setVerifyingContacts(false);
      setSelectedIds([]);
    }, 1500);
  };

  const handleBulkSend = async () => {
    setSendingBulk(true);
    // Placeholder for actual WhatsApp bulk send
    setTimeout(() => {
      alert(`Simulazione: Invio WhatsApp massivo avviato per ${selectedIds.length} inviti.`);
      setSendingBulk(false);
      setSelectedIds([]);
      fetchInvitations(); 
    }, 1500);
  };

  // --- SINGLE ACTIONS ---
  const handleEdit = async (id) => {
    try {
      const fullData = await api.getInvitation(id);
      setEditingInvitation(fullData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Impossibile caricare i dettagli per la modifica", error);
    }
  };

  const handleCreateNew = () => {
    setEditingInvitation(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteInvitation(itemToDelete);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setSelectedIds(prev => prev.filter(id => id !== itemToDelete));
      fetchInvitations(); 
    } catch (error) {
      setIsDeleteModalOpen(false);
      console.error("Impossibile eliminare l'invito", error);
    }
  };
  
  const handleMarkAsSent = async (id) => {
    if (markingSentFor === id) return;
    setMarkingSentFor(id);
    try {
      await api.updateInvitation(id, { status: 'sent' });
      fetchInvitations(); 
    } catch (error) {
      console.error("Error marking as sent", error);
    } finally {
      setMarkingSentFor(null);
    }
  };

  const handleGenerateLink = async (id) => {
    if (generatingLinkFor === id) return;
    setGeneratingLinkFor(id);
    setGeneratedLink(null);
    try {
      const data = await api.generateInvitationLink(id);
      setGeneratedLink({ id, url: data.url });
      await navigator.clipboard.writeText(data.url);
      setTimeout(() => {
        setGeneratedLink(null);
        setGeneratingLinkFor(null);
      }, 3000);
    } catch (error) {
      console.error("Error generating link", error);
      setGeneratingLinkFor(null);
    }
  };

  const handleOpenPreview = async (invitationId) => {
    if (openingPreviewFor === invitationId) return;
    setOpeningPreviewFor(invitationId);
    const previewWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
    try {
      const data = await api.generateInvitationLink(invitationId);
      setGeneratedLink({ id: invitationId, url: data.url });
      if (previewWindow) previewWindow.location.href = data.url;
      else window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      if (previewWindow) previewWindow.close();
      console.error("Error opening preview", error);
    } finally {
      setOpeningPreviewFor(null);
    }
  };

  // --- HELPERS ---
  const getStatusBadge = (status) => {
    switch (status) {
      case 'created':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><FileText size={12} className="mr-1"/> Creato</span>;
      case 'sent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Send size={12} className="mr-1"/> Inviato</span>;
      case 'read':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"><Eye size={12} className="mr-1"/> Letto</span>;
      case 'confirmed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1"/> Accettato</span>;
      case 'declined':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} className="mr-1"/> Declinato</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><HelpCircle size={12} className="mr-1"/> Sconosciuto</span>;
    }
  };

  const isContactValid = (inv) => {
    return inv.phone_number && inv.phone_number.length > 5;
  };

  return (
    <div className="animate-fadeIn pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Censimento Inviti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci la lista degli invitati e i codici di accesso</p>
        </div>
        <button 
          className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-pink-200 transform active:scale-95"
          onClick={handleCreateNew}
        >
          <Plus size={20} className="mr-2" />
          Nuovo Invito
        </button>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-white border-l-4 border-pink-600 shadow-md rounded-r-lg p-4 mb-6 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center">
            <span className="font-semibold text-gray-800 mr-4">{selectedIds.length} Selezionati</span>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Deseleziona
            </button>
          </div>
          <div className="flex gap-3">
             <button
              onClick={handleBulkVerify}
              disabled={verifyingContacts}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {verifyingContacts ? <Loader size={16} className="animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
              Verifica Contatti
            </button>
            <button
              onClick={handleBulkSend}
              disabled={sendingBulk}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {sendingBulk ? <Loader size={16} className="animate-spin mr-2"/> : <MessageCircle size={16} className="mr-2"/>}
              Invia WhatsApp
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 w-10">
                   <input 
                    type="checkbox" 
                    checked={invitations.length > 0 && selectedIds.length === invitations.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                   />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">
                  Nome & Origine
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                  Contatto
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                  Ospiti
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                      <span className="ml-3">Caricamento inviti...</span>
                    </div>
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-500" colSpan="6">
                    <div className="flex flex-col items-center">
                      <Users size={48} className="text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">Nessun invito presente</p>
                      <button onClick={handleCreateNew} className="text-pink-600 font-medium hover:underline mt-2">
                        Crea il tuo primo invito
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(invitation.id) ? 'bg-pink-50' : ''}`}>
                    <td className="px-4 py-4">
                       <input 
                        type="checkbox"
                        checked={selectedIds.includes(invitation.id)}
                        onChange={() => toggleSelectOne(invitation.id)}
                        className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                       />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2" title={invitation.origin === 'bride' ? "Lato Sposa" : "Lato Sposo"}>
                           {invitation.origin === 'bride' ? '👰' : '🤵'}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{invitation.name}</div>
                          <code className="text-xs text-pink-600 font-mono bg-gray-100 px-1 rounded border border-gray-200">
                            {invitation.code}
                          </code>
                        </div>
                      </div>

                      {/* RESTORED: Accommodation/Transfer Status UI */}
                      <div className="flex flex-col gap-1 mt-2">
                        {invitation.accommodation_offered && (
                           <div className="flex items-center text-xs">
                             <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center">
                               <Home size={10} className="mr-1"/> Alloggio
                             </span>
                             {invitation.status === 'confirmed' && invitation.accommodation_requested && (
                                <>
                                  <ArrowRight size={10} className="mx-1 text-gray-400" />
                                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-semibold flex items-center">
                                    <CheckCircle size={10} className="mr-1"/> Richiesto
                                  </span>
                                </>
                             )}
                           </div>
                        )}
                        
                        {invitation.transfer_offered && (
                           <div className="flex items-center text-xs">
                             <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center">
                               <Bus size={10} className="mr-1"/> Transfer
                             </span>
                             {invitation.status === 'confirmed' && invitation.transfer_requested && (
                                <>
                                  <ArrowRight size={10} className="mx-1 text-gray-400" />
                                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-semibold flex items-center">
                                    <CheckCircle size={10} className="mr-1"/> Richiesto
                                  </span>
                                </>
                             )}
                           </div>
                        )}
                      </div>

                    </td>
                    
                    <td className="px-6 py-4">
                      {invitation.phone_number ? (
                        <div className="flex items-center">
                          <div className={`p-1.5 rounded-full mr-2 ${isContactValid(invitation) ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             <Phone size={14} />
                          </div>
                          <span className="text-sm text-gray-600 font-mono">{invitation.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic flex items-center">
                           <XCircle size={12} className="mr-1"/> Nessun Contatto
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {invitation.guests?.map((guest, idx) => (
                          <span 
                            key={guest.id || idx} 
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                              invitation.status === 'declined' 
                                ? 'bg-red-50 text-red-400 border-red-100 line-through opacity-70'
                                : guest.is_child 
                                  ? 'bg-pink-50 text-pink-700 border-pink-100' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {guest.is_child ? <Baby size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                            {guest.first_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invitation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {invitation.status === 'created' && (
                           <button 
                             onClick={() => alert("Funzionalità in arrivo: Invia a " + invitation.phone_number)}
                             disabled={!isContactValid(invitation)}
                             className={`p-1.5 rounded-md transition-colors ${
                               !isContactValid(invitation) 
                                 ? 'text-gray-300 cursor-not-allowed'
                                 : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                             }`}
                             title={isContactValid(invitation) ? "Invia WhatsApp" : "Contatto mancante o invalido"}
                           >
                             <MessageCircle size={18} />
                           </button>
                        )}

                        {invitation.status === 'created' && (
                          <button 
                            onClick={() => handleMarkAsSent(invitation.id)}
                            disabled={markingSentFor === invitation.id}
                            className={`p-1.5 rounded-md transition-colors ${
                              markingSentFor === invitation.id
                                ? 'bg-yellow-50 text-yellow-600 cursor-wait'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Segna manualmente come Inviato"
                          >
                            {markingSentFor === invitation.id ? (
                              <Loader size={18} className="animate-spin" />
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setInteractionInvitation({ id: invitation.id, name: invitation.name })}
                          className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Log Interazioni"
                        >
                          <Activity size={18} />
                        </button>

                        <div className="relative">
                          <button 
                            onClick={() => handleGenerateLink(invitation.id)}
                            className={`p-1.5 rounded-md transition-all ${
                              generatedLink?.id === invitation.id 
                                ? 'bg-green-100 text-green-700' 
                                : generatingLinkFor === invitation.id
                                  ? 'bg-yellow-50 text-yellow-600 cursor-wait'
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Copia Link"
                          >
                             {generatingLinkFor === invitation.id && generatedLink?.id !== invitation.id ? (
                               <Loader size={18} className="animate-spin" />
                             ) : generatedLink?.id === invitation.id ? (
                               <CheckCircle size={18} />
                             ) : (
                               <Copy size={18} />
                             )}
                          </button>
                        </div>

                        <button 
                          onClick={() => handleEdit(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateInvitationModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchInvitations}
          initialData={editingInvitation}
        />
      )}

      {interactionInvitation && (
        <InteractionsModal
            invitationId={interactionInvitation.id}
            invitationName={interactionInvitation.name}
            onClose={() => setInteractionInvitation(null)}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Elimina Invito"
        message="Sei sicuro di voler eliminare questo invito? Questa azione rimuoverà tutti gli ospiti associati."
        confirmText="Sì, elimina"
        cancelText="Annulla"
        isDangerous={true}
      />
    </div>
  );
};

export default InvitationList;
