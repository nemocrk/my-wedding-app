import React, { useState } from 'react';
import { MessageCircle, RotateCcw, Trash2, Send, Edit2, Clock, CheckCircle } from 'lucide-react';

const QueueTable = ({ messages, realtimeStatus, onRetry, onForceSend, onDelete, onEdit }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });

  const handleMouseEnter = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      content
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const getStatusBadge = (msg) => {
    const chatId = `${msg.recipient_number}@c.us`;
    const rt = realtimeStatus[chatId];
    
    if (rt) {
        const map = {
            'reading': { label: '👀 Reading...', color: 'bg-blue-100 text-blue-800' },
            'waiting_rate': { label: '⏳ Human Wait', color: 'bg-indigo-100 text-indigo-800' },
            'typing': { label: '⌨️ Typing...', color: 'bg-purple-100 text-purple-800' },
            'sending': { label: '🚀 Sending...', color: 'bg-orange-100 text-orange-800' },
            'sent': { label: '✅ Sent (RT)', color: 'bg-green-100 text-green-800' }
        };
        const config = map[rt.status];
        if (config) {
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>{config.label}</span>;
        }
    }

    const dbMap = {
        'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        'processing': { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
        'sent': { label: 'Sent', color: 'bg-green-100 text-green-800' },
        'failed': { label: 'Failed', title:msg.error_log, color: 'bg-red-100 text-red-800' },
        'skipped': { label: 'Skipped', title:msg.error_log, color: 'bg-gray-100 text-gray-800' }
    };
    const config = dbMap[msg.status] || { label: msg.status, color: 'bg-gray-100' };
    return (
      <span 
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${config.color}`} 
        title={config.title || ""} 
        onClick={() => config.title && navigator.clipboard.writeText(config.title)}
      >
        {config.label}
      </span>
    );
  };

  const formatTimings = (msg) => {
    const scheduled = new Date(msg.scheduled_for).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const sent = msg.sent_at 
      ? new Date(msg.sent_at).toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    return (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-3 h-3" />
          <span>{scheduled}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <CheckCircle className="w-3 h-3" />
          <span>{sent}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* --- DESKTOP VIEW (Table) --- */}
      <div className="overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Msg</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timings</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {messages.map((msg) => (
              <tr key={msg.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {msg.recipient_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {msg.session_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div 
                      className="flex justify-center items-center cursor-help p-2"
                      onMouseEnter={(e) => handleMouseEnter(e, msg.message_body)}
                      onMouseLeave={handleMouseLeave}
                    >
                        <MessageCircle className="w-5 h-5 text-gray-400 hover:text-indigo-500" />
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(msg)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatTimings(msg)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {msg.attempts}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                        {msg.status === 'failed' && (
                            <button onClick={() => onRetry(msg.id)} className="text-yellow-600 hover:text-yellow-900" title="Retry">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => onForceSend(msg.id)} className="text-green-600 hover:text-green-900" title="Send Now">
                            <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => onEdit(msg)} className="text-blue-600 hover:text-blue-900" title="Edit">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(msg.id)} className="text-red-600 hover:text-red-900" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MOBILE VIEW (Cards) --- */}
      <div className="md:hidden space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3">
            
            {/* Riga Superiore: Numero e Status */}
            <div className="flex justify-between items-center">
              <span className="font-mono font-medium text-gray-900 text-sm">{msg.recipient_number}</span>
              {getStatusBadge(msg)}
            </div>

            {/* Corpo: Info Sessione e Preview */}
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{msg.session_type}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Attempts: {msg.attempts}</span>
              </div>
              {/* Mostriamo un'anteprima del testo invece del tooltip su mobile */}
              <div className="text-xs bg-slate-50 p-2 rounded italic text-gray-500 line-clamp-2">
                "{msg.message_body}"
              </div>
            </div>

            {/* Footer: Timings e Azioni */}
            <div className="flex justify-between items-end pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                {formatTimings(msg)}
              </div>
              <div className="flex gap-3">
                {msg.status === 'failed' && (
                  <button onClick={() => onRetry(msg.id)} className="text-yellow-600 hover:text-yellow-800" title="Retry">
                    <RotateCcw size={18} />
                  </button>
                )}
                <button onClick={() => onForceSend(msg.id)} className="text-green-600 hover:text-green-800" title="Send Now">
                  <Send size={18} />
                </button>
                <button onClick={() => onEdit(msg)} className="text-blue-600 hover:text-blue-800" title="Edit">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => onDelete(msg.id)} className="text-red-600 hover:text-red-800" title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Position Tooltip (Desktop only) */}
      {tooltip.show && (
        <div 
          className="fixed z-[9999] w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl pointer-events-none hidden md:block"
          style={{ 
            top: tooltip.y - 10,
            left: tooltip.x,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="break-words">{tooltip.content}</div>
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2" 
            style={{ 
                width: 0, 
                height: 0, 
                borderLeft: '6px solid transparent', 
                borderRight: '6px solid transparent', 
                borderTop: '6px solid #111827' 
            }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default QueueTable;
