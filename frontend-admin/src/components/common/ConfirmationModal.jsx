// frontend-admin/src/components/common/ConfirmationModal.jsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Conferma", cancelText = "Annulla", isDangerous = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex justify-end p-4">
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 flex flex-col items-center text-center">
          
          <div className={`mb-6 p-4 rounded-full ${isDangerous ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-500'}`}>
            <AlertTriangle size={40} />
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {title}
          </h3>
          
          <p className="text-gray-500 mb-8">
            {message}
          </p>

          <div className="flex w-full space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 text-white font-semibold rounded-xl transition-all shadow-lg transform active:scale-95 ${
                isDangerous 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200 hover:shadow-red-300' 
                  : 'bg-pink-600 hover:bg-pink-700 shadow-pink-200 hover:shadow-pink-300'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
