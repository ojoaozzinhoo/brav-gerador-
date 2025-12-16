import React from 'react';
import { GeneratedImage } from '../types';

interface HistoryBarProps {
  history: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
}

export const HistoryBar: React.FC<HistoryBarProps> = ({ history, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full bg-[#1e1e2e] border border-gray-800 rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">Histórico Recente</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Últimas 4 gerações</span>
        </div>
        
        <div className="h-8 w-px bg-gray-700 mx-2"></div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {history.slice().reverse().map((img) => (
            <button
              key={img.id}
              onClick={() => onSelect(img)}
              className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-700 hover:border-brand-500 transition-all hover:scale-105 hover:shadow-lg hover:shadow-brand-500/20"
              title={`Ver ${img.type}`}
            >
              <img src={img.url} alt="Histórico" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center py-0.5 backdrop-blur-sm">
                {img.type === 'desktop' ? '16:9' : '9:16'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};