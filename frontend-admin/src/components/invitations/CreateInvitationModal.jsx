// frontend-admin/src/components/invitations/CreateInvitationModal.jsx
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Save } from 'lucide-react';

const CreateInvitationModal = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // TODO: Implement logic to save invitation
    alert('Invito salvato (mock)');
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
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Informazioni Base</h3>
                {/* TODO: Form Step 1 (Nome Invito, Logistica) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-400 italic">Form Step 1: Nome invito, opzioni alloggio e transfer...</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Gestione Ospiti</h3>
                {/* TODO: Form Step 2 (Lista Persone) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                   <p className="text-gray-400 italic">Form Step 2: Aggiunta nomi cognomi e tipologia ospite...</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Affinità & Tavoli</h3>
                {/* TODO: Form Step 3 (Affinità) */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                   <p className="text-gray-400 italic">Form Step 3: Selezione affinità e incompatibilità...</p>
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
             {/* Pulsante Cancel (opzionale) */}
             {/* <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-gray-700">Annulla</button> */}
             
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
