import React from 'react';
import { MessageCircle, RotateCcw, Trash2, Send, Edit2 } from 'lucide-react';

const QueueTable = ({ messages, realtimeStatus, onRetry, onForceSend, onDelete, onEdit }) => {
  
  const getStatusBadge = (msg) => {
    // 1. Check Realtime Status (Priority)
    const chatId = `${msg.recipient_number}@c.us`;
    const rt = realtimeStatus[chatId];
    
    // Se c'è un'attività realtime recente (es. ultimi 2 minuti), mostrala
    if (rt) {
        // Mappa stati human-like
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

    // 2. Fallback to DB Status
    const dbMap = {
        'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        'processing': { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
        'sent': { label: 'Sent', color: 'bg-green-100 text-green-800' },
        'failed': { label: 'Failed', title:msg.error_log, color: 'bg-red-100 text-red-800' },
        'skipped': { label: 'Skipped', color: 'bg-gray-100 text-gray-800' }
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

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Msg</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
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
                        <div className="flex justify-center group relative">
                            <MessageCircle className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 cursor-help" />
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10 whitespace-normal text-left">
                                {msg.message}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(msg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(msg.scheduled_for).toLocaleString()}
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
        </div>
      </div>
    </div>
  );
};

export default QueueTable;
