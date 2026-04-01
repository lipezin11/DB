'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { 
  Menu, Home, Wand2, ImageIcon, Sparkles, Compass, 
  Settings, Zap, Send, Check, ChevronDown, Bot, Loader2, Upload, X, Globe, Plus, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ChatMode = 'general' | 'extract-art' | 'extract-bg' | 'extract-design' | 'extract-ref';

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { apiKey, setApiKey } = useAppContext();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [chatAgentsOpen, setChatAgentsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatImages, setChatImages] = useState<string[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState<Record<ChatMode, {role: 'user' | 'assistant', content: string, images?: string[]}[]>>({
    general: [], 'extract-art': [], 'extract-bg': [], 'extract-design': [], 'extract-ref': []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatAgents = [
    { id: 'general', label: 'Neural Director', color: 'text-purple-400', desc: "Diretor Geral - Assistente criativo e de prompts." },
    { id: 'extract-art', label: 'Extractor ART', color: 'text-pink-400', desc: "Extrai DNA de artes e anúncios publicitários." },
    { id: 'extract-bg', label: 'Extractor BG', color: 'text-emerald-400', desc: "Extrai DNA de cenários e ambientes (ignora pessoas)." },
    { id: 'extract-design', label: 'Extractor DESIGN', color: 'text-blue-400', desc: "Análise genérica de alta precisão." },
    { id: 'extract-ref', label: 'Extractor REF', color: 'text-amber-400', desc: "Mescla DNA de 2 ou mais referências mestras." },
  ];

  const getChatLabel = () => chatAgents.find(a => a.id === chatMode)?.label || 'Neural Director';

  const [isNeuralScanning, setIsNeuralScanning] = useState(false);
  const [activeRoute, setActiveRoute] = useState('');
  const { isGeneratingGlobal } = useAppContext();

  useEffect(() => {
    if (pathname !== activeRoute && activeRoute !== '') {
      setActiveRoute(pathname);
      setIsNeuralScanning(true);
      const timer = setTimeout(() => setIsNeuralScanning(false), 2000);
      return () => clearTimeout(timer);
    } else if (activeRoute === '') {
      setActiveRoute(pathname);
    }
  }, [pathname, activeRoute]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImages(prev => chatMode === 'extract-ref' ? [...prev, reader.result as string] : [reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() && chatImages.length === 0) return;
    if (!apiKey) return alert('API Key Gemini necessária.');

    const userMsg = chatInput.trim();
    const mode = chatMode;
    const isExtractor = mode.startsWith('extract-');
    
    // Validate Ref mode
    if (mode === 'extract-ref' && chatImages.length < 2 && chatImages.length > 0) {
      return alert('O modo Extractor REF exige pelo menos 2 imagens para fusão neural.');
    }

    const newMessage = { role: 'user' as const, content: userMsg || 'Iniciando Extração...', images: [...chatImages] };
    setChatHistories(prev => ({ ...prev, [mode]: [...prev[mode], newMessage] }));
    
    setChatInput('');
    setChatImages([]);
    setIsChatLoading(true);

    try {
       let reply = '';
       
       if (isExtractor && newMessage.images.length > 0) {
          // CALL EXTRACTION API
          const extractorMode = mode.split('-')[1];
          const response = await fetch('/api/extract-prompt', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
             body: JSON.stringify({ images: newMessage.images, mode: extractorMode })
          });
          const data = await response.json();
          reply = data.prompt || data.error || "Falha na extração de DNA.";
       } else {
          // CALL GENERAL CHAT API
          const response = await fetch('/api/chat', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
             body: JSON.stringify({ messages: [...chatHistories[mode], newMessage].map(m => ({ role: m.role, content: m.content })) })
          });
          const data = await response.json();
          reply = data.reply || "Erro na conexão neural.";
       }
       
       setChatHistories(prev => ({ 
         ...prev, 
         [mode]: [...prev[mode], { role: 'assistant', content: reply }] as any
       }));
    } catch (err) {
       setChatHistories(prev => ({ 
         ...prev, 
         [mode]: [...prev[mode], { role: 'assistant', content: "Erro crítico na rede neural." }] as any
       }));
    } finally {
       setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-zinc-300 font-sans selection:bg-[#a855f7] selection:text-white">
      
      {/* CINEMATIC NEURAL PORTAL — FAILS-SAFE & PREMIUM */}
      <AnimatePresence>
        {(isNeuralScanning || isGeneratingGlobal) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNeuralScanning(false)}
            className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-3xl flex items-center justify-center overflow-hidden cursor-pointer"
          >
             {/* THE NEURAL GRID */}
             <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
             </div>

             {/* DATA STREAM REINFORCEMENT */}
             <div className="absolute inset-0 overflow-hidden opacity-20 flex justify-between px-10 pointer-events-none font-mono text-[8px] text-[#a855f7]">
                {[...Array(6)].map((_, i) => (
                   <div key={i} className="flex flex-col gap-4 animate-in slide-in-from-top duration-[5000ms] infinite">
                      {Array.from({length: 40}).map((_, j) => (
                         <span key={j} className="animate-pulse" style={{ animationDelay: `${j * 100}ms` }}>{Math.random().toString(36).substr(2, 4)}</span>
                      ))}
                   </div>
                ))}
             </div>

             {/* THE SCANNING BLADE */}
             <motion.div 
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                className="absolute left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#a855f7] to-transparent shadow-[0_0_20px_#a855f7] z-30"
             />

             {/* CENTRAL CORE */}
             <div className="flex flex-col items-center gap-12 relative z-50">
                <div className="relative group">
                   <div className="absolute inset-x-0 h-40 bg-[#a855f7]/10 blur-[100px] -top-20 animate-pulse" />
                   <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center relative bg-black/50 overflow-hidden ring-1 ring-[#a855f7]/20">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#a855f7]/20 to-transparent animate-scan-up" />
                      <Bot size={40} className="text-[#a855f7] relative z-10 drop-shadow-[0_0_10px_#a855f7]" />
                      <div className="absolute inset-0 border border-[#a855f7]/20 rounded-full scale-150 animate-ping" />
                   </div>
                </div>

                <div className="text-center space-y-6">
                   <div className="flex flex-col gap-2">
                      <h2 className="text-white font-black italic uppercase tracking-[0.6em] text-[12px] md:text-[14px]">Nexus Injection Sequence</h2>
                      <div className="h-[2px] w-48 bg-white/5 mx-auto rounded-full overflow-hidden relative border border-white/10">
                         <motion.div 
                           initial={{ left: '-100%' }}
                           animate={{ left: '0%' }}
                           transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                           className="absolute inset-0 bg-gradient-to-r from-transparent via-[#a855f7] to-transparent" 
                         />
                      </div>
                   </div>
                   <p className="text-zinc-500 font-extrabold uppercase tracking-[0.3em] text-[7px] max-w-sm mx-auto leading-loose px-4">
                      {isGeneratingGlobal ? 'Broadcasting Creative DNA to Global Nexus...' : 'Surgical Protocol: Optimizing Neural Studio Architecture...'}
                   </p>
                </div>
                
                {/* EMERGENCY DISMISS (Subtle) */}
                <span className="text-white/20 text-[6px] font-black uppercase tracking-widest mt-10 hover:text-white transition-all cursor-pointer">Click to Bypass Portal / DNA Forge</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-black/70 md:pl-28">
        <header className="h-16 flex items-center justify-between px-8 lg:px-12 border-b border-white/5 bg-[#050505]/95 backdrop-blur-2xl z-40">
          <div className="flex gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a855f7] border border-[#a855f7]/20 bg-[#a855f7]/5 px-5 py-2 rounded-xl">
              {pathname === '/design' ? 'Design Builder' : pathname === '/ref' ? 'Ref Builder' : pathname === '/bg' ? 'Background Builder' : pathname === '/product' ? 'Product Builder' : 'Neural Mode'}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className={cn("hidden lg:flex items-center gap-3 bg-black border rounded-xl px-5 py-2.5 transition-all", apiKey ? "border-green-500/10" : "border-white/5")}>
              <input type="password" placeholder="API Key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-transparent text-[11px] text-white placeholder:text-zinc-800 font-mono focus:outline-none w-48" />
              <Zap size={14} className={apiKey ? "text-amber-500" : "text-zinc-800"}/>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>

      {/* CHAT TOGGLE */}
      <button 
         onClick={() => setChatOpen(!chatOpen)}
         className={cn("fixed bottom-10 right-10 w-20 h-20 flex items-center justify-center rounded-[32px] shadow-2xl transition-all z-[90] bg-[#a855f7] border-2 border-white/20 active:scale-95 group", chatOpen && "scale-0 opacity-0")} 
      >
        <Send size={28} className="text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* CHAT MODAL */}
      <AnimatePresence>
      {chatOpen && (
         <motion.div 
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="fixed bottom-10 right-10 lg:w-[480px] w-[95vw] lg:h-[750px] h-[85vh] bg-[#0a0a0a] border border-white/5 rounded-[48px] shadow-[0_50px_150px_rgba(0,0,0,1)] z-[100] flex flex-col overflow-hidden backdrop-blur-3xl"
         >
             <div className="p-8 border-b border-white/5 bg-[#0e0e0e] flex justify-between items-start relative z-50">
                <button onClick={() => setChatAgentsOpen(!chatAgentsOpen)} className="flex items-center gap-5 group">
                   <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-2xl shrink-0"><Bot size={28} className="text-white" /></div>
                   <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-black tracking-widest uppercase block", chatAgents.find(a => a.id === chatMode)?.color)}>{getChatLabel()}</span>
                        <ChevronDown size={14} className={cn("text-zinc-700 transition-transform", chatAgentsOpen && "rotate-180")}/>
                      </div>
                      <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Neural Connection</span>
                   </div>
                </button>
                <button onClick={() => setChatOpen(false)} className="bg-white/5 p-3 rounded-2xl text-zinc-500 hover:text-white transition-all"><X size={18}/></button>

                {chatAgentsOpen && (
                  <div className="absolute top-[110%] left-8 right-8 bg-[#161616] border border-white/10 rounded-[32px] shadow-4xl overflow-hidden py-4 z-50 animate-in slide-in-from-top-2">
                    {chatAgents.map((agent) => (
                      <button 
                         key={agent.id}
                         onClick={() => { setChatMode(agent.id as ChatMode); setChatAgentsOpen(false); setChatImages([]); }}
                         className={cn("w-full text-left px-8 py-4 flex flex-col hover:bg-white/5 transition-all", chatMode === agent.id ? "bg-white/[0.03]" : "")}
                      >
                         <div className="flex items-center justify-between">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", agent.color)}>{agent.label}</span>
                            {chatMode === agent.id && <Check size={14} className="text-[#a855f7]"/>}
                         </div>
                         <span className="text-[8px] text-zinc-600 font-bold uppercase mt-1 tracking-wider">{agent.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
             </div>

             <div className="flex-1 p-8 flex flex-col overflow-y-auto custom-scrollbar space-y-8">
                {chatHistories[chatMode].length === 0 ? (
                  <div className="mt-auto bg-white/[0.02] border border-white/5 p-8 rounded-[40px] rounded-tl-sm text-[11px] font-medium text-zinc-500 leading-relaxed">
                    {chatMode === 'general' ? "Mestre, as frequências neurais estão sintonizadas. Deseja realizar uma extração de DNA visual ou ajustar um comando criativo?" : `O protocolo de extração ${getChatLabel()} foi inicializado. Arraste uma imagem para começar.`}
                  </div>
                ) : (
                   chatHistories[chatMode].map((m, i) => (
                     <div key={`chat-msg-${chatMode}-${i}-${m.content.slice(0, 10)}`} className={cn("max-w-[90%] p-6 rounded-[36px] text-xs font-medium leading-relaxed relative animate-in fade-in slide-in-from-bottom-2", 
                        m.role === 'user' ? "self-end bg-white text-black rounded-tr-sm" : "self-start bg-white/[0.03] text-zinc-300 rounded-tl-sm border border-white/5"
                     )}>
                        {m.images && m.images.length > 0 && (
                          <div className={cn("grid gap-2 mb-4", m.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                            {m.images.map((img, idx) => (
                              <img key={`msg-img-${i}-${idx}`} src={img} className="w-full aspect-square object-cover rounded-2xl" alt="Neural context" />
                            ))}
                          </div>
                        )}
                        {m.role === 'assistant' && m.content.startsWith('[') ? (
                          <div className="space-y-4">
                             <div className="p-4 bg-black/40 rounded-2xl font-mono text-[10px] text-zinc-400 break-words border border-white/5">{m.content}</div>
                             <button 
                               onClick={() => { navigator.clipboard.writeText(m.content); alert('DNA copiado.'); }}
                               className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#a855f7]"
                             >
                                <Copy size={12}/> Copiar Prompt DNA
                             </button>
                          </div>
                        ) : m.content}
                     </div>
                   ))
                )}
                {isChatLoading && (
                   <div className="self-start bg-white/[0.03] p-6 rounded-[32px] flex gap-2">
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                   </div>
                )}
             </div>

             <div className="p-6 bg-[#0a0a0a] border-t border-white/5 relative z-50">
                 {chatImages.length > 0 && (
                   <div className="flex gap-2 mb-4 overflow-x-auto p-2 no-scrollbar">
                      {chatImages.map((img, i) => (
                        <div key={`pending-img-${i}`} className="relative shrink-0">
                           <img src={img} className="w-16 h-16 rounded-xl object-cover ring-1 ring-white/10" />
                           <button onClick={() => setChatImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 bg-black p-1 rounded-full text-white ring-1 ring-white/20"><X size={10}/></button>
                        </div>
                      ))}
                      <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-zinc-600 hover:text-white transition-all"><Plus size={18}/></button>
                   </div>
                 )}
                 
                 <div className="flex items-center gap-3 bg-[#111] p-3 rounded-[32px] border border-white/5 focus-within:border-white/20 transition-all shadow-2xl">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-11 h-11 rounded-2xl bg-white/5 text-zinc-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                    >
                      <Upload size={18} />
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      hidden 
                      multiple={chatMode === 'extract-ref'} 
                      onChange={handleImageUpload} 
                    />
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      placeholder={chatImages.length > 0 ? "Adicionar instrução de extração..." : "Comandar rede neural..."}
                      className="flex-1 bg-transparent border-none px-2 text-[11px] font-black text-white placeholder:text-zinc-700 tracking-wider focus:outline-none"
                    />
                    <button 
                       onClick={handleChatSubmit}
                       disabled={isChatLoading || (!chatInput.trim() && chatImages.length === 0)}
                       className="w-11 h-11 rounded-2xl bg-[#a855f7] text-white flex items-center justify-center hover:bg-[#9333ea] transition-all disabled:opacity-50 shrink-0"
                    >
                      {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                 </div>
             </div>
         </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
