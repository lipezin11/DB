'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Compass, Wand2, ImageIcon, Plus, X, User, Camera,
  Image as LucideImage, Zap, LayoutTemplate, Paintbrush, Menu, Settings, MessageSquare, Download, Play, SplitSquareHorizontal, Check, Smartphone, Monitor, Square, SquareUser as Portrait, PaintBucket as FillDrip, Sparkles, Sun, Home, Layers, Filter, Maximize, Copy, ChevronDown, ChevronUp, Bot, Send, Upload, Paperclip, Loader2, Info
} from 'lucide-react';

// ──────────────────────────────────────────
// Types & Initial Data
// ──────────────────────────────────────────

type ViewType = 'home' | 'build' | 'gallery' | 'optimizer' | 'config';
type AppType = 'design' | 'art' | 'bg' | 'ref';
type ChatMode = 'general' | 'extract-art' | 'extract-bg' | 'extract-design' | 'extract-ref';

const initialFormData = {
  subject: { count: '1', gender: 'masculino', description: '', position: 'centro', photo: null as string | null },
  dimensions: { format: '1:1', text: '' },
  context: { niche: '', environment: '', useScenarioPhoto: false },
  lighting: { ambient: '#0f172a', rim: '#ffffff', fill: '#ffffff' },
  composition: { shotType: 'Plano Médio', floatingElements: false },
  style: { refPhoto: null as string | null, sobriety: 20, activeStyles: [] as string[], useBlur: true, useSideGradient: false },
  extraPrompt: '',
};

// ──────────────────────────────────────────
// Components
// ──────────────────────────────────────────

const SectionTitle = ({ title, colorClass }: { title: string, colorClass: string }) => (
  <div className="flex items-center gap-2 mb-4 group">
    <div className={cn("w-1 h-3.5 rounded-full group-hover:scale-y-125 transition-transform", colorClass)} />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4d4d4] group-hover:text-white transition-colors">{title}</h3>
  </div>
);

// ──────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────

export default function DesignBuilderDashboard() {
  const [currentView, setCurrentView] = useState<ViewType>('build');
  const [activeApp, setActiveApp] = useState<AppType>('design');
  
  // App states
  const [appStates, setAppStates] = useState<Record<AppType, typeof initialFormData>>({
    design: { ...initialFormData },
    art: { ...initialFormData },
    bg: { ...initialFormData, dimensions: { format: '16:9', text: '' } }, 
    ref: { ...initialFormData }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [refineModal, setRefineModal] = useState<{isOpen: boolean, image: any, instruction: string}>({isOpen: false, image: null, instruction: ''});
  const [isRefining, setIsRefining] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);

  const styleRefInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const optimizerInputRef = useRef<HTMLInputElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [chatAgentsOpen, setChatAgentsOpen] = useState(false);
  const [chatImages, setChatImages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // INDEPENDENT CHAT HISTORIES
  const [chatHistories, setChatHistories] = useState<Record<ChatMode, {role: 'user' | 'assistant', content: string}[]>>({
    general: [], 'extract-art': [], 'extract-bg': [], 'extract-design': [], 'extract-ref': []
  });
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [optimizerFile, setOptimizerFile] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedUrl, setOptimizedUrl] = useState<string | null>(null);

  // Form State Management
  const formData = appStates[activeApp];
  const updateForm = (updater: (prev: typeof initialFormData) => Partial<typeof initialFormData>) => {
    setAppStates(prev => ({
      ...prev,
      [activeApp]: { ...prev[activeApp], ...updater(prev[activeApp]) }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'subject' | 'ref' | 'chat' | 'optimizer') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'ref' && activeApp === 'ref') {
      const readers = Array.from(files).slice(0, 3).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(images => {
        updateForm(f => ({ style: { ...f.style, refPhoto: images[0] } }));
      });
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
       const res = reader.result as string;
       if (target === 'subject') updateForm(() => ({ subject: { ...formData.subject, photo: res } }));
       if (target === 'ref') updateForm(() => ({ style: { ...formData.style, refPhoto: res } }));
       if (target === 'chat') setChatImages([res]);
       if (target === 'optimizer') { setOptimizerFile(res); setOptimizedUrl(null); }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!apiKey) return alert('API Key Gemini necessária.');
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          subject: {
            gender: formData.subject.gender === 'masculino' ? 'Masculino' : 'Feminino',
            count: formData.subject.count,
            photo: formData.subject.photo,
            photos: formData.subject.photo ? [formData.subject.photo] : [],
            description: formData.subject.description,
            position: formData.subject.position,
          },
          context: {
            niche: formData.context.niche,
            environment: formData.context.environment,
          },
          composition: {
            framing: formData.composition.shotType,
            floatingElements: formData.composition.floatingElements ? 'elementos flutuantes temáticos do nicho' : '',
          },
          lighting: {
            rim: formData.lighting.rim,
            fill: formData.lighting.fill,
            ambient: formData.lighting.ambient,
          },
          style: {
            sobriety: formData.style.sobriety,
            blur: formData.style.useBlur,
            gradient: formData.style.useSideGradient,
            refImage: formData.style.refPhoto,
            extraPrompt: formData.extraPrompt,
            visualStyle: formData.style.activeStyles[0] || null,
          },
          dimensions: formData.dimensions.format,
        })
      });
      if (!response.ok) throw new Error('Generation failed');
      const newImage = await response.json();
      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (error: any) {
      alert(error.message || 'Erro na geração.');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const submitRefinement = async () => {
    if (!refineModal.image || !refineModal.instruction) return;
    setIsRefining(true);
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ originalPrompt: refineModal.image.prompt, instructions: refineModal.instruction })
      });
      if (!response.ok) throw new Error('Refine failed');
      const newImage = await response.json();
      setGeneratedImages(prev => [newImage, ...prev]);
      setRefineModal({isOpen: false, image: null, instruction: ''});
    } catch (error) { alert('Refine failed.'); } finally { setIsRefining(false); }
  };

  const convertToVertical = async (image: any) => {
    setIsConverting(image.id);
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ originalPrompt: image.prompt })
      });
      if (!response.ok) throw new Error('Convert failed');
      const newImage = await response.json();
      newImage.isVertical = true;
      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (error) { alert('Convert failed.'); } finally { setIsConverting(null); }
  };

  const optimizeImage = () => {
    if (!optimizerFile) return;
    setIsOptimizing(true);
    const img = new Image();
    img.src = optimizerFile;
    img.onload = () => {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       canvas.width = img.width; canvas.height = img.height;
       ctx?.drawImage(img, 0, 0);
       const compressed = canvas.toDataURL('image/jpeg', 0.6); 
       setTimeout(() => {
          setOptimizedUrl(compressed);
          setIsOptimizing(false);
          alert('Imagem otimizada com sucesso!');
       }, 1500);
    };
  };

  const handleChatSubmit = async () => {
     if (!chatInput.trim() && chatImages.length === 0) return;
     if (!apiKey) return alert('API Key Gemini necessária.');

     const currentHistory = chatHistories[chatMode];
     const userMsg = chatInput.trim() || "[Imagem enviada]";
     
     // Update current local history
     const updatedHistory = [...currentHistory, { role: 'user', content: userMsg }];
     setChatHistories(prev => ({ ...prev, [chatMode]: updatedHistory }));
     
     setChatInput('');
     setIsChatLoading(true);

     try {
        let endpoint = '/api/chat';
        let body: any = { messages: updatedHistory };

        if (chatMode.startsWith('extract-') && chatImages.length > 0) {
           endpoint = '/api/extract-prompt';
           body = { imageUrl: chatImages[0], mode: chatMode.split('-')[1] };
        } else if (chatImages.length > 0) {
           body.imageBase64 = chatImages[0];
        }

        const response = await fetch(endpoint, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
           body: JSON.stringify(body)
        });
        
        const data = await response.json();
        const reply = data.reply || data.prompt || "Desculpe, ocorreu um erro.";
        
        setChatHistories(prev => ({ 
          ...prev, 
          [chatMode]: [...prev[chatMode], { role: 'assistant', content: reply }] 
        }));
        setChatImages([]);
     } catch (err) {
        setChatHistories(prev => ({ 
          ...prev, 
          [chatMode]: [...prev[chatMode], { role: 'assistant', content: "Erro na conexão neural." }] 
        }));
     } finally {
        setIsChatLoading(false);
     }
  };

  const stylesGrid = [
    "Clássico", "Formal", "Elegante", "Sexy", "Institucional", "Tecnológico", "Glassmorphism", 
    "Interface UI", "Minimalista", "Lúdico", "Cartoon", "Infoproduto", "Jovial", "Gamer", 
    "Retrato Profissional", "Ultra Realista", "Glow"
  ];

  const appSwitchTabs = [
    { id: 'design', icon: <LayoutTemplate size={14} />, label: 'Design Builder' },
    { id: 'art', icon: <Paintbrush size={14} />, label: 'Art Builder' },
    { id: 'bg', icon: <LucideImage size={14} />, label: 'BG Builder' },
    { id: 'ref', icon: <Compass size={14} />, label: 'Ref Builder' }
  ];

  const chatAgents = [
    { id: 'general', label: 'Neural Director', color: 'text-purple-400', desc: "Diretor Geral - Assistente criativo e de prompts." },
    { id: 'extract-art', label: 'Extractor ART', color: 'text-pink-400', desc: "Extrai DNA de artes e ilustrações." },
    { id: 'extract-bg', label: 'Extractor BG', color: 'text-emerald-400', desc: "Extrai DNA de cenários e ambientes." },
    { id: 'extract-design', label: 'Extractor DESIGN', color: 'text-blue-400', desc: "Análise de anúncios e hierarquia visual." },
    { id: 'extract-ref', label: 'Extractor REF', color: 'text-amber-400', desc: "Análise de referências de estilo mestre." },
  ];

  const getChatLabel = () => chatAgents.find(a => a.id === chatMode)?.label || 'Neural Director';

  return (
    <div className="flex h-screen bg-[#050505] text-[#e0e0e0] font-sans overflow-hidden bg-[url('/bg-noise.png')]">
      
      {/* SIDEBAR PC */}
      <aside className={cn(
        "flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-3xl z-50 transition-all duration-500 xl:flex hidden shadow-[8px_0_32px_rgba(0,0,0,0.8)]",
        isSidebarOpen ? "w-80" : "w-20"
      )}>
        <div className="p-6 flex items-center border-b border-[#1a1a1a] h-16 justify-center xl:justify-start">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/5 rounded-2xl transition-all cursor-pointer">
              <Menu size={22} className="text-white"/>
           </button>
           {isSidebarOpen && <span className="font-black tracking-[0.3em] text-[#e0e0e0] text-[11px] mt-1 ml-5 drop-shadow-2xl">DESIGN BUILDER AI</span>}
        </div>
        <nav className="flex-1 px-4 py-10 space-y-5">
          {[
            { id: 'home', icon: <Home size={22} />, label: 'Neural Home' },
            { id: 'build', icon: <Wand2 size={22} />, label: 'Construir Criativo' },
            { id: 'gallery', icon: <ImageIcon size={22} />, label: 'Baú de Criações' },
            { id: 'optimizer', icon: <Maximize size={22} />, label: 'Neural Optimizer' },
            { id: 'config', icon: <Settings size={22} />, label: 'Sistema' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={cn("w-full flex items-center gap-5 px-5 py-4.5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden",
                currentView === item.id 
                ? "bg-white/5 border-l-[3px] border-[#a855f7] text-[#a855f7] shadow-2xl" 
                : "text-zinc-600 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="shrink-0 group-hover:scale-110 transition-transform duration-300"> {item.icon} </div>
              {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>}
              {currentView === item.id && <div className="absolute inset-0 bg-gradient-to-r from-[#a855f7]/10 to-transparent pointer-events-none" />}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-black/70 shadow-inner">
        
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-8 lg:px-12 border-b border-white/5 bg-[#050505]/95 backdrop-blur-2xl sticky top-0 z-40">
          <div className="flex gap-2 bg-[#111] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            {appSwitchTabs.map(app => (
               <button 
                 key={app.id}
                 onClick={() => setActiveApp(app.id as AppType)}
                 className={cn("flex items-center gap-2.5 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeApp === app.id ? "bg-[#1f1635] text-[#A855F7] border border-[#A855F7]/30 shadow-2xl" : "text-zinc-600 hover:text-white"
                 )}
               >
                 {app.icon} <span>{app.label}</span>
               </button>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <div className={cn(
              "hidden lg:flex items-center gap-3 bg-black border rounded-xl px-5 py-2.5 transition-all shadow-2xl",
              apiKeyStatus === 'ok' ? "border-green-500/30" : "border-white/5"
            )}>
              <input
                type="password"
                placeholder="Google Gemini API Key..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setApiKeyStatus('idle'); }}
                className="bg-transparent text-xs text-white placeholder:text-zinc-800 font-mono focus:outline-none w-64"
              />
              <Zap size={16} className={cn(apiKey === '' ? "text-zinc-900" : "text-amber-500")}/>
            </div>
          </div>
        </header>

        {/* CONTAINER DINAMICO */}
        <div className="flex-1 overflow-hidden relative">
          {currentView === 'build' && (
            <div className="h-full flex flex-col lg:grid lg:grid-cols-12 gap-8 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
              
              {/* CONFIGS (COL-4) */}
              <div className="lg:col-span-4 flex flex-col space-y-8 pb-48">
                
                {/* 1. SUJEITO PRINCIPAL */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-orange-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Sujeito Principal</h3>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase text-zinc-600">Fotos do Sujeito *</label>
                    <button onClick={() => subjectInputRef.current?.click()} className="w-full h-32 rounded-3xl bg-black/40 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-orange-500/50 transition-all overflow-hidden group">
                      {formData.subject.photo ? (
                        <img src={formData.subject.photo} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-orange-500/10 transition-all"><Plus size={20} className="text-zinc-600 group-hover:text-orange-500" /></div>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase">Upload</span>
                        </>
                      )}
                    </button>
                    <input type="file" ref={subjectInputRef} onChange={(e) => {
                      const file = e.target.files?.[0]; if(!file) return;
                      const r = new FileReader(); r.onloadend = () => updateForm(f => ({ subject: { ...f.subject, photo: r.result as string } })); r.readAsDataURL(file);
                    }} hidden accept="image/*" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-zinc-600">Quantidade</label>
                      <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                        {['1','2','3','4','5'].map(n => (
                          <button key={n} onClick={() => updateForm(f => ({ subject: { ...f.subject, count: n } }))} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all", formData.subject.count === n ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-zinc-700 hover:text-zinc-400")}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase text-zinc-600">Gênero</label>
                      <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                        {['Masculino','Feminino'].map(g => (
                          <button key={g} onClick={() => updateForm(f => ({ subject: { ...f.subject, gender: g.toLowerCase() as any } }))} className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", formData.subject.gender === g.toLowerCase() ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-zinc-700 hover:text-zinc-400")}>{g.slice(0,4)}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <textarea placeholder="Descrição da pose ou roupa (opcional)..." value={formData.subject.description} onChange={e => updateForm(f => ({ subject: { ...f.subject, description: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-[11px] text-white min-h-[100px] focus:outline-none focus:border-orange-500/30" />

                  <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                    {['Esquerda','Centro','Direita'].map(pos => (
                      <button key={pos} onClick={() => updateForm(f => ({ subject: { ...f.subject, position: pos.toLowerCase() as any } }))} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", formData.subject.position === pos.toLowerCase() ? "bg-zinc-800 text-white" : "text-zinc-700")}>{pos}</button>
                    ))}
                  </div>
                </div>

                {/* 2. DIMENSÕES */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Dimensões</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: '9:16', label: 'Stories', sub: '(9:16)' },
                      { id: '16:9', label: 'Horizontal', sub: '(16:9)' },
                      { id: '1:1', label: 'Feed Quadrado', sub: '(1:1)' },
                      { id: '4:5', label: 'Feed Retrato', sub: '(4:5)' },
                    ].map(dim => (
                      <button key={dim.id} onClick={() => updateForm(f => ({ dimensions: { ...f.dimensions, format: dim.id } }))} className={cn("flex flex-col items-center py-4 rounded-3xl border transition-all", formData.dimensions.format === dim.id ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-black/40 border-transparent text-zinc-700")}>
                        <span className="text-[10px] font-black">{dim.label}</span>
                        <span className="text-[8px] opacity-40">{dim.sub}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase text-zinc-600">Texto</label>
                    <input type="text" placeholder="Design text..." value={formData.dimensions.text} onChange={e => updateForm(f => ({ dimensions: { ...f.dimensions, text: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-[11px] text-white focus:outline-none focus:border-blue-500/30" />
                  </div>
                </div>

                {/* 3. PROJETO & CENÁRIO */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Projeto & Cenário</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600">Nicho/Projeto *</label>
                       <input type="text" placeholder="Ex: Trader de Elite" value={formData.context.niche} onChange={e => updateForm(f => ({ context: { ...f.context, niche: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-[11px] text-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-zinc-600">Ambiente (Ex: Escritório Moderno)</label>
                       <input type="text" placeholder="Ex: Escritório Moderno" value={formData.context.environment} onChange={e => updateForm(f => ({ context: { ...f.context, environment: e.target.value } }))} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-[11px] text-white" />
                    </div>
                    <button onClick={() => updateForm(f => ({ context: { ...f.context, useScenarioPhoto: !f.context.useScenarioPhoto } }))} className="flex items-center justify-between w-full p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-bold text-zinc-500">Usar fotos de cenário?</span>
                      <div className={cn("w-10 h-5 rounded-full p-1 transition-all", formData.context.useScenarioPhoto ? "bg-emerald-500" : "bg-white/10")}>
                        <div className={cn("w-3 h-3 bg-white rounded-full transition-all", formData.context.useScenarioPhoto ? "translate-x-5" : "translate-x-0")} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 4. CORES & ILUMINAÇÃO */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-amber-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Cores & Iluminação</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { key: 'ambient', label: 'Ambiente' },
                      { key: 'rim', label: 'Recorte' },
                      { key: 'fill', label: 'Complem.' },
                    ].map(c => (
                      <div key={c.key} className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-zinc-700">{c.label}</label>
                        <div className="relative w-full aspect-square rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                          <input type="color" value={(formData.lighting as any)[c.key]} onChange={e => updateForm(f => ({ lighting: { ...f.lighting, [c.key]: e.target.value } }))} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer bg-transparent border-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. COMPOSIÇÃO */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-fuchsia-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Composição</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'Close-up', label: 'Close-up (Rosto)', sub: 'Foco no enquadramento ideal' },
                      { id: 'Plano Médio', label: 'Plano Médio (Busto)', sub: 'Foco no enquadramento ideal' },
                      { id: 'Plano Americano', label: 'Plano Americano', sub: 'Foco no enquadramento ideal' },
                    ].map(shot => (
                      <button key={shot.id} onClick={() => updateForm(f => ({ composition: { ...f.composition, shotType: shot.id } }))} className={cn("text-left p-4 rounded-2xl border transition-all", formData.composition.shotType === shot.id ? "bg-fuchsia-600/10 border-fuchsia-500/40" : "bg-black/40 border-transparent")}>
                        <div className={cn("text-[10px] font-black mb-1", formData.composition.shotType === shot.id ? "text-fuchsia-400" : "text-zinc-600")}>{shot.label}</div>
                        <div className="text-[8px] text-zinc-800 uppercase font-bold">{shot.sub}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => updateForm(f => ({ composition: { ...f.composition, floatingElements: !f.composition.floatingElements } }))} className="flex items-center justify-between w-full p-4 bg-black/40 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500">Elementos Flutuantes?</span>
                    <div className={cn("w-10 h-5 rounded-full p-1 transition-all", formData.composition.floatingElements ? "bg-fuchsia-500" : "bg-white/10")}>
                      <div className={cn("w-3 h-3 bg-white rounded-full transition-all", formData.composition.floatingElements ? "translate-x-5" : "translate-x-0")} />
                    </div>
                  </button>
                </div>

                {/* 6. REFERÊNCIAS DE ESTILO */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-pink-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Referências de Estilo</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <button onClick={() => styleRefInputRef.current?.click()} className="w-full py-6 border-2 border-dashed border-white/10 rounded-3xl bg-black/40 flex items-center justify-center gap-3 hover:border-pink-500/50 transition-all text-zinc-700 hover:text-pink-400 group">
                      {formData.style.refPhoto ? (
                         <img src={formData.style.refPhoto} className="w-full h-32 object-cover rounded-2xl" />
                      ) : (
                        <><Plus size={20} /><span className="text-[10px] font-black uppercase">Adicionar Referência</span></>
                      )}
                    </button>
                    <input type="file" ref={styleRefInputRef} onChange={(e) => {
                      const file = e.target.files?.[0]; if(!file) return;
                      const r = new FileReader(); r.onloadend = () => updateForm(f => ({ style: { ...f.style, refPhoto: r.result as string } })); r.readAsDataURL(file);
                    }} hidden accept="image/*" />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Atributos Visuais & Estilo</span>
                    </div>
                    <div className="space-y-4 p-6 bg-black/40 rounded-3xl border border-white/5">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase mb-1">
                         <span className="text-zinc-600 italic">Sobriedade</span>
                         <span className="text-white">{formData.style.sobriety}</span>
                         <span className="text-zinc-600 italic">Criativo / Vibrante</span>
                      </div>
                      <input type="range" min="0" max="100" value={formData.style.sobriety} onChange={e => updateForm(f => ({ style: { ...f.style, sobriety: parseInt(e.target.value) } }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500" />
                      <div className="flex justify-between text-[8px] font-black text-zinc-800 uppercase tracking-widest mt-2">
                        <span className={cn(formData.style.sobriety < 40 && "text-white")}>PROFISSIONAL</span>
                        <span className={cn(formData.style.sobriety > 60 && "text-white")}>CRIATIVO</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[9px] font-black uppercase text-zinc-600">Ativar Estilo Visual</label>
                    <div className="flex flex-wrap gap-2">
                      {stylesGrid.map(style => (
                        <button key={style} onClick={() => updateForm(f => ({ style: { ...f.style, activeStyles: f.style.activeStyles.includes(style) ? f.style.activeStyles.filter(s => s !== style) : [...f.style.activeStyles, style] } }))} className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border", formData.style.activeStyles.includes(style) ? "bg-pink-600 text-white border-transparent shadow-lg shadow-pink-500/20" : "bg-black/40 border-transparent text-zinc-700 hover:text-zinc-400")}>{style}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => updateForm(f => ({ style: { ...f.style, useBlur: !f.style.useBlur } }))} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black text-zinc-600 uppercase">Usar Desfoque (Blur)?</span>
                      <div className={cn("w-8 h-4 rounded-full p-0.5 transition-all", formData.style.useBlur ? "bg-pink-500" : "bg-white/10")}>
                        <div className={cn("w-3 h-3 bg-white rounded-full transition-all", formData.style.useBlur ? "translate-x-4" : "translate-x-0")} />
                      </div>
                    </button>
                    <button onClick={() => updateForm(f => ({ style: { ...f.style, useSideGradient: !f.style.useSideGradient } }))} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <span className="text-[9px] font-black text-zinc-600 uppercase">Usar Degradê Lateral?</span>
                      <div className={cn("w-8 h-4 rounded-full p-0.5 transition-all", formData.style.useSideGradient ? "bg-pink-500" : "bg-white/10")}>
                        <div className={cn("w-3 h-3 bg-white rounded-full transition-all", formData.style.useSideGradient ? "translate-x-4" : "translate-x-0")} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 7. PROMPT ADICIONAL */}
                <div className="bg-[#111]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3.5 bg-zinc-400 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Prompt Adicional?</h3>
                  </div>
                  <textarea value={formData.extraPrompt} onChange={e => updateForm(f => ({ extraPrompt: e.target.value }))} placeholder="Adicione detalhes extras..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-[11px] text-white min-h-[120px] focus:outline-none focus:border-white/20" />
                </div>
              </div>

              {/* RESULTS PREVIEW */}
              <div className="lg:col-span-8 h-full bg-[#070707] rounded-[50px] border border-white/5 shadow-inner relative overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 lg:pb-56 relative">
                  {isGenerating && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                       <div className="neural-scan" />
                       <div className="w-full h-full bg-purple-500/5 neural-pulse-bg" />
                    </div>
                  )}
                  {generatedImages.length === 0 ? (
                    <div className="m-auto flex flex-col items-center justify-center p-14 h-[600px] border-4 border-dashed border-white/5 rounded-[60px] bg-black/40">
                        <div className="w-28 h-28 bg-[#111] rounded-[40px] flex items-center justify-center mb-10 border border-white/5 shadow-3xl"><Bot size={48} className="text-zinc-800"/></div>
                        <h4 className="font-black tracking-[0.4em] text-[#A855F7] text-sm uppercase mb-4 leading-none italic">Aguardando coordenadas</h4>
                        <p className="text-[11px] text-zinc-700 font-black uppercase tracking-[0.2em] text-center leading-loose">Selecione os parâmetros e o alvo mestre para materialização.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {generatedImages.map((img) => (
                        <div key={img.id} className={cn("group relative rounded-[40px] overflow-hidden shadow-2xl bg-black border border-white/5 transform transition-all duration-700 hover:-translate-y-6", img.isVertical ? "row-span-2 aspect-[9/16]" : "aspect-[4/5]")}>
                          <img src={img.url} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" alt="Generated" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-10 backdrop-blur-[3px]">
                              <p className="text-xs text-[#fafafa] line-clamp-5 leading-loose bg-black/60 p-6 rounded-3xl border border-white/10 mb-8 font-medium shadow-3xl">{img.prompt}</p>
                              <div className="flex gap-4">
                                <button onClick={() => handleDownload(img.url, img.id)} className="flex-1 py-5 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-3xl hover:bg-zinc-200 transition-all active:scale-95"><Download size={20}/></button>
                                <button onClick={() => setRefineModal({isOpen: true, image: img, instruction: ''})} className="flex-1 py-5 bg-[#7C3AED] text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-3xl active:scale-95 border border-[#9333ea]"><Paintbrush size={20}/> Refinar</button>
                                {!img.isVertical && <button onClick={() => convertToVertical(img)} disabled={isConverting === img.id} className="w-20 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"><SplitSquareHorizontal size={24}/></button>}
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl px-10 flex flex-col gap-3 z-50">
                    <button 
                      onClick={handleGenerateImage}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-5 py-7 bg-white text-black rounded-[36px] font-black uppercase tracking-[0.4em] text-sm shadow-[0_25px_60px_rgba(255,255,255,0.2)] hover:bg-zinc-200 active:scale-98 transition-all disabled:opacity-50 group overflow-hidden"
                    >
                      {isGenerating ? <><Loader2 className="animate-spin" size={24}/> Processando Forjamento...</> : <><Sparkles size={24} fill="currentColor" /> Gerar Imagem</>}
                    </button>
                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:bg-white/10 transition-all active:scale-95">
                      <Copy size={14} className="inline mr-2" /> Duplicar Configuração
                    </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: OPTIMIZER */}
          {currentView === 'optimizer' && (
            <div className="h-full flex items-center justify-center p-12">
               <div className="max-w-3xl w-full bg-[#111] border border-white/5 p-16 rounded-[60px] shadow-2xl text-center space-y-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-600 text-transparent" />
                  <div className="w-24 h-24 bg-black rounded-[32px] mx-auto flex items-center justify-center border border-white/5 shadow-4xl"><Maximize size={40} className="text-[#a855f7]"/></div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-[0.25em] italic">Neural Optimizer</h2>
                  <button onClick={() => optimizerInputRef.current?.click()} className="w-full py-20 border-4 border-dashed border-white/5 rounded-[50px] bg-black/40 cursor-pointer hover:bg-black/60 transition-all flex flex-col items-center justify-center gap-6 group">
                     {optimizerFile ? (
                        <img src={optimizerFile} className="w-56 h-56 rounded-3xl object-cover border-2 border-[#a855f7]/50 shadow-3xl" />
                     ) : (
                        <Upload size={40} className="text-zinc-800"/>
                     )}
                  </button>
                  <input type="file" ref={optimizerInputRef} onChange={(e) => handleImageUpload(e, 'optimizer')} hidden accept="image/*" />
                  <div className="flex gap-4">
                    <button onClick={optimizeImage} disabled={isOptimizing || !optimizerFile} className="flex-1 py-7 bg-white text-black rounded-3xl font-black uppercase text-xs tracking-widest">{isOptimizing ? 'Comprimindo...' : 'Otimizar Digital Imprint'}</button>
                    {optimizedUrl && <button onClick={() => handleDownload(optimizedUrl, 'optimized')} className="w-24 bg-[#a855f7] text-white rounded-3xl flex items-center justify-center"><Download size={32}/></button>}
                  </div>
               </div>
            </div>
          )}

          {/* GALLERY VIEW */}
          {currentView === 'gallery' && (
            <div className="h-full p-12 overflow-y-auto custom-scrollbar animate-in fade-in duration-700">
               <div className="max-w-[1600px] mx-auto space-y-16 pb-40">
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic border-b border-white/5 pb-10">Neural Vault <span className="text-[#a855f7] text-xl font-normal ml-3">Sessão</span></h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                     {generatedImages.map(img => (
                        <div key={img.id} className="aspect-[4/5] bg-black rounded-[40px] border border-white/5 overflow-hidden relative group hover:scale-105 transition-all duration-700">
                           <img src={img.url} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <button onClick={() => handleDownload(img.url, img.id)} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black active:scale-90 transition-all"><Download size={36}/></button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {/* HOME VIEW */}
          {currentView === 'home' && (
            <div className="h-full flex items-center justify-center p-12 animate-in fade-in duration-1000">
               <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="bg-[#111] border border-white/5 p-16 rounded-[70px] shadow-3xl relative overflow-hidden group">
                     <h2 className="text-5xl font-black text-white uppercase tracking-[0.25em] mb-8 relative z-10 italic leading-[1.1]">Neural Overlord</h2>
                     <p className="text-zinc-600 text-sm font-black uppercase tracking-[0.15em] leading-[2.2] mb-14 relative z-10">Sistemas estabilizados. Prontos para forjamento de alto impacto.</p>
                     <button onClick={() => setCurrentView('build')} className="px-12 py-6 bg-[#7c3aed] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-[#9333ea] transition-all relative z-10">Acessar Forja</button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] flex flex-col justify-center items-center gap-3">
                        <span className="text-5xl font-black text-[#a855f7]">{generatedImages.length}</span>
                        <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest text-center">Neural Imprints</span>
                     </div>
                     <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] flex flex-col justify-center items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest text-center">Stable Connection</span>
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* CHAT TOGGLE */}
      <button 
         onClick={() => setChatOpen(!chatOpen)}
         className={cn("fixed bottom-12 right-12 w-20 h-20 flex items-center justify-center rounded-[32px] shadow-2xl transition-all z-[90] bg-[#a855f7] border-2 border-white/20 active:scale-90 group", chatOpen && "scale-0 opacity-0 pointer-events-none")} 
      >
        <Send size={28} className="text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* CHAT MODAL */}
      {chatOpen && (
         <div className="fixed lg:bottom-16 bottom-10 lg:right-16 right-10 lg:w-[460px] w-[95vw] lg:h-[700px] h-[85vh] bg-[#0a0a0a]/98 border border-white/5 rounded-[50px] shadow-[0_40px_120px_rgba(0,0,0,1)] z-[100] flex flex-col overflow-hidden backdrop-blur-3xl animate-in zoom-in-95 duration-500">
             
             {/* Header */}
             <div className="p-8 border-b border-white/5 bg-[#0e0e0e] relative z-20">
                <button onClick={() => setChatAgentsOpen(!chatAgentsOpen)} className="flex items-center gap-5 group">
                   <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-3xl"><Sparkles size={24} className="text-white fill-white" /></div>
                   <div className="flex-1 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("text-sm font-black tracking-[0.25em] uppercase block leading-tight", chatAgents.find(a => a.id === chatMode)?.color)}>{getChatLabel()}</span>
                        <ChevronDown size={14} className={cn("text-zinc-700 transition-transform duration-500", chatAgentsOpen && "rotate-180")}/>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase flex items-center gap-2 mt-1.5"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> Neural Sync Active</span>
                   </div>
                </button>

                {chatAgentsOpen && (
                  <div className="absolute top-[calc(100%+12px)] left-8 right-8 bg-[#161616] border border-white/10 rounded-[36px] shadow-4xl overflow-hidden py-3 z-50">
                    {chatAgents.map((agent) => (
                      <button 
                         key={agent.id}
                         onClick={() => { setChatMode(agent.id as ChatMode); setChatAgentsOpen(false); }}
                         className={cn("w-full text-left px-8 py-5 flex flex-col hover:bg-black/80 transition-all border-b border-white/5 last:border-0", chatMode === agent.id ? "bg-white/5" : "")}
                      >
                         <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-black uppercase tracking-widest", agent.color)}>{agent.label}</span>
                            {chatMode === agent.id && <Check size={16} className="text-[#a855f7]"/>}
                         </div>
                         <span className="text-[9px] text-zinc-700 font-bold uppercase mt-1 tracking-tight">{agent.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
             </div>

             {/* History (Filtered by current chatMode) */}
             <div className="flex-1 p-10 flex flex-col overflow-y-auto custom-scrollbar space-y-8">
                {chatHistories[chatMode].length === 0 ? (
                  <div className="mt-auto bg-[#141414] text-zinc-400 p-8 rounded-[40px] rounded-tl-sm text-xs font-bold leading-[2] border border-white/5 shadow-inner">
                    {chatMode === 'general' ? "Mestre, os sistemas neurais estão sincronizados. Deseja melhorar um prompt ou analisar uma nova direção criativa?" : `Agente ${getChatLabel()} ativado. Mande a imagem fonte para extração do DNA Master.`}
                  </div>
                ) : (
                   chatHistories[chatMode].map((m, i) => (
                     <div key={i} className={cn("max-w-[90%] p-7 rounded-[36px] text-xs font-medium leading-loose shadow-2xl relative animate-in slide-in-from-bottom-2", 
                        m.role === 'user' ? "self-end bg-white text-black rounded-tr-sm" : "self-start bg-[#141414] text-zinc-300 rounded-tl-sm border border-white/5"
                     )}>
                        {m.content}
                        <div className={cn("absolute -bottom-1 w-3 h-3 rotate-45 border-white/5", m.role === 'user' ? "-right-1 bg-white" : "-left-1 bg-[#141414] border-l border-b")} />
                     </div>
                   ))
                )}
                {isChatLoading && (
                   <div className="self-start bg-[#141414] p-6 rounded-[36px] flex gap-2">
                      <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full animate-bounce" />
                   </div>
                )}
             </div>

             {/* Footer */}
             <div className="p-8 bg-[#0e0e0e] border-t border-white/5 pb-10">
                {chatImages.length > 0 && (
                   <div className="flex gap-2 mb-4 animate-in slide-in-from-bottom-2">
                        <div className="w-20 h-20 rounded-2xl border-2 border-[#a855f7]/50 overflow-hidden relative shadow-2xl">
                           <img src={chatImages[0]} className="w-full h-full object-cover" />
                           <button onClick={() => setChatImages([])} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"><X size={16}/></button>
                        </div>
                   </div>
                )}
                <div className="flex items-center gap-4 bg-black rounded-[36px] p-2.5 border border-white/5 shadow-inner">
                   <button onClick={() => chatImageInputRef.current?.click()} className="p-5 bg-white/5 hover:bg-[#a855f7]/15 hover:text-[#a855f7] rounded-3xl text-zinc-700 transition-all active:scale-90 shadow-2xl">
                      <Paperclip size={24}/>
                   </button>
                   <input type="file" ref={chatImageInputRef} onChange={(e) => handleImageUpload(e, 'chat')} hidden accept="image/*" />
                   
                   <input 
                      type="text" 
                      placeholder="Comando neural..." 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      className="flex-1 bg-transparent text-xs font-bold text-white px-4 focus:outline-none placeholder:text-zinc-900" 
                    />
                   <button onClick={handleChatSubmit} disabled={isChatLoading} className="p-5 bg-[#a855f7] text-white rounded-3xl shadow-3xl hover:bg-[#9333ea] transition-all active:scale-90 disabled:opacity-50">
                      {isChatLoading ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} className="fill-current translate-x-0.5"/>}
                   </button>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-full mt-6 text-[10px] font-black uppercase text-zinc-800 hover:text-zinc-600 transition-all tracking-[0.3em]">Minimizar Assistant</button>
             </div>
         </div>
      )}

      {/* REFINE MODAL */}
      {refineModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-[#111] border border-white/5 rounded-[50px] w-full max-w-xl p-12 shadow-4xl space-y-10 animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between">
                 <SectionTitle title="Refinamento Neural" colorClass="bg-white" />
                 <button onClick={() => setRefineModal({isOpen: false, image: null, instruction: ''})} className="text-zinc-600 hover:text-white"><X size={24}/></button>
              </div>
              <div className="aspect-[4/5] w-full rounded-3xl overflow-hidden shadow-inner border border-white/5">
                 <img src={refineModal.image.url} className="w-full h-full object-cover opacity-50" />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Instruções de Refinamento</label>
                 <textarea 
                   placeholder="Ex: Mude a cor da roupa para dourado, adicione mais brilho..." 
                   value={refineModal.instruction}
                   onChange={e => setRefineModal(p => ({...p, instruction: e.target.value}))}
                   className="w-full h-32 bg-black border border-white/5 rounded-2xl p-6 text-xs text-white focus:outline-none focus:border-[#a855f7]/40 shadow-inner"
                 />
              </div>
              <button onClick={submitRefinement} disabled={isRefining} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-4">
                 {isRefining ? <Loader2 className="animate-spin" /> : <><Sparkles size={18}/> Aplicar Alterações</>}
              </button>
           </div>
        </div>
      )}

      {/* NOISE */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[999] bg-noise mix-blend-overlay" />
    </div>
  );
}
