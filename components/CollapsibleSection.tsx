import React, { useState } from 'react';

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  icon, 
  title, 
  children, 
  defaultOpen = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-[#1e1e2e] rounded-xl border border-gray-800 shadow-lg overflow-hidden transition-all duration-300 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-[#1e1e2e] hover:bg-[#252538] transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <span className="text-brand-500 group-hover:text-brand-400 transition-colors">{icon}</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-gray-200">{title}</h3>
        </div>
        <div className={`p-1 rounded-full bg-dark-900 border border-gray-700 transition-all duration-300 ${isOpen ? 'rotate-180 bg-gray-700 text-white' : 'text-gray-500'}`}>
          <svg
            className="w-4 h-4"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Content Area with smooth reveal */}
      {isOpen && (
        <div className="p-5 pt-0 border-t border-gray-800/50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="pt-4 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};