// frontend-admin/src/pages/InvitationList.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, ExternalLink, Baby, User, Home, Bus, CheckCircle, HelpCircle, XCircle, ArrowRight, Copy, Loader, Activity, Send, FileText, Eye, Phone, RefreshCw, MessageCircle, UserX, AlertCircle, Smartphone, Tag, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CreateInvitationModal from '../components/invitations/CreateInvitationModal';
import PhonebookImportModal from '../components/invitations/PhonebookImportModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import InteractionsModal from '../components/analytics/InteractionsModal';
import SendWhatsAppModal from '../components/whatsapp/SendWhatsAppModal';
import BulkSendConfirmModal from '../components/invitations/BulkSendConfirmModal';
import { api } from '../services/api';

const InvitationList = () => {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [labels, setLabels] = useState([]);
  const [activeLabelFilter, setActiveLabelFilter] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
  
  // Bulk Send Modal State
  const [isBulkSendModalOpen, setIsBulkSendModalOpen] = useState(false);

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
      const filters = {};
      if (activeLabelFilter) filters.label = activeLabelFilter;
      if (activeStatusFilter) filters.status = activeStatusFilter;
      if (searchTerm) filters.search = searchTerm;

      const data = await api.fetchInvitations(filters);
      setInvitations(data.results || data);
    } catch (error) {
      console.error('Failed to load invitations', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabels = async () => {
      try {
          const data = await api.fetchInvitationLabels();
          setLabels(data.results || data);
      } catch (error) {
          console.error("Failed to load labels", error);
      }
  };

  useEffect(() => {
    fetchLabels();
    fetchInvitations();
  }, [activeLabelFilter, activeStatusFilter]); // Refetch on filter change

  // Debounced search
  useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
          if (searchTerm !== '') {
            fetchInvitations();
          }
      }, 500);
      return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);


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
  const statusConfig = {
    imported: { icon: FileText, label: t('admin.invitations.status.imported'), color: 'bg-gray-100 text-gray-600' },
    created: { icon: FileText, label: t('admin.invitations.status.created'), color: 'bg-gray-100 text-gray-600' },
    sent: { icon: Send, label: t('admin.invitations.status.sent'), color: 'bg-blue-100 text-blue-700' },
    read: { icon: Eye, label: t('admin.invitations.status.read'), color: 'bg-indigo-100 text-indigo-700' },
    confirmed: { icon: CheckCircle, label: t('admin.invitations.status.confirmed'), color: 'bg-green-100 text-green-800' },
    declined: { icon: XCircle, label: t('admin.invitations.status.declined'), color: 'bg-red-100 text-red-800' },
  };
  const getStatusBadge = (status) => {
    
    const config = statusConfig[status] || { icon: HelpCircle, label: t('admin.invitations.status.unknown'), color: 'bg-gray-100 text-gray-600' };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} className="mr-1"/> {config.label}
      </span>
    );
  };

  const isContactValid = (inv) => {
    return inv.phone_number && inv.phone_number.length > 5;
  };
  
  const getVerificationIcon = (status) => {
    const verificationConfig = {
      ok: { icon: <CheckCircle size={14} />, color: 'bg-green-100 text-green-600', title: t('admin.invitations.verification.ok') },
      not_present: { icon: <UserX size={14} />, color: 'bg-yellow-100 text-yellow-600', title: t('admin.invitations.verification.not_present') },
      not_exist: { icon: <XCircle size={14} />, color: 'bg-red-100 text-red-600', title: t('admin.invitations.verification.not_exist') },
    };
    
    return verificationConfig[status] || { icon: <AlertCircle size={14} />, color: 'bg-gray-100 text-gray-500', title: t('admin.invitations.verification.not_valid') };
  };

  // --- ACTIONS ---
  
  const handleVerifyContact = async (invitation) => {
    if (invitation.contact_verified === 'ok' || verifyingSingleFor === invitation.id) return;
    
    setVerifyingSingleFor(invitation.id);
    try {
      await api.verifyContact(invitation.id);
      await fetchInvitations();
    } catch (error) {
      console.error('Failed to verify contact', error);
      alert(t('admin.invitations.alerts.verify_failed'));
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
        alert(t('admin.invitations.alerts.bulk_verify_complete', { count: selectedIds.length }));
    } catch (error) {
        console.error('Bulk verify failed', error);
        alert(t('admin.invitations.alerts.bulk_verify_failed'));
    } finally {
        setVerifyingContacts(false);
    }
  };

  const handleBulkSendInvitations = () => {
      // Opens the confirmation modal for bulk sending invitations
      if (selectedIds.length === 0) return;
      setIsBulkSendModalOpen(true);
  };

  const handleWABulkSend = () => {
    if (openingWABulk || isWAModalOpen) return;
    setOpeningWABulk(true);

    try {
      const selected = invitations.filter(inv => selectedIds.includes(inv.id));
      const valid = selected.filter(isContactValid);
      const invalidCount = selected.length - valid.length;

      if (valid.length === 0) {
        alert(t('admin.invitations.alerts.no_valid_contacts'));
        return;
      }

      if (invalidCount > 0) {
        if (!window.confirm(t('admin.invitations.alerts.some_invalid', { count: invalidCount, total: selected.length }))) {
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
        alert(t('admin.invitations.alerts.invalid_contact'));
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
  
  const handleBulkSendSuccess = () => {
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
      console.error(t('admin.invitations.alerts.delete_failed'), error);
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
          <h1 className="text-2xl font-bold text-gray-800">{t('admin.invitations.page_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin.invitations.page_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {isContactPickerSupported && (
            <button
              onClick={() => setIsPhoneImportOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-indigo-200 transform active:scale-95"
            >
              <Smartphone size={20} className="mr-2" />
              {t('admin.invitations.buttons.import_contacts')}
            </button>
          )}

          <button
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center transition-all shadow-sm hover:shadow-pink-200 transform active:scale-95"
            onClick={handleCreateNew}
          >
            <Plus size={20} className="mr-2" />
            {t('admin.invitations.buttons.new_invitation')}
          </button>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center text-gray-500">
             <Filter size={18} className="mr-2" />
             <span className="text-sm font-medium">{t('admin.invitations.filters.title') || "Filtri"}:</span>
          </div>

          <input
             type="text"
             placeholder={t('admin.invitations.filters.search_placeholder') || "Cerca per nome..."}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-pink-500 outline-none min-w-[200px]"
          />

          <select
              value={activeStatusFilter}
              onChange={(e) => setActiveStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-pink-500 outline-none"
          >
              <option value="">{t('admin.invitations.filters.all_statuses') || "Tutti gli stati"}</option>
              <option value="created">{t('admin.invitations.status.created')}</option>
              <option value="sent">{t('admin.invitations.status.sent')}</option>
              <option value="read">{t('admin.invitations.status.read')}</option>
              <option value="confirmed">{t('admin.invitations.status.confirmed')}</option>
              <option value="declined">{t('admin.invitations.status.declined')}</option>
          </select>

          {labels.length > 0 && (
             <select
                value={activeLabelFilter}
                onChange={(e) => setActiveLabelFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-pink-500 outline-none"
             >
                <option value="">{t('admin.invitations.filters.all_labels') || "Tutte le etichette"}</option>
                {labels.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                ))}
             </select>
          )}
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-white border-l-4 border-pink-600 shadow-md rounded-r-lg p-4 mb-6 flex items-center justify-between animate-fadeIn flex-wrap gap-4">
          <div className="flex items-center">
            <span className="font-semibold text-gray-800 mr-4">{t('admin.invitations.bulk_action.selected', { count: selectedIds.length })}</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {t('admin.invitations.buttons.deselect_all')}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBulkVerify}
              disabled={verifyingContacts}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {verifyingContacts ? <Loader size={16} className="animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
              {t('admin.invitations.buttons.verify_contacts')}
            </button>

             {/* NUOVO PULSANTE BULK SEND INVITATIONS */}
            <button
               onClick={handleBulkSendInvitations}
               className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
               <Send size={16} className="mr-2" />
               {t('admin.invitations.buttons.send_invitations') || "Invia Inviti"}
            </button>
            
            <button
              onClick={handleWABulkSend}
              disabled={openingWABulk}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {openingWABulk ? <Loader size={16} className="animate-spin mr-2"/> : <MessageCircle size={16} className="mr-2"/>}
              {t('admin.invitations.buttons.send_whatsapp')}
            </button>
          </div>
        </div>
      )}

      {/* --- DESKTOP VIEW (Table) --- */}
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
                  {t('admin.invitations.table.headers.name_origin')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                  {t('admin.invitations.table.headers.contact')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">
                  {t('admin.invitations.table.headers.guests')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('admin.invitations.table.headers.status')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('admin.invitations.table.headers.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                      <span className="ml-3">{t('admin.invitations.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-500" colSpan="6">
                    <div className="flex flex-col items-center">
                      <Users size={48} className="text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">{t('admin.invitations.no_invitations')}</p>
                      <button onClick={handleCreateNew} className="text-pink-600 font-medium hover:underline mt-2">
                        {t('admin.invitations.no_invitations_subtitle')}
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
                        <span className="text-2xl mr-2" title={invitation.origin === 'bride' ? t('admin.invitations.origin.bride') : t('admin.invitations.origin.groom')}>
                          {invitation.origin === 'bride' ? '👰' : '🤵'}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{invitation.name}</div>
                          <code className="text-xs text-pink-600 font-mono bg-gray-100 px-1 rounded border border-gray-200">
                            {invitation.code}
                          </code>
                          {/* LABELS BADGES */}
                          {invitation.labels && invitation.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {invitation.labels.map(label => (
                                    <span 
                                        key={label.id} 
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                        style={{ backgroundColor: label.color }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                          )}
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
                            title={isVerifying ? t('admin.invitations.verification.verifying') : `${verifyInfo.title} - ${t('admin.invitations.verification.click_to_verify')}`}
                          >
                             {isVerifying ? <Loader size={14} className="animate-spin" /> : verifyInfo.icon}
                          </button>
                          <span className="text-sm text-gray-600 font-mono">{invitation.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic flex items-center">
                          <XCircle size={12} className="mr-1"/> {t('admin.invitations.contact.no_contact')}
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
                            title={t('admin.invitations.actions.send')}
                          >
                            {markingSentFor === invitation.id ? (
                              <Loader size={18} className="animate-spin" />
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleSingleSend(invitation)}
                          disabled={!isContactValid(invitation) || openingWASingleFor === invitation.id}
                          className={`p-1.5 rounded-md transition-colors ${
                            !isContactValid(invitation)
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={isContactValid(invitation) ? t('admin.invitations.actions.send_whatsapp') : t('admin.invitations.actions.contact_missing')}
                        >
                          {openingWASingleFor === invitation.id ? (
                            <Loader size={18} className="animate-spin" />
                          ) : (
                            <MessageCircle size={18} />
                          )}
                        </button>

                        {!['imported','created','sent'].includes(invitation.status) && (
                          <button
                            onClick={() => setInteractionInvitation({ id: invitation.id, name: invitation.name })}
                            className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title={t('admin.invitations.actions.interaction_log')}
                          >
                            <Activity size={18} />
                          </button>
                        )}

                        {!['imported','created'].includes(invitation.status) && (
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
                            title={generatedLink?.id === invitation.id ? t('admin.invitations.actions.link_copied') : t('admin.invitations.actions.copy_link')}
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
                        )}

                        {!['imported','created'].includes(invitation.status) && (
                        <button
                          onClick={() => handleOpenPreview(invitation.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            openingPreviewFor === invitation.id
                              ? 'bg-yellow-50 text-yellow-600 cursor-wait'
                              : 'text-gray-400 hover:text-pink-600 hover:bg-pink-50'
                          }`}
                          title={t('admin.invitations.actions.preview')}
                          disabled={openingPreviewFor === invitation.id}
                        >
                          {openingPreviewFor === invitation.id ? (
                            <Loader size={18} className="animate-spin" />
                          ) : (
                            <ExternalLink size={18} />
                          )}
                        </button>
                        )}

                        <button
                          onClick={() => handleEdit(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title={t('admin.invitations.actions.edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(invitation.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={t('admin.invitations.actions.delete')}
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

      {/* --- MOBILE VIEW (Cards) --- */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
            <span className="text-sm text-gray-500 mt-2">{t('common.loading')}</span>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={48} className="text-gray-300 mb-3 mx-auto" />
            <p className="text-lg font-medium text-gray-900">{t('admin.invitations.no_invitations')}</p>
            <button onClick={handleCreateNew} className="text-pink-600 font-medium hover:underline mt-2">
              {t('admin.invitations.no_invitations_subtitle')}
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
                      {/* MOBILE LABELS */}
                        {invitation.labels && invitation.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {invitation.labels.map(label => (
                                    <span 
                                        key={label.id} 
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                        style={{ backgroundColor: label.color }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                  </div>
                  <div>{getStatusBadge(invitation.status)}</div>
                </div>

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
                    <div className="text-xs text-gray-400 italic">{t('admin.invitations.contact.no_contact')}</div>
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

                  {(invitation.accommodation_offered || invitation.transfer_offered) && (
                    <div className="flex gap-2 mt-2">
                      {invitation.accommodation_offered && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex items-center">
                          <Home size={10} className="mr-1" /> {t('admin.invitations.services.accommodation')}
                        </span>
                      )}
                      {invitation.transfer_offered && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center">
                          <Bus size={10} className="mr-1" /> {t('admin.invitations.services.transfer')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex gap-2">                        
                    {invitation.status === 'created' && (
                      <button
                        onClick={() => handleMarkAsSent(invitation.id)}
                        disabled={markingSentFor === invitation.id}
                        className="p-2 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title={t('admin.invitations.actions.send')}
                      >
                        {markingSentFor === invitation.id ? (
                          <Loader size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    )}
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
                    {!['imported','created'].includes(invitation.status) && (
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
                    )}
                    {!['imported','created'].includes(invitation.status) && (
                      <button
                        onClick={() => setInteractionInvitation({ id: invitation.id, name: invitation.name })}
                        className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                      >
                        <Activity size={18} />
                      </button>
                    )}
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

      {/* --- MODALS --- */}
      {isModalOpen && (
        <CreateInvitationModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchInvitations}
          initialData={editingInvitation}
        />
      )}

      {isPhoneImportOpen && (
        <PhonebookImportModal
          onClose={() => setIsPhoneImportOpen(false)}
          onSuccess={fetchInvitations}
        />
      )}

      {isWAModalOpen && (
        <SendWhatsAppModal
          isOpen={isWAModalOpen}
          onClose={() => setIsWAModalOpen(false)}
          onSuccess={handleWASuccess}
          recipients={waRecipients}
        />
      )}
      
      {isBulkSendModalOpen && (
        <BulkSendConfirmModal
           isOpen={isBulkSendModalOpen}
           onClose={() => setIsBulkSendModalOpen(false)}
           selectedIds={selectedIds}
           invitations={invitations}
           onSuccess={handleBulkSendSuccess}
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
        title={t('admin.invitations.delete_modal.title')}
        message={t('admin.invitations.delete_modal.message')}
        confirmText={t('admin.invitations.delete_modal.confirm')}
        cancelText={t('admin.invitations.delete_modal.cancel')}
        isDangerous={true}
      />
    </div>
  );
};

export default InvitationList;
