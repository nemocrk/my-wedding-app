import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    // FIX: Aggiunto 'overflow-hidden' per impedire che il body scrolli
    // Garantisce che scrolli SOLO il tag <main> interno
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900">
      {/* Sidebar fissa a sinistra (Desktop) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Area Contenuto Principale */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
        
        {/* Header (visibile su Mobile per il menu, o su Desktop per azioni utente) */}
        <div className="md:hidden">
            <Header />
        </div>

        {/* Qui risiede la scrollbar "interna" corretta */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Outlet è fondamentale per renderizzare le child routes definiti in App.jsx */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
