import React, { useState } from 'react';
import { Sparkles, BarChart2, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

const STRATEGIES = [
    { code: 'STANDARD', label: 'Standard (Default)' },
    { code: 'SPACE_OPTIMIZER', label: 'Space Optimizer (Tetris)' },
    { code: 'CHILDREN_FIRST', label: 'Children First' },
    { code: 'PERFECT_MATCH', label: 'Perfect Match Only' },
    { code: 'SMALLEST_FIRST', label: 'Smallest First' },
    { code: 'AFFINITY_CLUSTER', label: 'Affinity Cluster' },
];

const AutoAssignStrategyModal = ({ isOpen, onClose, onSuccess, onError }) => {
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
        if (!window.confirm(`Applicare la strategia ${strategyCode}? Le modifiche saranno salvate nel DB.`)) return;
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
                            <h2 className="text-xl font-bold text-gray-800">Arena delle Strategie</h2>
                            <p className="text-sm text-gray-500">Ottimizza l'assegnazione automatica</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'SIMULATE' ? (
                        <div className="text-center py-10 space-y-6">
                            <div className="max-w-md mx-auto">
                                <BarChart2 size={64} className="mx-auto text-purple-200 mb-4" />
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Simulazione Scenari</h3>
                                <p className="text-gray-600 mb-8">
                                    Il sistema eseguirà 6 algoritmi diversi in parallelo per trovare l'incastro migliore. 
                                    Nessuna modifica verrà salvata finché non sceglierai una strategia.
                                </p>
                                <button
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Calcolo in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            Avvia Simulazione (6 Strategie)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-700">Risultati Simulazione</h3>
                                <button 
                                    onClick={() => setStep('SIMULATE')} 
                                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                >
                                    Ricomincia
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
                                                    BEST FIT
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-gray-800">{res.strategy_name}</h4>
                                            </div>

                                            <div className="space-y-2 mb-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Assegnati:</span>
                                                    <span className="font-semibold text-gray-900">{res.assigned_guests} Ospiti</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Non Assegnati:</span>
                                                    <span className={`font-semibold ${res.unassigned_guests > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {res.unassigned_guests}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-t pt-2 mt-2">
                                                    <span className="text-gray-500">Letti Sprecati:</span>
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
                                                {isLoading ? 'Applicando...' : 'Applica Strategia'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend/Info */}
                            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                <p>
                                    L'algoritmo "Letti Sprecati" indica i posti letto liberi in stanze parzialmente occupate. 
                                    Un valore più basso significa un incastro più efficiente (stile Tetris).
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
