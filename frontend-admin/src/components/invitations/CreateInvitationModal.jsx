// frontend-admin/src/components/invitations/CreateInvitationModal.jsx
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Save, UserPlus, Trash2, Home, Bus, Users } from 'lucide-react';

const CreateInvitationModal = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    accommodation_offered: false,
    transfer_offered: false,
    guests: [
      { first_name: '', last_name: '', is_child: false }
    ],
    affinities: [], // IDs of other invitations
    non_affinities: [] // IDs of other invitations
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Guest Management
  const addGuest = () => {
    setFormData(prev => ({
      ...prev,
      guests: [...prev.guests, { first_name: '', last_name: '', is_child: false }]
    }));
  };

  const removeGuest = (index) => {
    if (formData.guests.length > 1) {
      setFormData(prev => ({
        ...prev,
        guests: prev.guests.filter((_, i) => i !== index)
      }));
    }
  };

  const updateGuest = (index, field, value) => {
    const newGuests = [...formData.guests];
    newGuests[index][field] = value;
    setFormData(prev => ({ ...prev, guests: newGuests }));
  };

  // Navigation Logic
  const handleNext = () => {
    // Basic validation
    if (step === 1) {
      if (!formData.name || !formData.code) {
        alert("Nome e Codice sono obbligatori");
        return;
      }
    }
    if (step === 2) {
      const isValid = formData.guests.every(g => g.first_name && g.last_name);
      if (!isValid) {
        alert("Tutti gli ospiti devono avere nome e cognome");
        return;
      }
    }
    
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    console.log("Saving Data:", formData);
    // TODO: API Call to save
    alert('Invito salvato! (Vedi console per i dati)');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Nuovo Invito</h2>
            <p className="text-sm text-gray-500 mt-1">Step {step} di {totalSteps}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-100">
          <div 
            className="h-full bg-pink-600 transition-all duration-300 ease-in-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            
            {/* STEP 1: Info Base */}
            {step === 1 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                    Dettagli Invito
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Visualizzato</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Es. Famiglia Rossi"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Il nome che apparirà nella lista admin.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Codice Univoco (Slug)</label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        placeholder="Es. famiglia-rossi"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Parte finale dell'URL pubblico.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-4">Opzioni Offerte</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${formData.accommodation_offered ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200'}`}>
                        <input
                          type="checkbox"
                          name="accommodation_offered"
                          checked={formData.accommodation_offered}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center">
                          <Home size={20} className={`mr-2 ${formData.accommodation_offered ? 'text-pink-600' : 'text-gray-400'}`} />
                          <span className={formData.accommodation_offered ? 'text-gray-900 font-medium' : 'text-gray-600'}>Alloggio incluso</span>
                        </div>
                      </label>

                      <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${formData.transfer_offered ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-200'}`}>
                        <input
                          type="checkbox"
                          name="transfer_offered"
                          checked={formData.transfer_offered}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center">
                          <Bus size={20} className={`mr-2 ${formData.transfer_offered ? 'text-pink-600' : 'text-gray-400'}`} />
                          <span className={formData.transfer_offered ? 'text-gray-900 font-medium' : 'text-gray-600'}>Transfer incluso</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Gestione Ospiti */}
            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="flex justify-between items-center">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                    Lista Ospiti
                  </h3>
                  <button 
                    onClick={addGuest}
                    className="flex items-center text-sm font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <UserPlus size={16} className="mr-1.5" />
                    Aggiungi Ospite
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.guests.map((guest, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-end relative group transition-all hover:shadow-md hover:border-pink-100">
                      <div className="absolute -left-3 top-6 bg-gray-100 text-gray-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                        <input
                          type="text"
                          value={guest.first_name}
                          onChange={(e) => updateGuest(index, 'first_name', e.target.value)}
                          placeholder="Mario"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm"
                        />
                      </div>
                      
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cognome</label>
                        <input
                          type="text"
                          value={guest.last_name}
                          onChange={(e) => updateGuest(index, 'last_name', e.target.value)}
                          placeholder="Rossi"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center h-[42px] px-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={guest.is_child}
                            onChange={(e) => updateGuest(index, 'is_child', e.target.checked)}
                            className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-sm text-gray-600">Bambino</span>
                        </label>
                      </div>

                      <button 
                        onClick={() => removeGuest(index)}
                        disabled={formData.guests.length === 1}
                        className={`p-2 rounded-lg transition-colors ${formData.guests.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        title="Rimuovi ospite"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                
                {formData.guests.length === 0 && (
                   <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-gray-500">Nessun ospite aggiunto.</p>
                   </div>
                )}
              </div>
            )}

            {/* STEP 3: Affinità */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                 <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">3</span>
                    Affinità & Tavoli
                  </h3>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                   <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <Users size={32} className="text-gray-400" />
                   </div>
                   <h4 className="text-gray-900 font-medium mb-2">Funzionalità in arrivo</h4>
                   <p className="text-gray-500 max-w-md mx-auto">
                     La selezione delle affinità sarà disponibile una volta salvati i primi inviti nel sistema. 
                     Potrai modificare questo invito successivamente per aggiungere relazioni.
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer - Actions */}
        <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center px-6 py-2.5 rounded-lg border font-medium transition-colors ${
              step === 1 
                ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ChevronLeft size={18} className="mr-2" />
            Indietro
          </button>

          <div className="flex space-x-4">
            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                Avanti
                <ChevronRight size={18} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center px-8 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-pink-200"
              >
                <Save size={18} className="mr-2" />
                Salva Invito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvitationModal;
