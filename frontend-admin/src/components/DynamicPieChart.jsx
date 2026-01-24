import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../services/api';

// Function to filter unique entries by name
const renderUniqueLegend = (props) => {
  const { payload } = props;

  // Filtra per valori unici basati sul nome (entry.value)
  const uniquePayload = payload.reduce((acc, current) => {
    const x = acc.find(item => item.value === current.value);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  return (
    <ul
      className="recharts-default-legend"
      style={{ padding: 0, margin: 0, textAlign: "center" }}
    >
      {uniquePayload.map((entry, index) => (
        <li
          key={`item-${index}`}
          className="recharts-legend-item"
          style={{ display: "inline-block", marginRight: "10px" }}
        >
          <svg
            className="recharts-surface"
            width="14"
            height="14"
            viewBox="0 0 32 32"
            style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
          >
            <path
              stroke="none"
              fill={entry.color}
              d="M0,4h32v24h-32z"
              className="recharts-legend-icon"
            />
          </svg>
          <span
            className="recharts-legend-item-text"
            style={{ color: entry.color }}
          >
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

const COLORS = {
  groom: '#3B82F6',
  bride: '#EC4899',
  sent: '#10B981',
  confirmed: '#22C55E',
  imported: '#9CA3AF',
  created: '#6B7280',
  read: '#8B5CF6',
  declined: '#EF4444',

  adults: '#0EA5E9',
  children: '#F59E0B',
  accommodation_offered: '#14B8A6',
  accommodation_not_offered: '#64748B',
  accommodation_requested: '#A855F7',
  accommodation_not_requested: '#94A3B8',

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
  const { t, i18n } = useTranslation();
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [availableFilters, setAvailableFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carica i filtri disponibili al mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await api.getDynamicDashboardStats([]); // Query minima per ottenere meta
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

  // Calcolo delle righe dei filtri (NON nello stato, ma calcolato nel corpo del componente o useMemo)
  const filterRows = useMemo(() => {
    if (availableFilters.length === 0) return { row1: [], row2: [] };
    const totalChars = availableFilters.reduce((acc, f) => acc + f.length, 0);
    let currentChars = 0;
    let splitIndex = availableFilters.length;

    for (let i = 0; i < availableFilters.length; i++) {
      currentChars += availableFilters[i].length;
      if (currentChars >= totalChars / 2) {
        splitIndex = i + 1;
        break;
      }
    }
    return {
      row1: availableFilters.slice(0, splitIndex),
      row2: availableFilters.slice(splitIndex)
    };
  }, [availableFilters]);

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

  const formatCurrency = (value) => {
    const locale = i18n?.language || 'it';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })
      .format(Number(value || 0));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload || {};
    const hasTotalCost = typeof data.total_cost !== 'undefined' && data.total_cost !== null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
        <div className="font-semibold text-gray-900 mb-1">{data.name}</div>
        <div className="text-gray-700">
          {t('admin.dashboard.charts.tooltip_people')}: {data.value}
        </div>
        {hasTotalCost && (
          <div className="text-gray-700">
            {t('admin.dashboard.charts.tooltip_total_cost')}: {formatCurrency(data.total_cost)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">

      {/* Filter Selector */}
      {/* 2-Row Filter Selector con scrollbar dinamica */}
      <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex flex-col gap-2 w-max">
          <div className="flex gap-2">
            {filterRows.row1.map(f => (
              <button key={f} onClick={() => toggleFilter(f)} className={`px-1 py-0.5 rounded-full text-xs whitespace-nowrap transition-all ${selectedFilters.includes(f) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {filterRows.row2.map(f => (
              <button key={f} onClick={() => toggleFilter(f)} className={`px-1 py-0.5 rounded-full text-xs whitespace-nowrap transition-all ${selectedFilters.includes(f) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f}</button>
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
            <PieChart width="100%" height="100%">
              {levelsWithAngles.map((levelData, levelIndex) => (
                <Pie
                  key={levelIndex}
                  data={levelData}
                  innerRadius={`${85 - levelIndex * 18}%`}
                  outerRadius={`${100 - levelIndex * 18}%`}
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
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderUniqueLegend} />
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
