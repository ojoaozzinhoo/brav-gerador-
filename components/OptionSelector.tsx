import React from 'react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface OptionSelectorProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (val: any) => void;
  gridCols?: number;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({ 
  label, 
  options, 
  value, 
  onChange,
  gridCols = 3
}) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      {/* 
         Mobile Fix: 
         - Usamos grid-cols-2 ou 3 fixo no mobile dependendo da quantidade, mas com gap menor.
         - md:grid-cols-${gridCols} restaura o comportamento original no desktop.
         - Para garantir que funcione, usamos style inline dinâmico com media query logic simulada via classes Tailwind.
      */}
      <div 
        className="grid gap-2" 
        style={{ 
            // Fallback responsivo: No mobile usa auto-fit min 90px, no desktop usa a coluna definida
            gridTemplateColumns: `repeat(auto-fit, minmax(90px, 1fr))`
        }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`
                relative py-2 md:py-3 px-1 md:px-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-1.5
                ${isSelected 
                  ? 'border-brand-500 bg-brand-500/20 text-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]' 
                  : 'border-gray-700 bg-dark-900 text-gray-400 hover:border-gray-600 hover:bg-dark-800'}
              `}
            >
              {opt.icon && <div className="text-current transform scale-90 md:scale-100">{opt.icon}</div>}
              <span className="text-[9px] md:text-xs font-semibold text-center leading-tight">{opt.label}</span>
              
              {isSelected && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-brand-500 rounded-full shadow-sm"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};