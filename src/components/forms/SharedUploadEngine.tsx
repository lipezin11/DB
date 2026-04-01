'use client';

import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export type UploadedReference = {
  id: string;
  url: string;
  instruction: string;
};

interface SharedUploadProps {
  references: UploadedReference[];
  onChange: (refs: UploadedReference[]) => void;
  maxFiles?: number;
  title?: string;
  description?: string;
  hideInstructions?: boolean;
}

export function SharedUploadEngine({ 
  references, 
  onChange, 
  maxFiles = 5,
  title = "DNA Base Visual",
  description = "Faça upload de materiais de referência. Obrigatório instruir a IA sobre o que deve ser extraído de cada imagem.",
  hideInstructions = false
}: SharedUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const availableSlots = maxFiles - references.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    const readers = filesToProcess.map(file => {
      return new Promise<UploadedReference>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: Math.random().toString(36).substring(7),
            url: reader.result as string,
            instruction: ''
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newRefs => {
      onChange([...references, ...newRefs]);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeReference = (id: string) => {
    onChange(references.filter(r => r.id !== id));
  };

  const updateInstruction = (id: string, text: string) => {
    onChange(references.map(r => r.id === id ? { ...r, instruction: text } : r));
  };

  return (
    <div className="bg-[#111] backdrop-blur-xl border border-white/5 hover:border-white/10 p-8 rounded-[36px] shadow-2xl space-y-7 transition-colors">
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-500 rounded-full" />
          {title} ({references.length}/{maxFiles})
        </h3>
        {description && <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-4">{description}</p>}
      </div>

      <div className={hideInstructions ? "flex flex-wrap gap-4" : "space-y-6"}>
        {references.map((ref, index) => (
           hideInstructions ? (
             <div key={ref.id} className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in-95 duration-300 shrink-0">
                <img src={ref.url} className="w-full h-full object-cover" alt="Ref" />
                <button 
                   onClick={() => removeReference(ref.id)}
                   className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all font-bold text-[9px] uppercase backdrop-blur-sm"
                >
                   <Trash2 size={20} />
                </button>
                <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-white">#{index + 1}</div>
             </div>
           ) : (
             <div key={ref.id} className="bg-[#151515] border border-white/5 rounded-3xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 shadow-inner">
                <div className="flex items-start gap-5">
                   <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden border border-white/10 relative group shadow-md">
                      <img src={ref.url} className="w-full h-full object-cover" alt="Ref" />
                      <button 
                         onClick={() => removeReference(ref.id)}
                         className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all font-bold text-[10px] uppercase backdrop-blur-sm"
                      >
                         <Trash2 size={24} />
                      </button>
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-black text-white border border-white/10">#{index + 1}</div>
                   </div>
                   <div className="flex-1 flex flex-col pt-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                        O que extrair desta imagem? <span className="text-zinc-600 font-bold">*</span>
                      </label>
                      <textarea 
                         value={ref.instruction}
                         onChange={(e) => updateInstruction(ref.id, e.target.value)}
                         placeholder="Ex: Quero apenas a iluminação avermelhada; Mantenha a textura exata dessa camisa; Use o estilo de traço deste desenho..."
                         className="w-full bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-2xl p-4 text-[12px] text-zinc-200 placeholder-zinc-600 min-h-[85px] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 resize-none transition-all font-medium"
                      />
                   </div>
                </div>
             </div>
           )
        ))}

        {references.length < maxFiles && (
          <button 
             onClick={() => fileInputRef.current?.click()} 
             className="w-full py-10 rounded-3xl border-2 border-dashed border-white/10 bg-[#111] hover:bg-amber-500/10 hover:border-amber-500/40 text-zinc-500 hover:text-amber-500 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-4 group shrink-0"
          >
             <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-amber-500/20 flex items-center justify-center transition-all shadow-md">
                <Plus size={24} className="group-hover:scale-110 transition-transform" />
             </div>
             Inserir Material de Referência Visual
          </button>
        )}
        
        <input type="file" multiple ref={fileInputRef} onChange={handleUpload} hidden accept="image/*" />
      </div>
    </div>
  );
}
