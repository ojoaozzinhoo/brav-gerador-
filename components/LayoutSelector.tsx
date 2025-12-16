import React from 'react';
import { SubjectPosition } from '../types';

interface LayoutSelectorProps {
  value: SubjectPosition;
  onChange: (pos: SubjectPosition) => void;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">Posição do Sujeito (Desktop)</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.values(SubjectPosition).map((pos) => {
          const isSelected = value === pos;
          return (
            <button
              key={pos}
              onClick={() => onChange(pos)}
              className={`
                relative h-16 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
                ${isSelected 
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500' 
                  : 'border-gray-700 bg-dark-800 text-gray-400 hover:border-gray-600'}
              `}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Visual Representation of Layout */}
                <div className="w-8 h-5 border border-current rounded-sm flex overflow-hidden bg-opacity-20 bg-current">
                   <div className={`h-full w-3 bg-current ${pos === SubjectPosition.LEFT ? 'mr-auto' : pos === SubjectPosition.RIGHT ? 'ml-auto' : 'mx-auto'}`}></div>
                </div>
                <span className="text-xs font-semibold">{pos}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
        *Versões mobile centralizarão automaticamente o sujeito para garantir responsividade.
      </p>
    </div>
  );
};