import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Euro, Users, Home, Bus, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError("Impossibile caricare le statistiche.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  // DATA PREPARATION FOR CHARTS

  // 1. Guests Breakdown
  const guestsData = [
    { name: 'Adulti Confermati', value: stats.guests.adults_confirmed, color: '#10B981' }, // Green-500
    { name: 'Bambini Confermati', value: stats.guests.children_confirmed, color: '#34D399' }, // Green-400
    { name: 'Adulti In Attesa', value: stats.guests.adults_pending, color: '#9CA3AF' },   // Gray-400
    { name: 'Bambini In Attesa', value: stats.guests.children_pending, color: '#D1D5DB' }, // Gray-300
    { name: 'Declinati', value: stats.guests.adults_declined + stats.guests.children_declined, color: '#EF4444' }, // Red-500
  ].filter(d => d.value > 0);

  // 2. Accommodation Breakdown
  // Confirmed vs Potential (Estimated Total - Confirmed)
  const totalAccPotential = (stats.logistics.accommodation.total_confirmed / (stats.guests.adults_confirmed + stats.guests.children_confirmed || 1)) * (stats.guests.adults_pending + stats.guests.children_pending); 
  // Stima grossolana per il grafico, oppure usiamo i dati se li avessimo passati dettagliati. 
  // Il backend ci passa 'confirmed_adults' ecc.
  
  const logisticsData = [
    { name: 'Alloggio Confermato', value: stats.logistics.accommodation.total_confirmed, color: '#3B82F6' }, // Blue-500
    { name: 'Transfer Confermato', value: stats.logistics.transfer.confirmed, color: '#8B5CF6' }, // Purple-500
  ];

  const StatCard = ({ title, value, subValue, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={colorClass} size={24} />
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Panoramica dello stato del matrimonio</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ospiti Confermati" 
          value={stats.guests.adults_confirmed + stats.guests.children_confirmed}
          subValue={`di cui ${stats.guests.children_confirmed} bambini`}
          icon={Users}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
        <StatCard 
          title="Budget Stimato (Max)" 
          value={`€ ${stats.financials.estimated_total.toLocaleString()}`}
          subValue="Se tutti i pending accettano"
          icon={TrendingUp}
          bgClass="bg-orange-50"
          colorClass="text-orange-600"
        />
        <StatCard 
          title="Costo Attuale (Reale)" 
          value={`€ ${stats.financials.confirmed.toLocaleString()}`}
          subValue="Solo confermati"
          icon={Euro}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
        />
        <StatCard 
          title="In Attesa" 
          value={stats.guests.adults_pending + stats.guests.children_pending}
          subValue="Risposte mancanti"
          icon={AlertCircle}
          bgClass="bg-gray-50"
          colorClass="text-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: GUESTS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Stato Ospiti</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={guestsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {guestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: LOGISTICS & FINANCIAL DETAIL TABLE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Dettaglio Logistica & Costi</h3>
          
          <div className="flex-1 space-y-6">
            {/* Logistics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Home size={18} className="text-blue-600 mr-2"/>
                  <span className="font-semibold text-blue-900">Alloggi</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{stats.logistics.accommodation.total_confirmed}</div>
                <div className="text-xs text-blue-600">Posti letti richiesti</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Bus size={18} className="text-purple-600 mr-2"/>
                  <span className="font-semibold text-purple-900">Transfer</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{stats.logistics.transfer.confirmed}</div>
                <div className="text-xs text-purple-600">Posti bus richiesti</div>
              </div>
            </div>

            {/* Financial Detail List */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Breakdown Costi (Confermati)</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600">Pasti Adulti ({stats.guests.adults_confirmed})</span>
                  <span className="font-medium">--- €</span> 
                  {/* Calcolo lato client se avessimo i prezzi, ma qui mostriamo solo totali aggregati o placeholder se non abbiamo breakdown singoli dal backend */}
                </li>
                 <li className="flex justify-between">
                  <span className="text-gray-600">Pasti Bambini ({stats.guests.children_confirmed})</span>
                  <span className="font-medium">--- €</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-dashed">
                  <span className="font-bold text-gray-800">Totale Attuale</span>
                  <span className="font-bold text-pink-600">€ {stats.financials.confirmed.toLocaleString()}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
