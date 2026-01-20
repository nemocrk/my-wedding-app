import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api } from '../services/api';

const COLORS = {
  groom: '#3B82F6',
  bride: '#EC4899',
  sent: '#10B981',
  confirmed: '#22C55E',
  imported: '#9CA3AF',
  created: '#6B7280',
  read: '#8B5CF6',
  declined: '#EF4444',
  other: '#D1D5DB'
};

const getColorForKey = (key) => {
  // Cerca il colore nella mappa, altrimenti genera un colore casuale
  if (COLORS[key]) return COLORS[key];
  
  // Per le label custom o combinazioni, usa hash del nome
  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

const DynamicPieChart = () => {
  const [selectedFilters, setSelectedFilters] = useState(['groom', 'sent']);
  const [chartData, setChartData] = useState(null);
  const [availableFilters, setAvailableFilters] = useState({ origins: [], statuses: [], labels: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carica i filtri disponibili al mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await api.getDynamicDashboardStats(['groom']); // Query minima per ottenere meta
        if (data.meta && data.meta.available_filters) {
          setAvailableFilters(data.meta.available_filters);
        }
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    };
    loadFilters();
  }, []);

  // Carica i dati del chart quando cambiano i filtri
  useEffect(() => {
    if (selectedFilters.length === 0) {
      setChartData(null);
      return;
    }

    const loadChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getDynamicDashboardStats(selectedFilters);
        setChartData(data);
      } catch (err) {
        setError(err.message);
        console.error('Error loading chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [selectedFilters]);

  const toggleFilter = (filter) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  // Calcola gli angoli per l'allineamento dei livelli
  const calculateAngles = () => {
    if (!chartData || !chartData.levels || chartData.levels.length === 0) return [];

    const levels = [];
    const total = chartData.meta.total;

    chartData.levels.forEach((levelNodes, levelIndex) => {
      const levelData = [];
      let currentAngle = 0;

      if (levelIndex === 0) {
        // Level 1: distribuzione semplice
        levelNodes.forEach(node => {
          const percentage = node.value / total;
          const angleSize = percentage * 360;
          
          levelData.push({
            ...node,
            startAngle: currentAngle,
            endAngle: currentAngle + angleSize,
            fill: getColorForKey(node.name)
          });
          
          currentAngle += angleSize;
        });
      } else {
        // Level 2+: allinea ai parent
        const parentLevel = levels[levelIndex - 1];
        
        levelNodes.forEach(node => {
          const parent = parentLevel[node.parent_idx];
          if (!parent) return;

          // Calcola la porzione del parent che questo nodo occupa
          const parentNodes = levelNodes.filter(n => n.parent_idx === node.parent_idx);
          const parentTotal = parentNodes.reduce((sum, n) => sum + n.value, 0);
          const percentage = node.value / parentTotal;
          
          // Se è il primo figlio, inizia dall'angolo del parent
          if (!parent._childAngle) {
            parent._childAngle = parent.startAngle;
          }
          
          const angleSize = (parent.endAngle - parent.startAngle) * percentage;
          
          levelData.push({
            ...node,
            startAngle: parent._childAngle,
            endAngle: parent._childAngle + angleSize,
            fill: getColorForKey(node.name)
          });
          
          parent._childAngle += angleSize;
        });
      }

      levels.push(levelData);
    });

    return levels;
  };

  const levelsWithAngles = calculateAngles();

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Pie Chart Dinamico Multi-Livello</h3>
      
      {/* Filter Selector */}
      <div className="mb-6 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">Origin:</p>
          <div className="flex flex-wrap gap-2">
            {availableFilters.origins.map(origin => (
              <button
                key={origin}
                onClick={() => toggleFilter(origin)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedFilters.includes(origin)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {origin}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">Status:</p>
          <div className="flex flex-wrap gap-2">
            {availableFilters.statuses.map(status => (
              <button
                key={status}
                onClick={() => toggleFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedFilters.includes(status)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">Labels:</p>
          <div className="flex flex-wrap gap-2">
            {availableFilters.labels.map(label => (
              <button
                key={label}
                onClick={() => toggleFilter(label)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedFilters.includes(label)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {loading && <div className="text-center text-gray-500 py-8">Caricamento...</div>}
      {error && <div className="text-center text-red-500 py-8">Errore: {error}</div>}
      
      {!loading && !error && levelsWithAngles.length > 0 && (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {levelsWithAngles.map((levelData, levelIndex) => (
                <Pie
                  key={levelIndex}
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40 + levelIndex * 60}
                  outerRadius={90 + levelIndex * 60}
                  dataKey="value"
                  startAngle={0}
                  endAngle={360}
                >
                  {levelData.map((entry, index) => (
                    <Cell 
                      key={`cell-${levelIndex}-${index}`} 
                      fill={entry.fill}
                      startAngle={entry.startAngle}
                      endAngle={entry.endAngle}
                    />
                  ))}
                </Pie>
              ))}
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !error && selectedFilters.length === 0 && (
        <div className="text-center text-gray-500 py-8">Seleziona almeno un filtro per visualizzare il grafico</div>
      )}
    </div>
  );
};

export default DynamicPieChart;
