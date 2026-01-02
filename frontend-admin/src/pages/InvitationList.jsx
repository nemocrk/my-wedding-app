// frontend-admin/src/pages/InvitationList.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, ExternalLink } from 'lucide-react';
import CreateInvitationModal from '../components/invitations/CreateInvitationModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { api } from '../services/api';
import ErrorModal from '../components/common/ErrorModal';

const InvitationList = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Error Handling
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await api.fetchInvitations();
      // Gestisce sia risposta paginata (DRF default) che lista piatta
      setInvitations(data.results || data);
    } catch (error) {
      console.error("Failed to load invitations", error);
      setErrorMessage(error.message);
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleEdit = async (id) => {
    try {
      // Fetch full details (including guest IDs and affinities) before editing
      const fullData = await api.getInvitation(id);
      setEditingInvitation(fullData);
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage("Impossibile caricare i dettagli per la modifica: " + error.message);
      setErrorModalOpen(true);
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
      fetchInvitations(); // Refresh list
    } catch (error) {
      setIsDeleteModalOpen(false);
      setErrorMessage("Impossibile eliminare l'invito: " + error.message);
      setErrorModalOpen(true);
    }
  };

  return (
    <div className="animate-fadeIn">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nome Invito
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Codice (Slug)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                      <span className="ml-3">Caricamento inviti...</span>
                    </div>
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-500" colSpan="5">
                    <div className="flex flex-col items-center">
                      <Users size={48} className="text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">Nessun invito presente</p>
                      <p className="text-sm text-gray-500 mb-4">Crea il tuo primo invito per iniziare a popolare la lista.</p>
                      <button 
                        onClick={handleCreateNew}
                        className="text-pink-600 font-medium hover:text-pink-700 hover:underline"
                      >
                        Crea Invito
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invitation.name}</div>
                      {invitation.accommodation_offered && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          Alloggio
                        </span>
                      )}
                      {invitation.transfer_offered && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Transfer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="px-2 py-1 bg-gray-100 rounded text-pink-600 font-mono text-sm border border-gray-200">
                        {invitation.code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Users size={16} className="text-gray-400 mr-2" />
                        <span className="font-medium">{invitation.guests?.length || 0}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                        {invitation.guests?.map(g => `${g.first_name} ${g.last_name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* TODO: Implementare status reale RSVP */}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        In attesa
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                         {/* Link al frontend user (simulato) */}
                        <a 
                          href={`http://localhost/?code=${invitation.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Apri Anteprima"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => handleEdit(invitation.id)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Modifica"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(invitation.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Elimina"
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

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Elimina Invito"
        message="Sei sicuro di voler eliminare questo invito? Questa azione rimuoverà tutti gli ospiti associati e non può essere annullata."
        confirmText="Sì, elimina"
        cancelText="Annulla"
        isDangerous={true}
      />

      <ErrorModal 
        isOpen={errorModalOpen} 
        onClose={() => setErrorModalOpen(false)} 
        errorDetails={errorMessage} 
      />
    </div>
  );
};

export default InvitationList;
