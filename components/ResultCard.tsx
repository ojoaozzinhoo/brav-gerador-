import React from 'react';
import { GeneratedImage } from '../types';

interface ResultCardProps {
  data: GeneratedImage | null;
  title: string;
  aspectRatioClass: string;
  placeholderText: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, title, aspectRatioClass, placeholderText }) => {
  const handleDownload = () => {
    if (data?.url) {
      const link = document.createElement('a');
      link.href = data.url;
      link.download = `elementor-bg-${data.type}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
        {data?.url && !data.loading && (
          <button 
            onClick={handleDownload}
            className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1 rounded transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Baixar
          </button>
        )}
      </div>
      
      <div className={`relative w-full ${aspectRatioClass} bg-dark-900 rounded-lg border border-gray-800 overflow-hidden group`}>
        {data?.loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
            <span className="text-xs text-brand-500 animate-pulse">Renderizando Nano Banana Pro...</span>
          </div>
        ) : data?.url ? (
          <>
            <img 
              src={data.url} 
              alt={title} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <p className="text-white text-xs">Pronto para Elementor</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 p-6 text-center border-2 border-transparent">
             <p className="text-sm">{placeholderText}</p>
          </div>
        )}
      </div>
    </div>
  );
};