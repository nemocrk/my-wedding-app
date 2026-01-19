// frontend-admin/src/components/invitations/CreateInvitationModal.jsx
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Save, UserPlus, Trash2, Home, Bus, Users, Check, Phone, Tag } from 'lucide-react';
import { api } from '../../services/api';
import ErrorModal from '../common/ErrorModal';
import { useTranslation } from 'react-i18next';

const CreateInvitationModal = ({ onClose, onSuccess, initialData = null }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [loading, setLoading] = useState(false);
  const [existingInvitations, setExistingInvitations] = useState([]);
  const [availableLabels, setAvailableLabels] = useState([]);

  // Edit Mode Flag
  const isEditMode = !!initialData;

  // Error Modal State
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    origin: 'groom', // 'groom' or 'bride'
    phone_number: '',
    accommodation_offered: false,
    transfer_offered: false,
    label_ids: [],
    guests: [
      { first_name: '', last_name: '', is_child: false }
    ],
    affinities: [], // IDs
    non_affinities: [] // IDs
  });

  // Load Initial Data (for Edit)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        origin: initialData.origin || 'groom',
        phone_number: initialData.phone_number || '',
        accommodation_offered: initialData.accommodation_offered || false,
        transfer_offered: initialData.transfer_offered || false,
        label_ids: initialData.labels ? initialData.labels.map(l => l.id) : [],
        guests: initialData.guests && initialData.guests.length > 0 
          ? initialData.guests 
          : [{ first_name: '', last_name: '', is_child: false }],
        affinities: initialData.affinities || [],
        non_affinities: initialData.non_affinities || []
      });
    }
  }, [initialData]);

  // Fetch available labels
  useEffect(() => {
    const loadLabels = async () => {
        try {
            const data = await api.fetchInvitationLabels();
            setAvailableLabels(data.results || data);
        } catch (error) {
            console.error("Failed to load labels", error);
        }
    };
    loadLabels();
  }, []);

  // Fetch existing invitations for affinities step
  useEffect(() => {
    if (step === 3) {
      const loadInvitations = async () => {
        try {
          const data = await api.fetchInvitations();
          // Filter out self from list if editing
          const allInv = data.results || data;
          const filtered = isEditMode 
            ? allInv.filter(i => i.id !== initialData.id) 
            : allInv;
          setExistingInvitations(filtered);
        } catch (error) {
          console.error("Failed to load invitations", error);
        }
      };
      loadInvitations();
    }
  }, [step, isEditMode, initialData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleLabel = (labelId) => {
    setFormData(prev => {
        const currentLabels = prev.label_ids || [];
        if (currentLabels.includes(labelId)) {
            return { ...prev, label_ids: currentLabels.filter(id => id !== labelId) };
        } else {
            return { ...prev, label_ids: [...currentLabels, labelId] };
        }
    });
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

  // Affinity Management
  const toggleAffinity = (id, type) => {
    setFormData(prev => {
      const currentList = prev[type];
      const isSelected = currentList.includes(id);
      
      let newList;
      if (isSelected) {
        newList = currentList.filter(itemId => itemId !== id);
      } else {
        newList = [...currentList, id];
      }

      const otherType = type === 'affinities' ? 'non_affinities' : 'affinities';
      const otherList = prev[otherType].filter(itemId => itemId !== id);

      return {
        ...prev,
        [type]: newList,
        [otherType]: otherList
      };
    });
  };

  // Navigation Logic
  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.code) {
        alert(t('admin.invitations.create_modal.steps.details.validation.name_code_required') || "Nome e Codice sono obbligatori"); 
        return;
      }
    }
    if (step === 2) {
      const isValid = formData.guests.every(g => g.first_name);
      if (!isValid) {
        alert(t('admin.invitations.create_modal.steps.guests.validation.min_one'));
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isEditMode) {
        await api.updateInvitation(initialData.id, {...formData, status: formData.status==='imported'?'created':formData.status} );
      } else {
        await api.createInvitation(formData);
      }
      
      if (onSuccess) onSuccess(); 
      onClose();
    } catch (error) {
      console.error("Save failed", error);
      setErrorMessage(error.message);
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {t('admin.invitations.create_modal.title')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('admin.invitations.create_modal.step_of', { step, total: totalSteps })}</p>
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-3xl mx-auto">
              
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
                      {t('admin.invitations.create_modal.steps.details.title')}
                    </h3>
                    
                    {/* ORIGIN TOGGLE */}
                    <div className="flex justify-center mb-6">
                      <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, origin: 'groom' }))}
                          className={`flex items-center px-6 py-2 rounded-md text-sm font-medium transition-all ${
                            formData.origin === 'groom' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span className="mr-2">🤵</span>
                          {t('admin.invitations.create_modal.steps.details.side_groom')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, origin: 'bride' }))}
                          className={`flex items-center px-6 py-2 rounded-md text-sm font-medium transition-all ${
                            formData.origin === 'bride' 
                              ? 'bg-white text-pink-600 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span className="mr-2">👰</span>
                          {t('admin.invitations.create_modal.steps.details.side_bride')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.invitations.create_modal.steps.details.display_name')}</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={t('admin.invitations.create_modal.steps.details.display_name_placeholder')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.invitations.create_modal.steps.details.unique_code')}</label>
                        <input
                          type="text"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          placeholder={t('admin.invitations.create_modal.steps.details.unique_code_placeholder')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* PHONE NUMBER */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.invitations.create_modal.steps.details.phone_number')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone size={18} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          placeholder={t('admin.invitations.create_modal.steps.details.phone_placeholder')}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.invitations.create_modal.steps.details.phone_hint')}
                      </p>
                    </div>

                    {/* LABELS SECTION */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                             <Tag size={16} className="inline mr-1"/> {t('admin.invitations.create_modal.steps.details.labels') || "Etichette"}
                        </label>
                        {availableLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {availableLabels.map(label => {
                                    const isSelected = formData.label_ids.includes(label.id);
                                    return (
                                        <button
                                            key={label.id}
                                            type="button"
                                            onClick={() => toggleLabel(label.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                                isSelected 
                                                ? 'ring-2 ring-offset-1' 
                                                : 'opacity-70 hover:opacity-100'
                                            }`}
                                            style={{
                                                backgroundColor: isSelected ? label.color : 'white',
                                                borderColor: label.color,
                                                color: isSelected ? '#fff' : label.color,
                                                '--tw-ring-color': label.color
                                            }}
                                        >
                                            {label.name}
                                            {isSelected && <Check size={12} className="inline ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">{t('admin.invitations.create_modal.steps.details.no_labels') || "Nessuna etichetta disponibile"}</p>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-4">{t('admin.invitations.create_modal.steps.details.offered_options')}</label>
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
                            <span className={formData.accommodation_offered ? 'text-gray-900 font-medium' : 'text-gray-600'}>{t('admin.invitations.create_modal.steps.details.accommodation_offered')}</span>
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
                            <span className={formData.transfer_offered ? 'text-gray-900 font-medium' : 'text-gray-600'}>{t('admin.invitations.create_modal.steps.details.transfer_offered')}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">2</span>
                      {t('admin.invitations.create_modal.steps.guests.title')}
                    </h3>
                    <button 
                      onClick={addGuest}
                      className="flex items-center text-sm font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <UserPlus size={16} className="mr-1.5" />
                      {t('admin.invitations.create_modal.steps.guests.add_guest')}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.guests.map((guest, index) => (
                      <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-end relative group transition-all hover:shadow-md hover:border-pink-100">
                        <div className="absolute -left-3 top-6 bg-gray-100 text-gray-500 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-sm">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('admin.invitations.create_modal.steps.guests.name_label')}</label>
                          <input
                            type="text"
                            value={guest.first_name}
                            onChange={(e) => updateGuest(index, 'first_name', e.target.value)}
                            placeholder={t('admin.invitations.create_modal.steps.guests.name_placeholder')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm"
                          />
                        </div>
                        
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('admin.invitations.create_modal.steps.guests.lastname_label')}</label>
                          <input
                            type="text"
                            value={guest.last_name}
                            onChange={(e) => updateGuest(index, 'last_name', e.target.value)}
                            placeholder={t('admin.invitations.create_modal.steps.guests.lastname_placeholder')}
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
                            <span className="text-sm text-gray-600">{t('admin.invitations.create_modal.steps.guests.child_checkbox')}</span>
                          </label>
                        </div>

                        <button 
                          onClick={() => removeGuest(index)}
                          disabled={formData.guests.length === 1}
                          className={`p-2 rounded-lg transition-colors ${formData.guests.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">3</span>
                      {t('admin.invitations.create_modal.steps.review.title')}
                    </h3>
                  
                  {existingInvitations.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                      <Users size={32} className="text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">{t('admin.invitations.create_modal.steps.review.no_other_invites') || "Non ci sono ancora altri inviti con cui creare affinità."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* AFFINI */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 className="font-semibold text-green-700 mb-4 flex items-center">
                          <Users className="mr-2" size={20} />
                          {t('admin.invitations.create_modal.steps.review.affinity_title') || "Affini (Vicina di tavolo)"}
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {existingInvitations.map(inv => (
                            <div 
                              key={inv.id}
                              onClick={() => toggleAffinity(inv.id, 'affinities')}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                formData.affinities.includes(inv.id) 
                                  ? 'bg-green-50 border-green-500' 
                                  : 'border-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                                <p className="text-xs text-gray-500">{inv.guests_names}</p>
                              </div>
                              {formData.affinities.includes(inv.id) && <Check size={16} className="text-green-600" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* NON AFFINI */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h4 className="font-semibold text-red-700 mb-4 flex items-center">
                          <Users className="mr-2" size={20} />
                          {t('admin.invitations.create_modal.steps.review.non_affinity_title') || "Non Affini (Lontano)"}
                        </h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {existingInvitations.map(inv => (
                            <div 
                              key={inv.id}
                              onClick={() => toggleAffinity(inv.id, 'non_affinities')}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                formData.non_affinities.includes(inv.id) 
                                  ? 'bg-red-50 border-red-500' 
                                  : 'border-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                                <p className="text-xs text-gray-500">{inv.guests_names}</p>
                              </div>
                              {formData.non_affinities.includes(inv.id) && <Check size={16} className="text-red-600" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={step === 1 || loading}
              className={`flex items-center px-6 py-2.5 rounded-lg border font-medium transition-colors ${
                step === 1 
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <ChevronLeft size={18} className="mr-2" />
              {t('admin.invitations.create_modal.buttons.back')}
            </button>

            <div className="flex space-x-4">
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={loading}
                  className="flex items-center px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                >
                  {t('admin.invitations.create_modal.buttons.next')}
                  <ChevronRight size={18} className="ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center px-8 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-pink-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="animate-pulse">{t('admin.invitations.create_modal.buttons.saving') || 'Salvataggio...'}</span>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {t('admin.invitations.create_modal.buttons.create')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ERROR MODAL INTEGRATION */}
      <ErrorModal 
        isOpen={errorModalOpen} 
        onClose={() => setErrorModalOpen(false)} 
        errorDetails={errorMessage} 
      />
    </>
  );
};

export default CreateInvitationModal;
