import React, { useState } from 'react';
import { Sparkles, BarChart2, CheckCircle, AlertTriangle, X, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

const STRATEGIES = [
    { code: 'STANDARD', label: 'Standard (Default)' },
    { code: 'SPACE_OPTIMIZER', label: 'Space Optimizer (Tetris)' },
    { code: 'CHILDREN_FIRST', label: 'Children First' },
    { code: 'PERFECT_MATCH', label: 'Perfect Match Only' },
    { code: 'SMALLEST_FIRST', label: 'Smallest First' },
    { code: 'AFFINITY_CLUSTER', label: 'Affinity Cluster' },
];

const AutoAssignStrategyModal = ({ isOpen, onClose, onSuccess, onError }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState('SIMULATE'); // SIMULATE | RESULTS
    const [isLoading, setIsLoading] = useState(false);
    const [simResults, setSimResults] = useState([]);

    if (!isOpen) return null;

    const runSimulation = async () => {
        setIsLoading(true);
        try {
            // Trigger auto-assign in SIMULATION mode
            const response = await api.triggerAutoAssign(true, 'SIMULATION');
            setSimResults(response.results);
            setStep('RESULTS');
        } catch (err) {
            onError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const applyStrategy = async (strategyCode) => {
        if (!window.confirm(t('admin.accommodations.auto_assign_modal.results.confirm_apply', { strategy: strategyCode }))) return;
        setIsLoading(true);
        try {
            const response = await api.triggerAutoAssign(true, strategyCode);
            onSuccess(response.result);
            onClose();
        } catch (err) {
            onError(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{t('admin.accommodations.auto_assign_modal.title')}</h2>
                            <p className="text-sm text-gray-500">{t('admin.accommodations.auto_assign_modal.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'SIMULATE' ? (
                        <div className="text-center py-10 space-y-6">
                            <div className="max-w-md mx-auto">
                                <BarChart2 size={64} className="mx-auto text-purple-200 mb-4" />
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('admin.accommodations.auto_assign_modal.simulation.title')}</h3>
                                <p className="text-gray-600 mb-8">
                                    {t('admin.accommodations.auto_assign_modal.simulation.description')}
                                </p>
                                <button
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader className="animate-spin h-5 w-5 text-white" />
                                            {t('common.loading')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            {t('admin.accommodations.auto_assign_modal.simulation.start_button')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-700">{t('admin.accommodations.auto_assign_modal.results.title')}</h3>
                                <button 
                                    onClick={() => setStep('SIMULATE')} 
                                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                >
                                    {t('admin.accommodations.auto_assign_modal.simulation.restart')}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {simResults.map((res, idx) => {
                                    const isBest = idx === 0; // Results are sorted by backend
                                    return (
                                        <div 
                                            key={res.strategy_code} 
                                            className={`relative border rounded-xl p-5 transition-all hover:shadow-lg ${
                                                isBest ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            {isBest && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                                                    <Sparkles size={12} />
                                                    {t('admin.accommodations.auto_assign_modal.results.best_fit')}
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-gray-800">{res.strategy_name}</h4>
                                            </div>

                                            <div className="space-y-2 mb-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('admin.accommodations.auto_assign_modal.results.assigned')}:</span>
                                                    <span className="font-semibold text-gray-900">{res.assigned_guests} {t('admin.accommodations.auto_assign_modal.results.guests')}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('admin.accommodations.auto_assign_modal.results.unassigned')}:</span>
                                                    <span className={`font-semibold ${res.unassigned_guests > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {res.unassigned_guests}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-t pt-2 mt-2">
                                                    <span className="text-gray-500">{t('admin.accommodations.auto_assign_modal.results.wasted_beds')}:</span>
                                                    <span className="font-bold text-orange-600">{res.wasted_beds}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => applyStrategy(res.strategy_code)}
                                                disabled={isLoading}
                                                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                                                    isBest 
                                                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                }`}
                                            >
                                                {isLoading ? t('common.loading') : t('admin.accommodations.auto_assign_modal.results.apply_button')}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend/Info */}
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                <p>
                                    {t('admin.accommodations.auto_assign_modal.results.wasted_beds_info')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoAssignStrategyModal;
