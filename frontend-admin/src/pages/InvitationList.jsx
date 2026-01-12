// frontend-admin/src/pages/InvitationList.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, ExternalLink, Baby, User, Home, Bus, CheckCircle, HelpCircle, XCircle, ArrowRight, Copy, Loader, Activity, Send, FileText, Eye, Phone, RefreshCw, MessageCircle, UserX, AlertCircle, Smartphone } from 'lucide-react';
import CreateInvitationModal from '../components/invitations/CreateInvitationModal';
import PhonebookImportModal from '../components/invitations/PhonebookImportModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import InteractionsModal from '../components/analytics/InteractionsModal';
import SendWhatsAppModal from '../components/whatsapp/SendWhatsAppModal';
import { api } from '../services/api';

const InvitationList = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhoneImportOpen, setIsPhoneImportOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [interactionInvitation, setInteractionInvitation] = useState(null);

  // WhatsApp Modal State
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [waRecipients, setWaRecipients] = useState([]);

  // Action States
  const [generatingLinkFor, setGeneratingLinkFor] = useState(null);
  const [openingPreviewFor, setOpeningPreviewFor] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [markingSentFor, setMarkingSentFor] = useState(null);
  const [verifyingContacts, setVerifyingContacts] = useState(false);
  
  // Single verification loading state
  const [verifyingSingleFor, setVerifyingSingleFor] = useState(null);

  // Double click prevent + loader for WhatsApp open
  const [openingWABulk, setOpeningWABulk] = useState(false);
  const [openingWASingleFor, setOpeningWASingleFor] = useState(null);

  // Feature detection
  const isContactPickerSupported = 'contacts' in navigator && 'ContactsManager' in window;

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitations();
      setInvitations(data.results || data);
    } catch (error) {
      console.error('Failed to load invitations', error);
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
    // Only 'ok' is strictly valid for sending, but we check presence too
    return inv.phone_number && inv.phone_number.length > 5;
  };
  
  const getVerificationIcon = (status) => {
    switch (status) {
      case 'ok':
        return { icon: <CheckCircle size={14} />, color: 'bg-green-100 text-green-600', title: 'Verificato (OK)' };
      case 'not_present':
        return { icon: <UserX size={14} />, color: 'bg-yellow-100 text-yellow-600', title: 'Non in rubrica' };
      case 'not_exist':
        return { icon: <XCircle size={14} />, color: 'bg-red-100 text-red-600', title: 'Non esiste su WhatsApp' };
      case 'not_valid':
      default:
        return { icon: <AlertCircle size={14} />, color: 'bg-gray-100 text-gray-500', title: 'Da verificare / Formato errato' };
    }
  };

  // --- ACTIONS ---
  
  const handleVerifyContact = async (invitation) => {
    if (invitation.contact_verified === 'ok' || verifyingSingleFor === invitation.id) return;
    
    setVerifyingSingleFor(invitation.id);
    try {
      await api.verifyContact(invitation.id);
      // Refetch to get updated status
      await fetchInvitations();
    } catch (error) {
      console.error('Failed to verify contact', error);
      alert('Errore durante la verifica del contatto.');
    } finally {
      setVerifyingSingleFor(null);
    }
  };

  // --- BULK ACTIONS ---
  const handleBulkVerify = async () => {
    setVerifyingContacts(true);
    try {
        const promises = selectedIds.map(id => api.verifyContact(id));
        await Promise.all(promises);
        await fetchInvitations();
        setSelectedIds([]);
        alert(`Verifica completata per ${selectedIds.length} inviti.`);
    } catch (error) {
        console.error('Bulk verify failed', error);
        alert('Alcune verifiche sono fallite. Controlla la console.');
    } finally {
        setVerifyingContacts(false);
    }
  };

  const handleBulkSend = () => {
    if (openingWABulk || isWAModalOpen) return;
    setOpeningWABulk(true);

    try {
      // 1. Get selected invitations
      const selected = invitations.filter(inv => selectedIds.includes(inv.id));

      // 2. Filter valid contacts
      const valid = selected.filter(isContactValid);
      const invalidCount = selected.length - valid.length;

      if (valid.length === 0) {
        alert('Nessuno degli inviti selezionati ha un numero valido.');
        return;
      }

      if (invalidCount > 0) {
        if (!window.confirm(`${invalidCount} inviti su ${selected.length} non hanno un numero valido e saranno saltati. Procedere?`)) {
          return;
        }
      }

      setWaRecipients(valid);
      setIsWAModalOpen(true);
    } finally {
      setOpeningWABulk(false);
    }
  };

  const handleSingleSend = (invitation) => {
    if (!invitation?.id) return;
    if (openingWASingleFor === invitation.id || isWAModalOpen) return;

    setOpeningWASingleFor(invitation.id);

    try {
      if (!isContactValid(invitation)) {
        alert('Numero non valido per questo contatto.');
        return;
      }

      setWaRecipients([invitation]);
      setIsWAModalOpen(true);
    } finally {
      setOpeningWASingleFor(null);
    }
  };

  const handleWASuccess = () => {
    setSelectedIds([]);
    fetchInvitations();
  };

  // --- SINGLE ACTIONS ---
  const handleEdit = async (id) => {
    try {
      const fullData = await api.getInvitation(id);
      setEditingInvitation(fullData);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Impossibile caricare i dettagli per la modifica', error);
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
      await api.markInvitationAsSent(id);
      fetchInvitations();
    } catch (error) {
      console.error('Error marking as sent', error);
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
      console.error('Error generating link', error);
      setGeneratingLinkFor(null);
    }
  };

  const handleOpenPreview = async (invitationId) => {
    if (openingPreviewFor === invitationId) return;
    setOpeningPreviewFor(invitationId);
    try {
      const data = await api.generateInvitationLink(invitationId);
      setGeneratedLink({ id: invitationId, url: data.url });
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening preview', error);
    } finally {
      setOpeningPreviewFor(null);
    }
  };

  return (
    <div className="animate-fadeIn pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Censimento Inviti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci la lista degli invitati e i codici di accesso</p>
        </div>
        <div className="flex gap-2">
          {/* PHONEBOOK IMPORT BUTTON */}
          {isContactPickerSupported && (
            <button
              onClick={() => setIsPhoneImportOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-indigo-200 transform active:scale-95"
            >
              <Smartphone size={20} className="mr-2" />
              Importa Contatti
            </button>
          )}

          <button
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-pink-200 transform active:scale-95"
            onClick={handleCreateNew}
          >
            <Plus size={20} className="mr-2" />
            Nuovo Invito
          </button>
        </div>
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
              disabled={openingWABulk}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {openingWABulk ? <Loader size={16} className="animate-spin mr-2"/> : <MessageCircle size={16} className="mr-2"/>}
              Invia WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* --- DESKTOP VIEW (Table) - Switch a LG (1024px) --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden lg:block">
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
                invitations.map((invitation) => {
                  const verifyInfo = getVerificationIcon(invitation.contact_verified);
                  const isVerifying = verifyingSingleFor === invitation.id;
                  
                  return (
                  <tr
                    key={invitation.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(invitation.id) ? 'bg-pink-50' : ''}`}
                  >
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
                        <span className="text-2xl mr-2" title={invitation.origin === 'bride' ? 'Lato Sposa' : 'Lato Sposo'}>
                          {invitation.origin === 'bride' ? '👰' : '🤵'}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{invitation.name}</div>
                          <code className="text-xs text-pink-600 font-mono bg-gray-100 px-1 rounded border border-gray-200">
                            {invitation.code}
                          </code>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {invitation.phone_number ? (
                        <div className="flex items-center">
                          <button
                            onClick={() => handleVerifyContact(invitation)}
                            disabled={isVerifying || invitation.contact_verified === 'ok'}
                            className={`p-1.5 rounded-full mr-2 transition-all ${verifyInfo.color} ${
                                invitation.contact_verified !== 'ok' ? 'hover:scale-110 cursor-pointer shadow-sm hover:shadow' : 'cursor-default'
                            }`}
                            title={isVerifying ? 'Verifica in corso...' : `${verifyInfo.title} - Clicca per verificare`}
                          >
                             {isVerifying ? <Loader size={14} className="animate-spin" /> : verifyInfo.icon}
                          </button>
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

                      <div className="flex flex-col gap-1 mt-2">
                        {invitation.accommodation_offered && (
                          <div className="flex items-center text-xs">
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center">
                              <Home size={10} className="mr-1"/>
                            </span>
                            {invitation.status === 'confirmed' && invitation.accommodation_requested && (
                              <>
                                <ArrowRight size={10} className="mx-1 text-gray-400" />
                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-semibold flex items-center">
                                  <CheckCircle size={10} className="mr-1"/>
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {invitation.transfer_offered && (
                          <div className="flex items-center text-xs">
                            <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 flex items-center">
                              <Bus size={10} className="mr-1"/>
                            </span>
                            {invitation.status === 'confirmed' && invitation.transfer_requested && (
                              <>
                                <ArrowRight size={10} className="mx-1 text-gray-400" />
                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-semibold flex items-center">
                                  <CheckCircle size={10} className="mr-1"/>
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">

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
                        
                        {/* SEND WHATSAPP ACTION */}
                          <button
                            onClick={() => handleSingleSend(invitation)}
                            disabled={!isContactValid(invitation) || openingWASingleFor === invitation.id}
                            className={`p-1.5 rounded-md transition-colors ${
                              !isContactValid(invitation)
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={isContactValid(invitation) ? 'Invia WhatsApp' : 'Contatto mancante o invalido'}
                          >
                            {openingWASingleFor === invitation.id ? (
                              <Loader size={18} className="animate-spin" />
                            ) : (
                              <MessageCircle size={18} />
                            )}
                          </button>

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
                            title={generatedLink?.id === invitation.id ? 'Link Copiato!' : 'Copia Link Pubblico'}
                            disabled={generatingLinkFor === invitation.id && generatedLink?.id !== invitation.id}
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

                        {/* PREVIEW ACTION (always with token) */}
                        <button
                          onClick={() => handleOpenPreview(invitation.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            openingPreviewFor === invitation.id
                              ? 'bg-yellow-50 text-yellow-600 cursor-wait'
                              : 'text-gray-400 hover:text-pink-600 hover:bg-pink-50'
                          }`}
                          title="Apri Anteprima Sicura"
                          disabled={openingPreviewFor === invitation.id}
                        >
                          {openingPreviewFor === invitation.id ? (
                            <Loader size={18} className="animate-spin" />
                          ) : (
                            <ExternalLink size={18} />
                          )}
                        </button>

                        <button
                          onClick={() => handleEdit(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Modifica"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW (Cards) - Visible until LG --- */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
            <span className="text-sm text-gray-500 mt-2">Caricamento...</span>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={48} className="text-gray-300 mb-3 mx-auto" />
            <p className="text-lg font-medium text-gray-900">Nessun invito presente</p>
            <button onClick={handleCreateNew} className="text-pink-600 font-medium hover:underline mt-2">
              Crea il tuo primo invito
            </button>
          </div>
        ) : (
          invitations.map((invitation) => {
            const verifyInfo = getVerificationIcon(invitation.contact_verified);
            const isVerifying = verifyingSingleFor === invitation.id;
            return (
              <div
                key={invitation.id}
                className={`bg-white p-4 rounded-xl shadow-sm border ${
                  selectedIds.includes(invitation.id)
                    ? 'border-pink-500 ring-2 ring-pink-500'
                    : 'border-gray-200'
                }`}
              >
                {/* Header Card: Selezione + Nome + Status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(invitation.id)}
                      onChange={() => toggleSelectOne(invitation.id)}
                      className="w-5 h-5 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                    />
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {invitation.name}
                        <span className="text-lg">{invitation.origin === 'bride' ? '👰' : '🤵'}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{invitation.code}</div>
                    </div>
                  </div>
                  <div>{getStatusBadge(invitation.status)}</div>
                </div>

                {/* Body Card: Contatto e Ospiti */}
                <div className="mb-4 space-y-2">
                  {invitation.phone_number ? (
                    <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <button
                        onClick={() => handleVerifyContact(invitation)}
                        disabled={isVerifying || invitation.contact_verified === 'ok'}
                        className={`mr-2 ${verifyInfo.color} p-1 rounded-full`}
                      >
                        {isVerifying ? <Loader size={12} className="animate-spin" /> : verifyInfo.icon}
                      </button>
                      {invitation.phone_number}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Nessun contatto</div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {invitation.guests?.map((g, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 flex items-center"
                      >
                        {g.is_child ? <Baby size={10} className="mr-1" /> : <User size={10} className="mr-1" />}
                        {g.first_name}
                      </span>
                    ))}
                  </div>

                  {/* Service indicators */}
                  {(invitation.accommodation_offered || invitation.transfer_offered) && (
                    <div className="flex gap-2 mt-2">
                      {invitation.accommodation_offered && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center">
                          <Home size={10} className="mr-1" /> Alloggio
                        </span>
                      )}
                      {invitation.transfer_offered && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center">
                          <Bus size={10} className="mr-1" /> Transfer
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Card: Azioni (Mobile Optimized) */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSingleSend(invitation)}
                      disabled={!isContactValid(invitation) || openingWASingleFor === invitation.id}
                      className={`p-2 rounded-lg transition-colors ${
                        !isContactValid(invitation)
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {openingWASingleFor === invitation.id ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <MessageCircle size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleGenerateLink(invitation.id)}
                      disabled={generatingLinkFor === invitation.id}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    >
                      {generatingLinkFor === invitation.id && generatedLink?.id !== invitation.id ? (
                        <Loader size={18} className="animate-spin" />
                      ) : generatedLink?.id === invitation.id ? (
                        <CheckCircle size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => setInteractionInvitation({ id: invitation.id, name: invitation.name })}
                      className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                    >
                      <Activity size={18} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(invitation.id)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(invitation.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <CreateInvitationModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchInvitations}
          initialData={editingInvitation}
        />
      )}

      {/* PHONEBOOK IMPORT MODAL */}
      {isPhoneImportOpen && (
        <PhonebookImportModal
          onClose={() => setIsPhoneImportOpen(false)}
          onSuccess={fetchInvitations}
        />
      )}

      {/* SEND WHATSAPP MODAL */}
      {isWAModalOpen && (
        <SendWhatsAppModal
          isOpen={isWAModalOpen}
          onClose={() => setIsWAModalOpen(false)}
          onSuccess={handleWASuccess}
          recipients={waRecipients}
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
