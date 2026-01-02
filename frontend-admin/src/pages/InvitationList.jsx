// frontend-admin/src/pages/InvitationList.jsx
import React from 'react';
import { Plus } from 'lucide-react';

const InvitationList = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Censimento Inviti</h1>
        <button 
          className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
          onClick={() => alert('Modale creazione invito da implementare')}
        >
          <Plus size={20} className="mr-2" />
          Nuovo Invito
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome Invito
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Codice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ospiti
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* TODO: Mappare dati reali qui */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" colSpan="5">
                Nessun invito presente. Clicca su "Nuovo Invito" per iniziare.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvitationList;
