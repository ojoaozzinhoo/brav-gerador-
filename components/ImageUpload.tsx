import React, { useCallback, useState } from 'react';
import { ReferenceImage } from '../types';

interface ImageUploadProps {
  onImagesChange: (images: ReferenceImage[]) => void;
  selectedImages: ReferenceImage[];
  withDescriptions?: boolean; // New prop to enable text inputs per image
  placeholderText?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImagesChange, 
  selectedImages, 
  withDescriptions = false,
  placeholderText = "Adicionar foto"
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Por favor selecione um arquivo de imagem.");
      return;
    }
    
    if (selectedImages.length >= 3) {
      alert("Máximo de 3 imagens permitidas.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type;
      onImagesChange([...selectedImages, { base64, mimeType, description: '' }]);
    };
    reader.readAsDataURL(file);
  }, [selectedImages, onImagesChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
      e.target.value = ''; 
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const updateDescription = (index: number, text: string) => {
    const newImages = [...selectedImages];
    newImages[index].description = text;
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
       
       {/* List Layout with Descriptions (Advanced Mode) */}
       {withDescriptions && selectedImages.length > 0 && (
          <div className="space-y-3 mb-3">
             {selectedImages.map((img, idx) => (
                <div key={idx} className="bg-dark-900 border border-gray-700 rounded-lg p-3 flex gap-3 animate-in fade-in slide-in-from-right-2">
                   {/* Thumbnail */}
                   <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-black group">
                      <img 
                         src={`data:${img.mimeType};base64,${img.base64}`} 
                         alt={`Ref ${idx}`} 
                         className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xs opacity-75">
                         {idx + 1}
                      </div>
                   </div>

                   {/* Description Input */}
                   <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                         <label className="text-[10px] uppercase text-gray-500 font-bold">O que aproveitar desta imagem?</label>
                         <button onClick={() => removeImage(idx)} className="text-gray-500 hover:text-red-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                      </div>
                      <textarea
                         rows={2}
                         className="w-full bg-dark-800 border border-gray-600 rounded p-2 text-xs text-gray-200 focus:border-brand-500 outline-none resize-none placeholder-gray-600"
                         placeholder="Ex: Luz neon, textura de chão, pose..."
                         value={img.description || ''}
                         onChange={(e) => updateDescription(idx, e.target.value)}
                      />
                   </div>
                </div>
             ))}
          </div>
       )}

      {/* Grid Layout (Simple Mode) */}
      {!withDescriptions && selectedImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-dark-800">
              <img 
                src={`data:${img.mimeType};base64,${img.base64}`} 
                alt={`Referência ${idx + 1}`} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-500 text-white rounded-full p-1 shadow-md transition-all transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                title="Remover imagem"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {selectedImages.length < 3 && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer group overflow-hidden
            ${isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-gray-700 bg-dark-800 hover:border-gray-500'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleChange}
          />
          
          <div className="flex flex-col items-center gap-2 py-2">
            <svg className="w-8 h-8 text-gray-500 group-hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <div className="text-sm text-gray-400">
              <span className="text-brand-500 font-medium">{placeholderText}</span> ou arraste
            </div>
            <p className="text-[10px] text-gray-600">
              PNG, JPG até 10MB.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};