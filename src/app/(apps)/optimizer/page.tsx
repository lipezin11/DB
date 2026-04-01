'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Maximize, Download, Settings, FileBox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lightbox } from '@/components/ui/Lightbox';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function OptimizerPage() {
  const [optimizerFile, setOptimizerFile] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedUrl, setOptimizedUrl] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState('image/webp');
  const [originalSize, setOriginalSize] = useState(0);
  const [optimizedSize, setOptimizedSize] = useState(0);
  const optimizerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setOriginalSize(file.size);
    const reader = new FileReader();
    reader.onloadend = () => {
       setOptimizerFile(reader.result as string);
       setOptimizedUrl(null);
       setOptimizedSize(0);
    };
    reader.readAsDataURL(file);
  };

  const optimizeImage = () => {
    if (!optimizerFile) return;
    setIsOptimizing(true);
    const img = new Image();
    img.src = optimizerFile;
    img.onload = () => {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       canvas.width = img.width; canvas.height = img.height;
       ctx.drawImage(img, 0, 0);
       const compressed = canvas.toDataURL(format, quality / 100); 
       
       const base64Length = compressed.length - (compressed.indexOf(',') + 1);
       const padding = (compressed.charAt(compressed.length - 2) === '=') ? 2 : ((compressed.charAt(compressed.length - 1) === '=') ? 1 : 0);
       const fileSizeBytes = (base64Length * 0.75) - padding;

       setTimeout(() => {
          setOptimizedSize(fileSizeBytes);
          setOptimizedUrl(compressed);
          setIsOptimizing(false);
          setLightboxImage(compressed); // Open fullscreen automatically
       }, 800);
    };
  };

  const handleDownload = () => {
    if (!optimizedUrl) return;
    const link = document.createElement('a'); 
    link.href = optimizedUrl; 
    link.download = `optimized-image.jpeg`; 
    link.click();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 bg-black overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl w-full bg-[#050505] border border-white/[0.04] p-8 md:p-12 rounded-[24px] shadow-2xl text-center space-y-8 relative overflow-hidden backdrop-blur-xl">
           <div className="absolute top-0 right-0 w-full h-[1px] bg-white/10" />
           <div className="w-16 h-16 bg-white/[0.03] rounded-xl mx-auto flex items-center justify-center border border-white/5">
              <Maximize size={24} className="text-white"/>
           </div>
           
           <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tighter italic">Forge Optimizer</h2>
              <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[8px]">Precision Image Compression</p>
           </div>
 
           <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
              {/* Left Column: Properties */}
              <div className="flex-1 flex flex-col justify-center gap-5 bg-white/[0.01] p-6 rounded-xl border border-white/[0.04]">
                 <div className="space-y-2 text-left">
                    <label className="text-zinc-600 text-[8px] uppercase font-black tracking-[0.2em]">Output Format</label>
                    <div className="flex gap-1">
                       <button onClick={() => setFormat('image/webp')} className={cn("flex-1 py-2 rounded-md text-[9px] font-black transition-all selector-card", format === 'image/webp' && "active")}>WebP</button>
                       <button onClick={() => setFormat('image/jpeg')} className={cn("flex-1 py-2 rounded-md text-[9px] font-black transition-all selector-card", format === 'image/jpeg' && "active")}>JPEG</button>
                    </div>
                 </div>
 
                 <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                       <label className="text-zinc-600 text-[8px] uppercase font-black tracking-[0.2em]">Quality</label>
                       <span className="text-white font-black text-xs">{quality}%</span>
                    </div>
                    <input type="range" min="1" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-white h-1 bg-white/5 rounded-full appearance-none cursor-pointer" />
                 </div>
 
                 {optimizerFile && (
                    <div className="mt-2 pt-3 border-t border-white/[0.04] space-y-2 font-mono">
                       <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-600 font-bold uppercase tracking-widest">Input</span>
                          <span className="text-zinc-400 font-black">{formatBytes(originalSize)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-600 font-bold uppercase tracking-widest">Output</span>
                          <span className="text-emerald-500 font-black">{optimizedSize > 0 ? formatBytes(optimizedSize) : '---'}</span>
                       </div>
                    </div>
                 )}
              </div>
 
              {/* Right Column: Preview Area */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                 {optimizerFile ? (
                    <div className="relative group w-full aspect-square max-w-[200px]">
                       <img src={optimizedUrl || optimizerFile} className="w-full h-full rounded-xl object-contain bg-black/50 border border-white/[0.08] shadow-2xl" />
                       <div 
                         className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity rounded-xl cursor-pointer"
                         onClick={() => setLightboxImage(optimizedUrl || optimizerFile)}
                       >
                         <Maximize className="text-white w-5 h-5" />
                         <span className="text-[7px] uppercase font-black tracking-widest text-white">Zoom Preview</span>
                       </div>
                    </div>
                 ) : (
                    <button onClick={() => optimizerInputRef.current?.click()} className="w-full py-12 border border-dashed border-white/10 rounded-2xl bg-black/40 cursor-pointer hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-4 group">
                       <Upload size={24} className="text-zinc-700 group-hover:text-white transition-colors"/>
                       <span className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.2em] text-center px-4">Upload Module</span>
                    </button>
                 )}
              </div>
           </div>
           
           <input type="file" ref={optimizerInputRef} onChange={handleImageUpload} hidden accept="image/*" />
           
           <div className="flex gap-3">
             <button 
                onClick={optimizeImage} 
                disabled={isOptimizing || !optimizerFile} 
                className="flex-1 py-5 btn-primary rounded-xl text-xs"
             >
                {isOptimizing ? 'Compressing...' : 'Start Forge'}
             </button>
             {optimizedUrl && (
                <button 
                   onClick={handleDownload} 
                   className="w-16 bg-white/[0.05] border border-white/10 hover:bg-white text-zinc-400 hover:text-black transition-all rounded-xl flex items-center justify-center"
                >
                   <Download size={18}/>
                </button>
             )}
           </div>
        </div>    
       {lightboxImage && (
          <Lightbox 
            image={lightboxImage} 
            onClose={() => setLightboxImage(null)} 
            onDownload={() => {
              const link = document.createElement('a'); 
              link.href = lightboxImage; 
              link.download = `optimized-image.jpeg`; 
              link.click();
            }}
          />
       )}
    </div>
  );
}
