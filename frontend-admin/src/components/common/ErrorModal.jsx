// frontend-admin/src/components/common/ErrorModal.jsx
import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import sadFaceUrl from '../../assets/illustrations/sad-face.svg';

const ErrorModal = ({ isOpen, onClose, errorDetails }) => {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        {/* Header con pulsante chiusura */}
        <div className="flex justify-end p-4">
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 flex flex-col items-center text-center">
          
          {/* Custom SVG Sad Face */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <img 
              src={sadFaceUrl} 
              alt="Sad Face" 
              className="relative z-10 w-20 h-20 text-red-500" 
            />
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {t('common.error_modal.title')}
          </h3>
          
          <p className="text-gray-500 mb-6">
            {t('common.error_modal.default_user_message')}
          </p>

          {/* Error Details Section */}
          <div className="w-full">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center w-full text-sm text-red-600 font-medium hover:text-red-700 transition-colors mb-2 focus:outline-none"
            >
              {showDetails ? t('common.error_modal.hide_technical_data') : t('common.error_modal.show_technical_data')}
              {showDetails ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
            </button>

            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out bg-red-50 rounded-lg border border-red-100 text-left ${
                showDetails ? 'max-h-60 opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-3">
                <p className="font-mono text-xs text-red-800 break-words whitespace-pre-wrap">
                  {typeof errorDetails === 'object' 
                    ? JSON.stringify(errorDetails, null, 2) 
                    : errorDetails}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="mt-8 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-200 hover:shadow-red-300 transform active:scale-95"
          >
            {t('common.error_modal.button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
