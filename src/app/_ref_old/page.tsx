'use client';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Plus, Download, Sparkles, Upload, Copy, Palette, Zap, Wand2, Bot, LayoutTemplate, LucideImage, Compass, Maximize, Settings, Paintbrush, SplitSquareHorizontal, Loader2, Fingerprint } from 'lucide-react';
import AppDock from '../_components/AppDock';

type GenImage = { id: string; url: string; prompt: string; dimensions: string; params: any; };
const DB_KEY = 'refBuilder_v1';

export default function RefBuilderPage() {
  const [apiKey, setApiKey] = useState('');
  const [images, setImages] = useState<GenImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeNav, setActiveNav] = useState<'build' | 'gallery'>('build');

  // Standardized State + NEW SPECIALIZED CONFIGS
  const [formData, setFormData] = useState({
    subject: { count: '1', gender: 'masculino', description: '', position: 'centro', photo: null as string | null },
    dimensions: { format: '1:1', text: '' },
    context: { niche: '', environment: '', useScenarioPhoto: false },
    lighting: { ambient: '#0f172a', rim: '#ffffff', fill: '#ffffff' },
    composition: { shotType: 'Plano Médio', floatingElements: true },
    style: { refPhoto: null as string | null, sobriety: 80, activeStyles: ["Minimalista", "Ultra Realista"] as string[], useBlur: true, useSideGradient: false },
    extraPrompt: '',
    // NEW DNA SECTION: Brand
    brandIdentity: {
      colorTheory: 'Complementar',
      targetEra: 'Bauhaus Moderno',
      materials: ['Mármore', 'Vidro'],
      audiencePersona: 'Usuários de Luxo / Tech'
    }
  });

  const subjectRef = useRef<HTMLInputElement>(null);
  const styleRefInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = localStorage.getItem('db_apiKey'); if (k) setApiKey(k);
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setImages(parsed);
      if (parsed.length) setActiveId(parsed[0].id);
    }
  }, []);

  useEffect(() => { if (apiKey) localStorage.setItem('db_apiKey', apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem(DB_KEY, JSON.stringify(images.slice(0, 40))); }, [images]);

  const updateForm = (updater: (prev: typeof formData) => Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updater(prev) }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'subject' | 'ref') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (target === 'subject') updateForm(f => ({ subject: { ...f.subject, photo: res } }));
      if (target === 'ref') updateForm(f => ({ style: { ...f.style, refPhoto: res } }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generate = async () => {
    if (!apiKey) return alert('API Key necessária.');
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          concept: formData.subject.description || formData.context.niche || '',
          graphicStyle: formData.composition.shotType === 'Moodboard' ? 'editorial'
            : formData.composition.shotType === 'Brand Board' ? 'luxury'
            : formData.composition.shotType === 'Layout Grid' ? 'swiss'
            : 'minimalist',
          materials: formData.brandIdentity.materials || [],
          outputType: formData.composition.shotType === 'Moodboard' ? 'moodboard'
            : formData.composition.shotType === 'Brand Board' ? 'brand_identity'
            : 'moodboard',
          proportion: formData.dimensions.format,
          colorDirection: formData.brandIdentity.colorTheory === 'Complementar' ? 'vibrant'
            : formData.brandIdentity.colorTheory === 'Análoga' ? 'warm'
            : formData.brandIdentity.colorTheory === 'Triádica' ? 'vibrant'
            : formData.brandIdentity.colorTheory === 'Monocromática Premium' ? 'monochrome'
            : 'muted',
          era: formData.brandIdentity.targetEra === 'Bauhaus Moderno' ? 'contemporary'
            : formData.brandIdentity.targetEra === 'Art Déco Futurista' ? 'futuristic'
            : formData.brandIdentity.targetEra === 'Swiss Style / Grid' ? 'timeless'
            : formData.brandIdentity.targetEra === 'Memphis Vibrante' ? '90s'
            : 'contemporary',
          targetAudience: formData.brandIdentity.audiencePersona || '',
          keywords: formData.style.activeStyles,
          extraPrompt: formData.extraPrompt,
          refImage: formData.style.refPhoto,
          refInstruction: '',
        }),
      });
      if (!res.ok) throw new Error('Falha na geração');
      const data = await res.json();
      setImages(prev => [{ ...data, params: formData }, ...prev]);
      setActiveId(data.id);
    } catch (e: any) { alert(e.message); } finally { setIsGenerating(false); }
  };

  const stylesGrid = ["Clássico", "Formal", "Elegante", "Sexy", "Institucional", "Tecnológico", "Glassmorphism", "Interface UI", "Minimalista", "Lúdico", "Cartoon", "Infoproduto", "Jovial", "Gamer", "Retrato Profissional", "Ultra Realista", "Glow"];

  const active = images.find(i => i.id === activeId) || images[0];

  return (
    <div className="h-screen bg-[#050505] text-[#e0e0e0] flex flex-col overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#080808]/95 backdrop-blur-2xl z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center shadow-lg"><Compass size={20} className="text-white" /></div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black tracking-widest text-white uppercase italic">Ref Builder AI</span>
            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Neural Moodboard V2</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {['build', 'gallery'].map(v => (
                <button key={v} onClick={() => setActiveNav(v as any)} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeNav === v ? "bg-emerald-600 text-white shadow-xl" : "text-zinc-600 hover:text-white")}>{v === 'build' ? 'Construir' : 'Galeria'}</button>
              ))}
           </div>
           <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key..." className="bg-black/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-white w-48 font-mono focus:outline-none focus:border-emerald-500/30 shadow-inner" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR CONFIGS */}
        {activeNav === 'build' && (
          <aside className="w-[420px] border-r border-white/5 bg-[#080808] flex flex-col overflow-hidden shrink-0 shadow-2xl relative z-10">
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              
              {/* 1. SUJEITO PRINCIPAL */}
              <div className="space-y-6">
                <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-emerald-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Referência de Sujeito</h3></div>
                <div className="space-y-4">
                  <button onClick={() => subjectRef.current?.click()} className="w-full h-32 rounded-3xl bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 transition-all overflow-hidden group">
                    {formData.subject.photo ? <img src={formData.subject.photo} className="w-full h-full object-cover" /> : <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Upload Key Visual</div>}
                  </button>
                  <input ref={subjectRef} type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'subject')} />
                </div>
                <textarea placeholder="Descrição da vibe, materiais ou estética alvo..." value={formData.subject.description} onChange={e => updateForm(f => ({ subject: { ...f.subject, description: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white min-h-[100px] focus:outline-none shadow-inner" />
              </div>

              {/* 2. DIMENSÕES */}
              <div className="space-y-6">
                <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-blue-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Dimensões</h3></div>
                <div className="grid grid-cols-2 gap-2">
                  {['1:1', '4:3', '16:9', '4:5'].map(dim => (
                    <button key={dim} onClick={() => updateForm(f => ({ dimensions: { ...f.dimensions, format: dim } }))} className={cn("py-3 rounded-2xl border transition-all text-[10px] font-black flex flex-col items-center", formData.dimensions.format === dim ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-black/40 border-transparent text-zinc-700")}>
                      <span>{dim}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. PROJETO & CENÁRIO */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-emerald-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Projeto & DNA</h3></div>
                 <div className="space-y-4">
                    <input type="text" placeholder="Conceito (Ex: Cyberpunk Minimal)" value={formData.context.niche} onChange={e => updateForm(f => ({ context: { ...f.context, niche: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-white" />
                 </div>
              </div>

              {/* ────────────────────────────────────────── */}
              {/* NEW SECTION: DNA DA MARCA (Specialized for Ref) */}
              {/* ────────────────────────────────────────── */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-amber-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">DNA da Marca</h3></div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase text-zinc-600">Teoria das Cores</label>
                       <select value={formData.brandIdentity.colorTheory} onChange={e => updateForm(f => ({ brandIdentity: { ...f.brandIdentity, colorTheory: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none">
                          <option>Complementar</option>
                          <option>Análoga</option>
                          <option>Triádica</option>
                          <option>Monocromática Premium</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase text-zinc-600">Era do Design</label>
                       <select value={formData.brandIdentity.targetEra} onChange={e => updateForm(f => ({ brandIdentity: { ...f.brandIdentity, targetEra: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none">
                          <option>Bauhaus Moderno</option>
                          <option>Art Déco Futurista</option>
                          <option>Swiss Style / Grid</option>
                          <option>Memphis Vibrante</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase text-zinc-600">Persona do Público</label>
                       <input type="text" placeholder="Ex: Usuários de Luxo" value={formData.brandIdentity.audiencePersona} onChange={e => updateForm(f => ({ brandIdentity: { ...f.brandIdentity, audiencePersona: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none" />
                    </div>
                 </div>
              </div>

              {/* 4. CORES & ILUMINAÇÃO */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-amber-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Paleta & Iluminação</h3></div>
                 <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'ambient', label: 'Primary' },
                      { key: 'rim', label: 'Accent' },
                      { key: 'fill', label: 'Neutral' },
                    ].map(c => (
                      <div key={c.key} className="space-y-2 text-center">
                        <label className="text-[8px] font-black uppercase text-zinc-700 block h-4">{c.label}</label>
                        <div className="relative w-full aspect-square rounded-2xl border border-white/10 overflow-hidden shadow-lg group"><input type="color" value={(formData.lighting as any)[c.key]} onChange={e => updateForm(f => ({ lighting: { ...f.lighting, [c.key]: e.target.value } }))} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer group-hover:scale-110 transition-transform" /></div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* 5. COMPOSIÇÃO */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-fuchsia-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Layout & Composição</h3></div>
                 <div className="grid grid-cols-1 gap-2">
                    {['Moodboard', 'Brand Board', 'Layout Grid'].map(shot => (
                      <button key={shot} onClick={() => updateForm(f => ({ composition: { ...f.composition, shotType: shot } }))} className={cn("text-left p-4 rounded-2xl border transition-all text-[10px] font-black", formData.composition.shotType === shot ? "bg-fuchsia-600/10 border-fuchsia-500/40 text-fuchsia-400 shadow-lg" : "bg-black/40 border-transparent text-zinc-700 hover:text-white hover:bg-white/5")}>{shot}</button>
                    ))}
                 </div>
              </div>

              {/* 6. REFERÊNCIAS DE ESTILO */}
              <div className="space-y-8">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-pink-500 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Referências Visuais</h3></div>
                 <button onClick={() => styleRefInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-white/10 rounded-3xl bg-black/40 flex flex-col items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-all overflow-hidden group shadow-inner">
                    {formData.style.refPhoto ? <img src={formData.style.refPhoto} className="w-full h-full object-cover rounded-2xl" /> : <><Plus size={20} className="text-zinc-700 group-hover:text-emerald-400"/><span className="text-[10px] font-black uppercase text-zinc-700">Ref Imprint</span></>}
                 </button>
                 <input ref={styleRefInputRef} type="file" hidden accept="image/*" onChange={e => handleImageUpload(e, 'ref')} />
                 
                 <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase">
                        <span className="text-zinc-600">Complexidade</span>
                        <span className="text-white">{formData.style.sobriety}</span>
                        <span className="text-zinc-600">Richness</span>
                    </div>
                    <input type="range" min="0" max="100" value={formData.style.sobriety} onChange={e => updateForm(f => ({ style: { ...f.style, sobriety: parseInt(e.target.value) } }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                 </div>

                 <div className="flex flex-wrap gap-2">
                    {stylesGrid.slice(0,12).map(style => (
                      <button key={style} onClick={() => updateForm(f => ({ style: { ...f.style, activeStyles: f.style.activeStyles.includes(style) ? f.style.activeStyles.filter(s => s !== style) : [...f.style.activeStyles, style] } }))} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border", formData.style.activeStyles.includes(style) ? "bg-emerald-600 text-white border-transparent shadow-lg" : "bg-black/40 border-transparent text-zinc-700 hover:text-zinc-400")}>{style}</button>
                    ))}
                 </div>
              </div>

              {/* 7. PROMPT ADICIONAL */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3"><div className="w-1 h-3.5 bg-zinc-400 rounded-full" /><h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Prompt Adicional</h3></div>
                 <textarea value={formData.extraPrompt} onChange={e => updateForm(f => ({ extraPrompt: e.target.value }))} placeholder="Instruções mestre extras..." className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-[11px] text-white min-h-[140px] shadow-inner" />
              </div>

            </div>
            
            {/* GENERATE ACTION */}
            <div className="p-8 border-t border-white/5 bg-[#0a0a0a]">
               <button onClick={generate} disabled={isGenerating} className="w-full py-7 bg-gradient-to-r from-emerald-500 to-green-600 rounded-[30px] text-[13px] font-black uppercase tracking-[0.4em] text-white shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4">
                  {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <><Sparkles size={22} className="fill-current"/> <span>Materializar Ref</span></>}
               </button>
            </div>
          </aside>
        )}

        {/* MAIN VIEWER */}
        <div className="flex-1 overflow-y-auto bg-black relative p-12 custom-scrollbar">
          {activeNav === 'build' ? (
             <div className="max-w-4xl mx-auto pb-40 relative">
                {isGenerating && (
                  <div className="absolute inset-x-0 top-0 h-[80vh] z-40 flex items-center justify-center pointer-events-none rounded-[60px] overflow-hidden">
                    <div className="neural-scan" />
                    <div className="w-full h-full bg-emerald-500/5 neural-pulse-bg" />
                  </div>
                )}
                {active ? (
                  <div className="space-y-12 animate-in fade-in duration-1000">
                    <div className="relative rounded-[60px] overflow-hidden border border-white/10 shadow-2xl bg-[#080808]">
                      <img src={active.url} className="w-full object-contain max-h-[80vh]" alt="Generated" />
                      <div className="absolute top-8 right-8 flex gap-4">
                         <button className="p-4 bg-black/60 backdrop-blur-xl border border-white/10 text-white rounded-2xl hover:bg-black/80 transition-all shadow-4xl"><Download size={24} /></button>
                      </div>
                    </div>
                    <div className="bg-white/5 p-12 rounded-[50px] border border-white/5">
                       <p className="text-[12px] text-zinc-500 leading-loose italic">{active.prompt}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[70vh] flex flex-col items-center justify-center text-center opacity-20">
                    <Compass size={100} className="mb-10" />
                    <h2 className="text-5xl font-black uppercase italic tracking-tighter">Reference Engine</h2>
                  </div>
                )}
             </div>
          ) : (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-40">
                {images.map(img => (
                  <button key={img.id} onClick={() => { setActiveId(img.id); setActiveNav('build'); }} className="aspect-square rounded-[40px] overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all duration-700 bg-black shadow-3xl">
                    <img src={img.url} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-all" />
                  </button>
                ))}
             </div>
          )}
        </div>
      </div>
      
      <AppDock />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
