'use client';
import { useState } from 'react';
import { Download, SplitSquareHorizontal, Maximize, Loader2, Bot, Layers, Scissors, ImageOff } from 'lucide-react';
import { useAppContext, GeneratedImage } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Lightbox } from './Lightbox';

interface GalleryV2Props {
  isGenerating: boolean;
  defaultFilter?: string;
  onRefine?: (img: GeneratedImage, instruction?: string, refineRefUrl?: string) => void;
  onConvert?: (img: GeneratedImage) => void;
  onUseAsSubject?: (url: string) => void;
  onUseAsStyle?: (url: string) => void;
}

export function GalleryV2({ 
  isGenerating, 
  defaultFilter = 'all', 
  onRefine, 
  onConvert,
  onUseAsSubject,
  onUseAsStyle
}: GalleryV2Props) {
  const { generatedImages, apiKey, updateGeneratedImage } = useAppContext();
  const [filter, setFilter] = useState<string>(defaultFilter);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);
  const [refineText, setRefineText] = useState('');
  const [extractingLayerId, setExtractingLayerId] = useState<string | null>(null);
  const [extractMode, setExtractMode] = useState<'subject' | 'background' | null>(null);

  // Derive filtered images
  const filteredImages = generatedImages.filter(img => filter === 'all' || img.appType === filter);
  
  // The hero is always the very first image in the filtered list (most recent)
  const heroImage = filteredImages[0];
  // The strip contains the rest
  const historyStrip = filteredImages.slice(1);

  const handleDownload = async (url: string, id: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a'); link.href = url; link.download = `criacao-${id}.png`; link.click();
      } else {
        const response = await fetch(url); const blob = await response.blob(); const bulbUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = bulbUrl; link.download = `criacao-${id}.jpeg`; link.click();
      }
    } catch (e) { window.open(url, '_blank'); }
  };

  const handleConvertClick = async (img: GeneratedImage) => {
    if (!onConvert) return;
    setIsConvertingId(img.id);
    await onConvert(img);
    setIsConvertingId(null);
  };

  const handleExtractLayers = async (img: GeneratedImage, mode: 'subject' | 'background') => {
    if (!apiKey) return alert('API Key do Gemini necessária para extrair camadas.');
    setExtractingLayerId(img.id);
    setExtractMode(mode);
    try {
      if (mode === 'subject') {
        const { removeBackground } = await import('@imgly/background-removal');
        const imageBlob = await removeBackground(img.url);
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageBlob);
        });

        updateGeneratedImage(img.id, { subjectLayerUrl: dataUrl, hasLayers: true });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `camada-sujeito-${img.id}.png`;
        link.click();
      } else {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({ imageUrl: img.url, mode }),
        });
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data = await res.json();
        
        updateGeneratedImage(img.id, { backgroundLayerUrl: data.url, hasLayers: true });
        
        const link = document.createElement('a');
        link.href = data.url;
        link.download = `camada-fundo-${img.id}.png`;
        link.click();
      }
    } catch (e: any) {
      alert(`Falha ao extrair camada: ${e.message}`);
    } finally {
      setExtractingLayerId(null);
      setExtractMode(null);
    }
  };

  return (
    <div className="h-full bg-[#070707] rounded-[50px] border border-white/5 shadow-inner relative overflow-hidden flex flex-col p-8 lg:p-12">
      
      {/* FILTER TOP BAR */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar shrink-0">
        {[{id: 'all', label: 'All History'}, {id: 'design', label: 'Design'}, {id: 'ref', label: 'Ref'}, {id: 'product', label: 'Product'}, {id: 'bg', label: 'Background'}].map((f) => (
          <button
             key={`filter-${f.id}`}
             onClick={() => setFilter(f.id)}
             className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
               filter === f.id ? "bg-white text-black border-transparent shadow-lg" : "bg-black/40 text-zinc-600 border-white/5 hover:text-white"
             )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col gap-10 min-h-0 overflow-y-auto pr-4 custom-scrollbar">
         {/* LOADING OVERLAY */}
         {isGenerating && (
           <div className="absolute top-0 left-0 w-full h-[500px] z-40 bg-black/80 backdrop-blur-md rounded-[48px] flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden">
              <div className="neural-scan" />
              <div className="flex flex-col items-center gap-4 relative z-10">
                 <Loader2 className="w-10 h-10 text-[#a855f7] animate-spin" />
                 <span className="text-white font-black tracking-[0.3em] uppercase text-[10px] animate-pulse">Neural Synchronization...</span>
              </div>
           </div>
         )}

         {/* EMPTY STATE */}
         {(!heroImage && !isGenerating) && (
            <div className="m-auto flex flex-col items-center justify-center p-14 border-4 border-dashed border-white/5 rounded-[60px] bg-black/40">
                <div className="w-28 h-28 bg-[#111] rounded-[40px] flex items-center justify-center mb-10 border border-white/5 shadow-3xl"><Bot size={48} className="text-zinc-800"/></div>
                <h4 className="font-black tracking-[0.4em] text-[#A855F7] text-sm uppercase mb-4 leading-none italic">Aguardando coordenadas</h4>
                <p className="text-[11px] text-zinc-700 font-black uppercase tracking-[0.2em] text-center leading-loose">Selecione os parâmetros e o alvo mestre para materialização.</p>
            </div>
         )}

         {/* HERO CANVAS & HISTORY GRID */}
         {heroImage && (
            <div className="flex flex-col gap-4 shrink-0 px-4 md:px-12 pb-12 items-center w-full">
               
               {/* HERO IMAGE */}
               <div className="w-full max-w-4xl bg-[#030303] rounded-3xl border border-white/5 shadow-2xl relative group overflow-hidden flex items-center justify-center aspect-[4/5] md:aspect-auto md:h-[600px]">
                  <img 
                    src={heroImage.url} 
                    alt="Hero Generation" 
                    className="w-full h-full object-contain cursor-zoom-in transition-transform duration-[2000ms] group-hover:scale-[1.01]"
                    onClick={() => setLightboxImage(heroImage.url)}
                  />
                  
                  {/* HOVER CONTROLS (Top Right) */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                     {onUseAsSubject && (
                        <button onClick={(e) => { e.stopPropagation(); onUseAsSubject(heroImage.url); }} className="px-3 md:px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[9px] md:text-[10px] font-black text-white hover:bg-black uppercase tracking-widest transition-all">Usar Sujeito</button>
                     )}
                     {onUseAsStyle && (
                        <button onClick={(e) => { e.stopPropagation(); onUseAsStyle(heroImage.url); }} className="px-3 md:px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[9px] md:text-[10px] font-black text-white hover:bg-black uppercase tracking-widest transition-all">Usar Estilo</button>
                     )}
                     {!heroImage.isVertical && onConvert && (
                        <button onClick={(e) => { e.stopPropagation(); handleConvertClick(heroImage); }} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-black transition-all">
                           {isConvertingId === heroImage.id ? <Loader2 size={16} className="animate-spin" /> : <SplitSquareHorizontal size={16}/>}
                        </button>
                     )}
                     <button onClick={(e) => { e.stopPropagation(); setLightboxImage(heroImage.url); }} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-black transition-all">
                        <Maximize size={16} />
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handleDownload(heroImage.url, heroImage.id); }} className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-all">
                        <Download size={16} />
                     </button>
                  </div>
               </div>

               {/* HISTORY THUMBNAILS GRID */}
               {historyStrip.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 w-full max-w-4xl">
                     {historyStrip.slice(0, 4).map((img) => (
                        <div 
                           key={`hist-${img.id}`} 
                           className="relative w-full aspect-[4/5] md:aspect-[5/4] rounded-2xl border border-white/5 overflow-hidden group cursor-pointer bg-[#050505] shadow-xl transition-all hover:border-white/20"
                           onClick={() => setLightboxImage(img.url)}
                        >
                           <img src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 hover:scale-110 grayscale group-hover:grayscale-0" alt="History" />
                        </div>
                     ))}
                  </div>
               )}

               {/* MINIMAL REFINE BAR */}
               <div className="mt-2 flex items-center justify-between gap-4 bg-[#0a0a0a] border border-white/5 rounded-[28px] p-2 pl-6 shadow-2xl transition-all focus-within:border-white/10 w-full max-w-4xl">
                  <input 
                     type="text"
                     placeholder="Instruções de ajuste localizado ou estilo..."
                     value={refineText}
                     onChange={(e) => setRefineText(e.target.value)}
                     className="flex-1 bg-transparent text-[13px] text-white placeholder-zinc-600 focus:outline-none placeholder:font-medium font-medium"
                     onKeyDown={(e) => {
                        if(e.key === 'Enter' && refineText.trim()) {
                           if(onRefine) onRefine(heroImage, refineText);
                           setRefineText('');
                        }
                     }}
                  />
                  <button 
                     onClick={() => {
                        if (onRefine && refineText.trim()) onRefine(heroImage, refineText);
                        setRefineText('');
                     }} 
                     className="px-8 py-3 md:py-4 bg-[#222] hover:bg-[#333] text-zinc-300 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-[20px] transition-all flex items-center justify-center active:scale-95"
                  >
                     REFINAR
                  </button>
               </div>

               {/* PHOTOSHOP KILLER — LAYER EXTRACTION PANEL */}
               <div className="w-full max-w-4xl bg-[#080808] border border-white/5 rounded-[24px] p-5 space-y-4">
                  <div className="flex items-center gap-2">
                     <Layers size={14} className="text-[#a855f7]" />
                     <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Extraction Studio — Separar Camadas</span>
                     {heroImage.hasLayers && (
                        <span className="ml-auto text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">Camadas prontas</span>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     {/* Extract Subject */}
                     <button
                        disabled={extractingLayerId === heroImage.id}
                        onClick={() => handleExtractLayers(heroImage, 'subject')}
                        className="flex items-center gap-3 p-4 bg-black border border-white/10 hover:border-[#a855f7]/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {extractingLayerId === heroImage.id && extractMode === 'subject'
                           ? <Loader2 size={18} className="text-[#a855f7] animate-spin shrink-0" />
                           : <Scissors size={18} className="text-zinc-500 group-hover:text-[#a855f7] transition-colors shrink-0" />
                        }
                        <div className="text-left">
                           <p className="text-[11px] font-black text-white tracking-wide">Extrair Sujeito</p>
                           <p className="text-[9px] text-zinc-600 mt-0.5">Pessoa/produto em fundo branco</p>
                        </div>
                        {heroImage.subjectLayerUrl && (
                           <div className="ml-auto w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                              <img src={heroImage.subjectLayerUrl} className="w-full h-full object-cover" alt="Layer" />
                           </div>
                        )}
                     </button>

                     {/* Extract Background */}
                     <button
                        disabled={extractingLayerId === heroImage.id}
                        onClick={() => handleExtractLayers(heroImage, 'background')}
                        className="flex items-center gap-3 p-4 bg-black border border-white/10 hover:border-blue-500/40 rounded-2xl transition-all group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {extractingLayerId === heroImage.id && extractMode === 'background'
                           ? <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" />
                           : <ImageOff size={18} className="text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                        }
                        <div className="text-left">
                           <p className="text-[11px] font-black text-white tracking-wide">Extrair Fundo</p>
                           <p className="text-[9px] text-zinc-600 mt-0.5">Cenário limpo, sujeito removido</p>
                        </div>
                        {heroImage.backgroundLayerUrl && (
                           <div className="ml-auto w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                              <img src={heroImage.backgroundLayerUrl} className="w-full h-full object-cover" alt="Layer" />
                           </div>
                        )}
                     </button>
                  </div>

                  {/* Download cached layers if already extracted */}
                  {heroImage.hasLayers && (
                     <div className="flex gap-3 pt-1">
                        {heroImage.subjectLayerUrl && (
                           <button onClick={() => handleDownload(heroImage.subjectLayerUrl!, `sujeito-${heroImage.id}`)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/20 rounded-xl text-[10px] font-black text-[#a855f7] uppercase tracking-widest transition-all">
                              <Download size={12} /> PNG Sujeito
                           </button>
                        )}
                        {heroImage.backgroundLayerUrl && (
                           <button onClick={() => handleDownload(heroImage.backgroundLayerUrl!, `fundo-${heroImage.id}`)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest transition-all">
                              <Download size={12} /> PNG Fundo
                           </button>
                        )}
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>

      {lightboxImage && (
         <Lightbox 
           image={lightboxImage} 
           onClose={() => setLightboxImage(null)} 
           onDownload={() => handleDownload(lightboxImage, 'lightbox')}
         />
      )}
    </div>
  );
}
