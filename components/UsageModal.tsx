import React, { useEffect, useState } from 'react';
import { getSummary, getLogs, resetUsage } from '../services/usageService';
import { UsageSummary, UsageLog } from '../types';
import { useAuth } from '../context/AuthContext';

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsageModal: React.FC<UsageModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
      setLoading(true);
      const s = await getSummary();
      const l = await getLogs();
      setSummary(s);
      setLogs(l);
      setLoading(false);
  };

  const handleReset = async () => {
    if (confirm("Tem certeza que deseja zerar o histórico de consumo?")) {
      await resetUsage();
      loadData();
    }
  };

  const remainingCredits = (user?.image_limit || 0) - (user?.images_generated || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-white">Controle de Uso & Custos</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Credit Limit Cards */}
          <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="bg-gradient-to-br from-brand-900/40 to-dark-900 border border-brand-500/30 p-4 rounded-xl">
                    <span className="text-[10px] text-brand-300 uppercase font-bold tracking-wider">Seu Limite Mensal</span>
                    <div className="text-3xl font-black text-white mt-1">
                        {user?.image_limit || 0} <span className="text-sm font-normal text-gray-400">imagens</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Definido pelo administrador</p>
               </div>
               <div className="bg-dark-900 border border-gray-700 p-4 rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Créditos Restantes</span>
                    <div className={`text-3xl font-black mt-1 ${remainingCredits > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.max(0, remainingCredits)}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                        Geradas: {user?.images_generated || 0}
                    </p>
               </div>
          </div>

          <hr className="border-gray-800 mb-6" />
          
          {/* Summary Cards */}
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Estatísticas Detalhadas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-dark-900 border border-gray-700 p-4 rounded-xl">
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Custo Estimado</span>
               <div className="text-xl font-black text-green-400 mt-1">
                 {loading ? '...' : `R$ ${summary?.estimated_cost_brl.toFixed(2)}`}
               </div>
            </div>
            <div className="bg-dark-900 border border-gray-700 p-4 rounded-xl">
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Geradas</span>
               <div className="text-xl font-black text-white mt-1">
                 {loading ? '...' : summary?.total_images}
               </div>
            </div>
            <div className="bg-dark-900 border border-gray-700 p-4 rounded-xl">
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Refinamentos</span>
               <div className="text-xl font-black text-brand-400 mt-1">
                 {loading ? '...' : summary?.refines_used}
               </div>
            </div>
            <div className="bg-dark-900 border border-gray-700 p-4 rounded-xl">
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tokens Total</span>
               <div className="text-xl font-black text-yellow-500 mt-1">
                 {loading ? '...' : summary?.tokens_total.toLocaleString()}
               </div>
            </div>
          </div>

          {/* Toggle View */}
          <div className="flex items-center gap-2 mb-4 bg-dark-900 w-fit p-1 rounded-lg border border-gray-700">
            <button onClick={() => setViewMode('visual')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Log Visual</button>
            <button onClick={() => setViewMode('json')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'json' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>JSON Output</button>
          </div>

          {loading ? (
             <div className="text-center py-8 text-gray-500 text-xs">Carregando dados do servidor...</div>
          ) : viewMode === 'visual' ? (
             <div className="space-y-2">
                {logs.slice().reverse().map((log) => (
                   <div key={log.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-gray-800 text-sm">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${log.action === 'generate' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                            <span className="font-bold text-white uppercase text-xs">{log.action}</span>
                            <span className="text-xs text-gray-500">{log.resolution}</span>
                         </div>
                         <span className="text-[10px] text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                         <div className="font-mono text-xs text-gray-300">T: {log.tokensInput + log.tokensOutput}</div>
                         <div className="text-xs font-bold text-green-400">R$ {log.cost.toFixed(2)}</div>
                      </div>
                   </div>
                ))}
                {logs.length === 0 && <p className="text-center text-gray-500 py-4 text-xs">Nenhum registro encontrado.</p>}
             </div>
          ) : (
             <div className="relative">
                <pre className="bg-[#11111b] p-4 rounded-lg border border-gray-800 text-[10px] font-mono text-gray-300 overflow-x-auto">
                   {JSON.stringify(summary, null, 2)}
                </pre>
                <p className="text-[10px] text-gray-500 mt-2">*Este JSON é o formato padrão exigido para auditoria do sistema.</p>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-dark-900/50 flex justify-end">
          <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300 px-4 py-2 hover:bg-red-900/20 rounded transition-colors">
            Resetar Dados
          </button>
        </div>
      </div>
    </div>
  );
};