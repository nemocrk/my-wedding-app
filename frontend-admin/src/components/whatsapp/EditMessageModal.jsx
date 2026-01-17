import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EditMessageModal = ({ isOpen, onClose, message, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    session_type: 'groom',
    message: '',
  });

  useEffect(() => {
    if (message) {
      console.log('EditMessageModal received message:', message);
      setFormData({
        session_type: message.session_type || 'groom',
        message: message.message_body || '',
      });
    }
  }, [message]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting edit:', { id: message.id, data: formData });
    onSave(message.id, {
        session_type: formData.session_type,
        message_body: formData.message
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true" 
          onClick={handleOverlayClick}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {t('admin.whatsapp.edit_modal.title')}
              </h3>
              <button 
                onClick={onClose} 
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('admin.whatsapp.edit_modal.recipient')}</label>
                <div className="mt-1 p-2 bg-gray-50 rounded-md text-gray-900">
                  {message?.recipient_number}
                </div>
              </div>

              <div>
                <label htmlFor="session_type" className="block text-sm font-medium text-gray-700">{t('admin.whatsapp.edit_modal.session')}</label>
                <select
                  id="session_type"
                  value={formData.session_type}
                  onChange={(e) => setFormData({...formData, session_type: e.target.value})}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="groom">{t('admin.whatsapp.common.groom_label')}</option>
                  <option value="bride">{t('admin.whatsapp.common.bride_label')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">{t('admin.whatsapp.edit_modal.content')}</label>
                <textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse -mx-6 -mb-4 mt-6">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('admin.whatsapp.edit_modal.save')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditMessageModal;
