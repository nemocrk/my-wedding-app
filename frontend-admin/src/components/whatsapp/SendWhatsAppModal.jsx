import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, Loader, Smartphone } from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

const SendWhatsAppModal = ({ isOpen, onClose, recipients, onSuccess }) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Message composition
  const [messageBody, setMessageBody] = useState('');

  // Sending state
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Reset states
      setSelectedTemplate(null);
      setMessageBody('');
      setSending(false);
      setProgress({ current: 0, total: recipients.length, success: 0, failed: 0 });
    }
  }, [isOpen, recipients]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const data = await api.fetchWhatsAppTemplates();
      // Filter for manual active templates
      const manualTemplates = (data.results || data).filter(t => t.condition === 'manual' && t.is_active);
      setTemplates(manualTemplates);
    } catch (error) {
      console.error('Error loading templates', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (e) => {
    const tplId = parseInt(e.target.value);
    const tpl = templates.find(t => t.id === tplId);
    setSelectedTemplate(tpl);

    if (tpl) {
      // If single recipient, we can do a smart preview.
      if (recipients.length === 1) {
        const r = recipients[0];
        let text = tpl.content;
        text = text.replace(/{name}/g, r.name);
        text = text.replace(/{code}/g, r.code);
        // {link} is tricky without generating it. We leave it or replace with generic.
        text = text.replace(/{link}/g, '[LINK_INVITO]');
        setMessageBody(text);
      } else {
        setMessageBody(tpl.content);
      }
    } else {
      setMessageBody('');
    }
  };

  const handleSend = async () => {
    // double-click prevent
    if (sending) return;
    if (!messageBody) return;

    setSending(true);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        // 1. Prepare Message Body
        let finalBody = messageBody;

        // Basic Replacements
        finalBody = finalBody.replace(/{name}/g, recipient.name);
        finalBody = finalBody.replace(/{code}/g, recipient.code);

        // Link Generation (only if needed)
        // Check for both {link} (multiple recipients) and [LINK_INVITO] (single recipient preview)
        if (finalBody.includes('{link}') || finalBody.includes('[LINK_INVITO]')) {
          try {
            const linkData = await api.generateInvitationLink(recipient.id);
            finalBody = finalBody.replace(/{link}/g, linkData.url)
                                 .replace(/\[LINK_INVITO\]/g, linkData.url);
          } catch (e) {
            console.error('Link generation failed for', recipient.name);
            finalBody = finalBody.replace(/{link}/g, '[LINK_ERROR]')
                                 .replace(/\[LINK_INVITO\]/g, '[LINK_ERROR]');
          }
        }

        // 2. Determine Session Type
        const sessionType = recipient.origin === 'bride' ? 'bride' : 'groom';

        // 3. Enqueue (spot message -> non aggiorniamo lo status dell'invito)
        await api.enqueueWhatsAppMessage({
          session_type: sessionType,
          recipient_number: recipient.phone_number,
          message_body: finalBody,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to send to ${recipient.name}`, error);
        failCount++;
      }

      setProgress(prev => ({ ...prev, success: successCount, failed: failCount }));
    }

    setSending(false);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 animate-fadeIn">
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="text-green-600" />
            {t('admin.whatsapp.send_modal.title', { count: recipients.length })}
          </h3>
          {!sending && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          )}
        </div>

        {sending ? (
          <div className="py-8 text-center">
            <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" data-testid="icon-loader" />
            <h4 className="text-lg font-semibold text-gray-800">{t('admin.whatsapp.send_modal.sending_title')}</h4>
            <p className="text-gray-500 mb-4">{t('admin.whatsapp.send_modal.processing', { current: progress.current, total: progress.total })}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-green-600 font-medium">{t('admin.whatsapp.send_modal.sent_count', { count: progress.success })}</span>
              {progress.failed > 0 && <span className="text-red-500 font-medium">{t('admin.whatsapp.send_modal.failed_count', { count: progress.failed })}</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* RECIPIENTS PREVIEW */}
            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 max-h-24 overflow-y-auto">
              <strong>{t('admin.whatsapp.send_modal.recipients_label')}:</strong> {recipients.map(r => r.name).join(', ')}
            </div>

            {/* TEMPLATE SELECTOR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.whatsapp.send_modal.select_template')}</label>
              <select
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                onChange={handleTemplateSelect}
                value={selectedTemplate?.id || ''}
                disabled={loadingTemplates}
              >
                <option value="">{t('admin.whatsapp.send_modal.choose_message')}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* MESSAGE EDITOR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.whatsapp.send_modal.preview_message')}
                {recipients.length > 1 && (
                  <span className="text-xs font-normal text-amber-600 ml-2">
                    {t('admin.whatsapp.send_modal.placeholder_info')}
                  </span>
                )}
              </label>
              <textarea
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                rows={6}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={t('admin.whatsapp.send_modal.textarea_placeholder')}
              />
              <div className="mt-1 flex gap-2 text-xs text-gray-500">
                <span>{t('admin.whatsapp.send_modal.variables')}:</span>
                <code className="bg-gray-100 px-1 rounded">{'{name}'}</code>
                <code className="bg-gray-100 px-1 rounded">{'{code}'}</code>
                <code className="bg-gray-100 px-1 rounded">{'{link}'}</code>
              </div>
            </div>

            {/* WARNINGS */}
            {messageBody.includes('{link}') && recipients.length > 5 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  {t('admin.whatsapp.send_modal.link_warning_1')} <strong>{'{link}'}</strong> {t('admin.whatsapp.send_modal.link_warning_2')}
                </p>
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSend}
                disabled={!messageBody || recipients.length === 0 || loadingTemplates}
                className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} className="mr-2" />
                {t('admin.whatsapp.send_modal.enqueue_button')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendWhatsAppModal;