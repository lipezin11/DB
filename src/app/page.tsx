'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Compass, ImageIcon, Box, Sparkles, Minimize, ArrowRight, Upload, Loader2, Copy, X, Brain, Globe, Plus } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomeDashboard() {
  const { apiKey } = useAppContext();
  const [activeExtractor, setActiveExtractor] = useState<string | null>(null);

  const agents = [
    { id: 'design', href: '/design', label: 'Design Builder', icon: Compass, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Create posts, carousels, and ads from scratch.' },
    { id: 'ref', href: '/ref', label: 'Ref Builder', icon: ImageIcon, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Surgical design replication from your references.' },
    { id: 'product', href: '/product', label: 'Product Builder', icon: Box, color: 'text-sky-500', bg: 'bg-sky-500/10', desc: 'Cinema-grade product photography for commerce.' },
    { id: 'bg', href: '/bg', label: 'Easy Background', icon: Sparkles, color: 'text-yellow-500', bg: 'bg-yellow-500/10', desc: 'Dynamic scenario generation with lighting sync.' },
    { id: 'optimizer', href: '/optimizer', label: 'Optimize DNA', icon: Minimize, color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'Optical-fidelity compression for master assets.' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white font-sans flex flex-col relative overflow-hidden pb-40">
      
      <div className="max-w-6xl mx-auto py-16 px-6 md:pl-32 lg:pl-40 w-full">
        
        {/* HERO */}
        <div className="space-y-6 mb-24 animate-fade-up">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rotate-45 bg-white" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Creative Ecosystem</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
             Bem vindo, <span className="text-zinc-500">Easy Designer</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium tracking-tight max-w-xl">
             Explore o núcleo criativo. Seus Agentes especializados estão prontos para a geração cirúrgica.
          </p>
        </div>

        {/* AGENTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {agents.map((app, i) => (
            <Link key={app.id} href={app.href} className="group">
              <div className="bg-white/[0.02] border border-white/[0.03] p-10 h-[280px] flex flex-col justify-between transition-all duration-500 hover:bg-white/[0.04] hover:border-white/10 rounded-[40px] relative overflow-hidden">
                <div className="space-y-8 relative z-10">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", app.bg)}>
                    <app.icon size={24} className={app.color} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black tracking-tight text-white">{app.label}</h3>
                    <p className="text-[11px] text-zinc-600 font-semibold leading-relaxed line-clamp-3">
                       {app.desc}
                    </p>
                  </div>
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 group-hover:text-white transition-colors flex items-center gap-2 relative z-10 translate-y-2 group-hover:translate-y-0 duration-500">
                    OPEN <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* EXTRACTOR NEXUS SECTION */}
        <div className="pt-20 border-t border-white/[0.03]">
           <div className="flex items-center justify-between mb-12">
              <div className="space-y-2 text-left">
                <h2 className="text-3xl font-black tracking-tighter uppercase text-white tracking-[0.2em]">Neural Extractor Nexus</h2>
                <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest leading-relaxed">Reverse engineering for master prompts. Professional specialized extraction.</p>
              </div>
              <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-full">
                 <Brain size={14} className="text-zinc-400"/>
                 <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Active Neural Link</span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ExtractorCard mode="art" label="Extract Art" desc="Creatives & Ads Logic" icon={ImageIcon} />
              <ExtractorCard mode="design" label="Extract Design" desc="General Purpose Precision" icon={Compass} />
              <ExtractorCard mode="bg" label="Extract BG" desc="Scenario & Scenery Details" icon={Sparkles} />
              <ExtractorCard mode="ref" label="Extract Ref" desc="Neural Fusion (2+ Images)" icon={Globe} requireMulti />
           </div>
        </div>

      </div>
    </div>
  );
}

function ExtractorCard({ mode, label, desc, icon: Icon, requireMulti = false }: { mode: string, label: string, desc: string, icon: any, requireMulti?: boolean }) {
  const { apiKey } = useAppContext();
  const [images, setImages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => requireMulti ? [...prev, reader.result as string] : [reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = async () => {
    if (!apiKey) return alert('API Key required.');
    if (images.length === 0) return alert('Upload imaging data.');
    if (requireMulti && images.length < 2) return alert('Fusion requires 2+ images.');

    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ images, mode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.prompt);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="bg-white/[0.01] border border-white/[0.05] p-6 rounded-[32px] flex flex-col gap-6 group hover:border-white/10 transition-all">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0"><Icon size={16} className="text-zinc-400"/></div>
          <div className="flex flex-col">
             <span className="text-[12px] font-black tracking-tight text-white">{label}</span>
             <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">{desc}</span>
          </div>
       </div>

       <div className="space-y-4">
          <div 
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square bg-black border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] hover:border-white/20 transition-all overflow-hidden relative"
          >
             {images.length > 0 ? (
               <div className="grid grid-cols-2 gap-1 p-2 w-full h-full">
                  {images.map((img, i) => (
                    <img key={i} src={img} className="w-full h-full object-cover rounded-lg" />
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); setImages([]); setResult(null); }} className="absolute top-2 right-2 bg-black/80 p-1.5 rounded-full text-white ring-1 ring-white/10"><X size={10}/></button>
               </div>
             ) : (
               <div className="flex flex-col items-center gap-2">
                 <Upload size={20} className="text-zinc-600 group-hover:translate-y-[-2px] transition-transform" />
                 <span className="text-[7.5px] font-black uppercase text-zinc-600 tracking-[0.2em]">{requireMulti ? 'Fusion 2+' : 'Drop Asset'}</span>
               </div>
             )}
             <input ref={fileRef} type="file" hidden multiple={requireMulti} onChange={handleUpload} />
          </div>

          <button 
             onClick={handleExtract}
             disabled={isExtracting || images.length === 0}
             className="w-full h-11 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
             {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14}/>}
             {isExtracting ? 'Extracting...' : 'Initiate'}
          </button>
       </div>

       <AnimatePresence>
          {result && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 relative group-inner"
            >
               <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mb-3 line-clamp-4 italic">{result}</p>
               <button onClick={() => { navigator.clipboard.writeText(result); alert('Prompt Saved!'); }} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors">
                  <Copy size={10}/><span className="text-[7px] font-black uppercase tracking-widest">DNA Saved</span>
               </button>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
