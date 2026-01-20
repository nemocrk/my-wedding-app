import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Euro, Users, Home, Bus, TrendingUp, AlertCircle, FileText, Send, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(t('admin.dashboard.error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [t]);

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.dashboard.loading')}</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  // DATA PREPARATION FOR CHARTS

  // 1. Guests Breakdown
  const guestsData = [
    { name: t('admin.dashboard.guest_categories.adults_confirmed'), value: stats.guests.adults_confirmed, color: '#10B981' },
    { name: t('admin.dashboard.guest_categories.children_confirmed'), value: stats.guests.children_confirmed, color: '#34D399' },
    { name: t('admin.dashboard.guest_categories.adults_pending'), value: stats.guests.adults_pending, color: '#9CA3AF' },
    { name: t('admin.dashboard.guest_categories.children_pending'), value: stats.guests.children_pending, color: '#D1D5DB' },
    { name: t('admin.dashboard.guest_categories.declined'), value: stats.guests.adults_declined + stats.guests.children_declined, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // 2. Invitation Status Data (NEW)
  const invitationStatusData = [
    { name: t('admin.invitations.status.imported'), value: stats.invitations?.imported || 0, color: '#ffffff', icon: FileText },
    { name: t('admin.invitations.status.created'), value: stats.invitations?.created || 0, color: '#9CA3AF', icon: FileText },
    { name: t('admin.invitations.status.sent'), value: stats.invitations?.sent || 0, color: '#3B82F6', icon: Send },
    { name: t('admin.invitations.status.read'), value: stats.invitations?.read || 0, color: '#6366F1', icon: Eye },
    { name: t('admin.invitations.status.confirmed'), value: stats.invitations?.confirmed || 0, color: '#10B981', icon: CheckCircle },
    { name: t('admin.invitations.status.declined'), value: stats.invitations?.declined || 0, color: '#EF4444', icon: XCircle },
  ].filter(d => d.value > 0);

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
          <h1 className="text-2xl font-bold text-gray-800">{t('admin.dashboard.page_title')}</h1>
          <p className="text-sm text-gray-500">{t('admin.dashboard.page_subtitle')}</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('admin.dashboard.kpi.confirmed_guests')} 
          value={stats.guests.adults_confirmed + stats.guests.children_confirmed}
          subValue={t('admin.dashboard.kpi.confirmed_guests_subtitle', { count: stats.guests.children_confirmed })}
          icon={Users}
          bgClass="bg-green-50"
          colorClass="text-green-600"
        />
        <StatCard 
          title={t('admin.dashboard.kpi.estimated_budget')} 
          value={`€ ${stats.financials.estimated_total.toLocaleString()}`}
          subValue={t('admin.dashboard.kpi.estimated_budget_subtitle')}
          icon={TrendingUp}
          bgClass="bg-orange-50"
          colorClass="text-orange-600"
        />
        <StatCard 
          title={t('admin.dashboard.kpi.current_cost')} 
          value={`€ ${stats.financials.confirmed.toLocaleString()}`}
          subValue={t('admin.dashboard.kpi.current_cost_subtitle')}
          icon={Euro}
          bgClass="bg-blue-50"
          colorClass="text-blue-600"
        />
        <StatCard 
          title={t('admin.dashboard.kpi.pending')} 
          value={stats.guests.adults_pending + stats.guests.children_pending}
          subValue={t('admin.dashboard.kpi.pending_subtitle')}
          icon={AlertCircle}
          bgClass="bg-gray-50"
          colorClass="text-gray-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: GUESTS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.dashboard.charts.guests_status')}</h3>
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

        {/* CHART 2: INVITATION STATUS (NEW) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.dashboard.charts.invitation_status')}</h3>
          <div className="space-y-3">
            {invitationStatusData.map((status, idx) => {
              const Icon = status.icon;
              const totalInvitations = invitationStatusData.reduce((sum, s) => sum + s.value, 0);
              const percentage = totalInvitations > 0 ? Math.round((status.value / totalInvitations) * 100) : 0;
              
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></div>
                    <span className="text-sm font-medium text-gray-600">{status.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ width: `${percentage}%`, backgroundColor: status.color }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-800 w-16 text-right">
                    {status.value} <span className="text-xs text-gray-400">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LOGISTICS & FINANCIAL DETAIL TABLE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{t('admin.dashboard.charts.logistics_costs')}</h3>
          
          <div className="flex-1 space-y-6">
            {/* Logistics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Home size={18} className="text-blue-600 mr-2"/>
                  <span className="font-semibold text-blue-900">{t('admin.dashboard.logistics.accommodation')}</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{stats.logistics.accommodation.total_confirmed}</div>
                <div className="text-xs text-blue-600">{t('admin.dashboard.logistics.accommodation_subtitle')}</div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Bus size={18} className="text-purple-600 mr-2"/>
                  <span className="font-semibold text-purple-900">{t('admin.dashboard.logistics.transfer')}</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{stats.logistics.transfer.confirmed}</div>
                <div className="text-xs text-purple-600">{t('admin.dashboard.logistics.transfer_subtitle')}</div>
              </div>
            </div>

            {/* Financial Detail List */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('admin.dashboard.charts.cost_breakdown')}</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600">{t('admin.dashboard.costs.adult_meals', { count: stats.guests.adults_confirmed })}</span>
                  <span className="font-medium">--- €</span> 
                </li>
                 <li className="flex justify-between">
                  <span className="text-gray-600">{t('admin.dashboard.costs.child_meals', { count: stats.guests.children_confirmed })}</span>
                  <span className="font-medium">--- €</span>
                </li>
                <li className="flex justify-between pt-2 border-t border-dashed">
                  <span className="font-bold text-gray-800">{t('admin.dashboard.charts.current_total')}</span>
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
