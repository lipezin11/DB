'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, Compass, Wand2, ImageIcon, Plus, X, User } from 'lucide-react';

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={cn("w-10 h-5 rounded-full transition-colors relative focus:outline-none flex-shrink-0", checked ? "bg-[#b05bff]" : "bg-[#252525]")}
  >
    <div className={cn("absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow-sm", checked ? "right-[2px]" : "left-[2px]")} />
  </button>
);

const SectionTitle = ({ title, rightElement }: { title: string, rightElement?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4 mt-12 first:mt-0">
    <div className="flex items-center gap-2 text-white">
      <div className="w-[3px] h-3.5 bg-[#b05bff] rounded-full" />
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#d4d4d4]">{title}</h2>
    </div>
    {rightElement}
  </div>
);

export default function DesignBuilderDashboard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [refineModal, setRefineModal] = useState<{isOpen: boolean, image: any, instruction: string}>({isOpen: false, image: null, instruction: ''});
  const [isRefining, setIsRefining] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [subjectImage, setSubjectImage] = useState<string | null>(null);
  const [subjectMode, setSubjectMode] = useState<'pessoa' | 'produto'>('pessoa');
  const [hasText, setHasText] = useState(true);
  const [hasScenarioPhoto, setHasScenarioPhoto] = useState(false);
  const [hasFloatingElements, setHasFloatingElements] = useState(true);
  const [visualStyleActive, setVisualStyleActive] = useState(true);
  const [useBlur, setUseBlur] = useState(true);
  const [useSideGradient, setUseSideGradient] = useState(false);
  const [gradientColor, setGradientColor] = useState('#000000');
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [styleRefInstruction, setStyleRefInstruction] = useState('');
  const styleRefInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    subject: { count: '1', gender: 'male', description: '', position: 'direita' },
    dimensions: '16:9',
    text: { headline: '', subheadline: '', cta: '', position: 'esquerda' },
    context: { niche: '', environment: '' },
    lighting: { ambient: '#1e1b4b', rim: '#a3e635', fill: '#8b5cf6' },
    composition: { framing: 'Medium', floatingElements: '' },
    style: { core: 'Classic', sobriety: 50, effects: [] as string[] }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ===== FUNÇÃO DE GERAÇÃO CORRIGIDA (HEADER x-goog-api-key) =====
  const handleGenerateImage = async () => {
    if (!apiKey || apiKey.length < 8) {
      alert('Cole sua API Key do Google Gemini no campo no canto superior direito antes de gerar!');
      return;
    }
    setIsGenerating(true);
    try {
      const payload = {
        ...formData,
        subject: {
          ...formData.subject,
          photo: subjectImage || null,
          subjectMode: subjectMode,
        },
        style: {
          ...formData.style,
          blur: useBlur,
          gradient: useSideGradient,
          gradientColor: gradientColor,
          refImage: styleRefImage || null,
          refInstruction: styleRefInstruction || '',
          extraPrompt: extraPrompt || ''
        },
        composition: {
          ...formData.composition,
          floatingElements: hasFloatingElements
            ? formData.composition.floatingElements
            : '',
        },
      };

      console.log('Sending payload:', JSON.stringify({
        ...payload,
        subject: {
          ...payload.subject,
          photo: payload.subject.photo ? '[BASE64_IMAGE]' : null
        }
      }));

      const safeApiKey = apiKey.trim().replace(/[^\x20-\x7E]/g, '');

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ⚠️ HEADER CORRETO PARA A GOOGLE GEMINI API
          'x-goog-api-key': safeApiKey,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Generation failed');
      }

      const newImage = await response.json();
      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to generate image.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ===== FUNÇÃO DE DOWNLOAD ADAPTADA PARA DATA URL =====
  const handleDownload = async (url: string, id: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `design-builder-${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `design-builder-${id}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const submitRefinement = async () => {
    if (!refineModal.image || !refineModal.instruction) return;
    setIsRefining(true);
    try {
      const safeApiKey = apiKey.trim().replace(/[^ -~]/g, '');
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': safeApiKey },
        body: JSON.stringify({ originalPrompt: refineModal.image.prompt, instructions: refineModal.instruction })
      });
      if (!response.ok) throw new Error('Refine failed');
      const newImage = await response.json();
      setGeneratedImages(prev => [newImage, ...prev]);
      setRefineModal({isOpen: false, image: null, instruction: ''});
    } catch (error) {
      alert('Failed to refine image.');
    } finally {
      setIsRefining(false);
    }
  };

  const convertToVertical = async (image: any) => {
    setIsConverting(image.id);
    try {
      const safeApiKey = apiKey.trim().replace(/[^ -~]/g, '');
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': safeApiKey },
        body: JSON.stringify({ originalPrompt: image.prompt })
      });
      if (!response.ok) throw new Error('Convert failed');
      const newImage = await response.json();
      newImage.isVertical = true;
      setGeneratedImages(prev => [newImage, ...prev]);
    } catch (error) {
      alert('Failed to convert image.');
    } finally {
      setIsConverting(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#d4d4d4] font-sans overflow-hidden">
      
      {/* 1. Left Nav Bar */}
      <nav className="w-64 border-r border-[#1a1a1a] bg-[#0a0a0a] flex flex-col pt-6 pb-4">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center bg-transparent border-t-[2px] border-l-[2px] border-[#a3e635] transform rotate-45 rounded-sm"></div>
          <span className="font-bold text-white tracking-wide">Design Builder</span>
        </div>
        <div className="flex-1 px-3 space-y-1">
          <button className="flex items-center w-full px-3 py-3 rounded-xl hover:bg-[#111] transition-colors gap-3 text-sm font-medium text-[#888] hover:text-white">
            <Compass size={18} /> Explorar
          </button>
          <button className="flex items-center w-full px-3 py-3 rounded-xl bg-[#141414] transition-colors gap-3 text-sm font-semibold text-[#a3e635]">
            <Wand2 size={18} /> Criar
          </button>
          <button className="flex items-center w-full px-3 py-3 rounded-xl hover:bg-[#111] transition-colors gap-3 text-sm font-medium text-[#888] hover:text-white">
            <ImageIcon size={18} /> Minha Galeria
          </button>
        </div>
      </nav>

      {/* 2. Middle Config Pane */}
      <aside className="w-[500px] flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] relative">
        <div className="px-6 py-5 border-b border-[#1a1a1a] flex flex-col gap-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-white border border-[#222] rounded-full pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#b05bff]" 
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#141414] border border-[#222] px-4 py-1.5 rounded-full text-xs font-semibold text-[#d4d4d4] flex items-center gap-3">
              Projeto Alpha
              <button className="text-[#666] hover:text-white"><X size={12} /></button>
            </div>
            <button className="text-[#666] hover:text-white p-1"><Plus size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 relative">
          
          {/* SUJEITO PRINCIPAL */}
          <div className="pb-8">
            <SectionTitle title="SUJEITO PRINCIPAL" />
            
            {/* MODE TOGGLE */}
            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">TIPO DE CRIATIVO</label>
              <div className="flex p-1.5 bg-[#141414] rounded-2xl border border-[#222]">
                <button
                  onClick={() => { setSubjectMode('pessoa'); setSubjectImage(null); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all flex items-center justify-center gap-2",
                    subjectMode === 'pessoa' ? "bg-[linear-gradient(135deg,#7e22ce,#b05bff)] text-white" : "text-[#666] hover:text-[#bbb]"
                  )}
                >
                  👤 Pessoa
                </button>
                <button
                  onClick={() => { setSubjectMode('produto'); setSubjectImage(null); }}
                  className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all flex items-center justify-center gap-2",
                    subjectMode === 'produto' ? "bg-[linear-gradient(135deg,#7e22ce,#b05bff)] text-white" : "text-[#666] hover:text-[#bbb]"
                  )}
                >
                  📦 Produto
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">
                {subjectMode === 'produto' ? 'FOTO DO PRODUTO' : 'FOTOS DO SUJEITO'}
              </label>
              <div className="flex gap-4 items-center">
                {subjectImage && (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#333]">
                    <img src={subjectImage} alt="Subject" className="w-full h-full object-cover" />
                    <button onClick={() => setSubjectImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black transition-colors">
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => subjectInputRef.current?.click()}
                  className={cn(
                    "w-24 h-24 rounded-2xl border-[1.5px] border-dashed flex flex-col items-center justify-center gap-2 hover:bg-[#111] transition-colors",
                    subjectImage ? "border-[#b05bff] bg-[#1a0a2e] text-[#b05bff]" : "border-[#333] bg-transparent text-[#888] hover:border-[#555]"
                  )}
                >
                  <Plus size={18} />
                  <span className="text-[9px] uppercase font-bold tracking-widest">UPLOAD</span>
                </button>
                <input type="file" ref={subjectInputRef} onChange={(e) => handleImageUpload(e, setSubjectImage)} hidden accept="image/*" />
                {subjectImage && subjectMode === 'pessoa' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#b05bff] font-bold uppercase tracking-wider">✓ Foto carregada</span>
                    <span className="text-[10px] text-[#666]">Rosto preservado</span>
                    <span className="text-[10px] text-[#666]">via GPT-4o</span>
                  </div>
                )}
                {subjectImage && subjectMode === 'produto' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#b05bff] font-bold uppercase tracking-wider">✓ Produto carregado</span>
                    <span className="text-[10px] text-[#666]">Gerará layout</span>
                    <span className="text-[10px] text-[#666]">e-commerce premium</span>
                  </div>
                )}
              </div>
            </div>

            {/* Campos apenas para PESSOA */}
            {subjectMode === 'pessoa' && (<>
            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">QUANTIDADE</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setFormData(f => ({...f, subject: {...f.subject, count: n.toString()}}))} className={cn("flex-1 py-3 text-sm font-semibold transition-colors rounded-xl", formData.subject.count === n.toString() ? "bg-[linear-gradient(135deg,#7e22ce,#b05bff)] text-white shadow-[0_4px_15px_rgba(176,91,255,0.2)]" : "bg-transparent text-[#888] hover:bg-[#141414]")}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">GÊNERO</label>
              <div className="flex gap-3">
                <button onClick={() => setFormData(f => ({...f, subject: {...f.subject, gender: 'male'}}))} className={cn("flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all", formData.subject.gender === 'male' ? "bg-white text-black shadow-lg" : "bg-transparent border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ccc]")}>
                  Masculino
                </button>
                <button onClick={() => setFormData(f => ({...f, subject: {...f.subject, gender: 'female'}}))} className={cn("flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all", formData.subject.gender === 'female' ? "bg-white text-black shadow-lg" : "bg-transparent border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ccc]")}>
                  Feminino
                </button>
              </div>
            </div>

            <div className="mb-6">
              <textarea 
                placeholder="Descrição da pose ou roupa (opcional)..."
                value={formData.subject.description}
                onChange={(e) => setFormData(f => ({...f, subject: {...f.subject, description: e.target.value}}))}
                className="w-full h-[88px] rounded-2xl bg-white text-black placeholder:text-[#999] text-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff] resize-none"
              />
            </div>

            <div>
              <div className="flex p-1.5 bg-[#141414] rounded-2xl border border-[#222]">
                {['ESQUERDA', 'CENTRO', 'DIREITA'].map(pos => (
                  <button key={pos} onClick={() => setFormData(f => ({...f, subject: {...f.subject, position: pos.toLowerCase()}}))} className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all", formData.subject.position === pos.toLowerCase() ? "bg-[linear-gradient(135deg,#7e22ce,#b05bff)] text-white shadow-[0_4px_15px_rgba(176,91,255,0.2)]" : "bg-transparent text-[#666] hover:text-[#bbb]")}>
                    {pos}
                  </button>
                ))}
              </div>
            </div>
            </>)}
          </div>

          {/* DIMENSÕES */}
          <div className="pb-8">
            <SectionTitle title="DIMENSÕES" />
            <div className="flex gap-3 justify-between">
              {[
                { id: '9:16', label: 'STORIES (9:16)', icon: '📱' },
                { id: '1:1', label: 'FEED QUADRADO (1:1)', icon: '⬜' },
                { id: '4:5', label: 'FEED RETRATO (4:5)', icon: '🖼️' },
                { id: '16:9', label: 'BACKGROUND / HERO (16:9)', icon: '🖥️' },
              ].map(dim => (
                <button key={dim.id} onClick={() => setFormData(f => ({...f, dimensions: dim.id}))} className="flex flex-col items-center justify-center py-4 flex-1 transition-all group">
                  <div className={cn("text-2xl mb-3 flex items-center justify-center w-12 h-12 rounded-2xl transition-all", formData.dimensions === dim.id ? "text-[#b05bff] bg-[#221033]" : "text-[#555] bg-transparent group-hover:text-[#888]")}>{dim.icon}</div>
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest transition-colors text-center px-2", formData.dimensions === dim.id ? "text-white" : "text-[#555] group-hover:text-[#888]")}>{dim.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TEXTO */}
          <div className="pb-8">
            <SectionTitle title="TEXTO" rightElement={<Toggle checked={hasText} onChange={setHasText} />} />
            {hasText && (
              <div className="space-y-4">
                <input type="text" placeholder="Headline (H1) - Ex: BLACK FRIDAY" value={formData.text.headline} onChange={e => setFormData(f => ({...f, text: {...f.text, headline: e.target.value}}))} className="w-full rounded-2xl bg-white text-black placeholder:text-[#999] text-[13px] font-medium p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff]" />
                <input type="text" placeholder="Subheadline (H2) - Ex: Descontos de até 50%" value={formData.text.subheadline} onChange={e => setFormData(f => ({...f, text: {...f.text, subheadline: e.target.value}}))} className="w-full rounded-2xl bg-white text-black placeholder:text-[#999] text-[13px] font-medium p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff]" />
                <div className="flex gap-2">
                  <input type="text" placeholder="Botão (CTA)" value={formData.text.cta} onChange={e => setFormData(f => ({...f, text: {...f.text, cta: e.target.value}}))} className="flex-1 rounded-2xl bg-[#0e0e0e] border border-[#222] text-white placeholder:text-[#666] text-[13px] font-medium p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff]" />
                  <button className="w-20 rounded-2xl bg-[#141414] border border-[#222] flex flex-col items-center justify-center gap-1 text-[#666] hover:bg-[#1a1a1a] transition-colors">
                    <span className="text-sm">|||</span>
                    <span className="text-[8px] uppercase font-bold tracking-widest">DEGRADÊ</span>
                  </button>
                </div>
                <div className="pt-2">
                  <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">POSIÇÃO DO TEXTO</label>
                  <div className="flex p-1.5 bg-[#0a0a0a] rounded-2xl border border-[#222]">
                    {['ESQUERDA', 'CENTRO', 'DIREITA'].map(pos => (
                      <button key={pos} onClick={() => setFormData(f => ({...f, text: {...f.text, position: pos.toLowerCase()}}))} className={cn("flex-1 py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all", formData.text.position === pos.toLowerCase() ? "bg-[#222] text-white" : "bg-transparent text-[#666] hover:text-[#bbb]")}>
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PROJETO & CENÁRIO */}
          <div className="pb-8">
            <SectionTitle title="PROJETO & CENÁRIO" />
            <div className="space-y-4">
              <input type="text" placeholder="Nicho/Projeto (Ex: Trader de Elite)" value={formData.context.niche} onChange={e => setFormData(f => ({...f, context: {...f.context, niche: e.target.value}}))} className="w-full rounded-2xl bg-white text-black placeholder:text-[#999] text-[13px] font-medium p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff]" />
              <input type="text" placeholder="Ambiente (Ex: Escritório Moderno)" value={formData.context.environment} onChange={e => setFormData(f => ({...f, context: {...f.context, environment: e.target.value}}))} className="w-full rounded-2xl bg-white text-black placeholder:text-[#999] text-[13px] font-medium p-4 focus:outline-none focus:ring-2 focus:ring-[#b05bff]" />
            </div>
            <div className="flex items-center justify-between pt-6">
              <span className="text-[13px] text-[#888] font-medium">Usar fotos de cenário?</span>
              <Toggle checked={hasScenarioPhoto} onChange={setHasScenarioPhoto} />
            </div>
          </div>

          {/* CORES & ILUMINAÇÃO */}
          <div className="pb-8">
            <SectionTitle title="CORES & ILUMINAÇÃO" />
            <div className="space-y-5">
              {[
                { id: 'ambient', label: 'COR DO AMBIENTE', icon: '🎨' },
                { id: 'rim', label: 'LUZ DE RECORTE', icon: '☀️' },
                { id: 'fill', label: 'LUZ COMPLEMENTAR', icon: '✨' },
              ].map(light => (
                <div key={light.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-[42px] h-[42px] rounded-xl border border-[#222] bg-[#141414] flex items-center justify-center text-lg">{light.icon}</div>
                    <label className="text-[11px] text-[#888] font-bold uppercase tracking-widest">{light.label}</label>
                  </div>
                  <div className="w-[180px] h-9 flex items-center p-1 rounded-xl border border-[#222] bg-[#0a0a0a]">
                    <div className="w-full h-full rounded-lg relative overflow-hidden flex items-center justify-center border border-[#1a1a1a]" style={{ backgroundColor: formData.lighting[light.id as keyof typeof formData.lighting] }}>
                      <input type="color" value={formData.lighting[light.id as keyof typeof formData.lighting]} onChange={(e) => setFormData(f => ({...f, lighting: {...f.lighting, [light.id]: e.target.value}}))} className="opacity-0 absolute inset-0 w-[200%] h-[200%] cursor-pointer -translate-x-1/4 -translate-y-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPOSIÇÃO */}
          <div className="pb-8">
            <SectionTitle title="COMPOSIÇÃO" />
            <div className="space-y-3">
              {[
                { id: 'Close-up', label: 'Close-up (Rosto)' },
                { id: 'Medium', label: 'Plano Médio (Busto)' },
                { id: 'Plano Americano', label: 'Plano Americano' },
              ].map(shot => (
                <button key={shot.id} onClick={() => setFormData(f => ({...f, composition: {...f.composition, framing: shot.id}}))} className={cn("w-full rounded-2xl flex items-center p-[18px] gap-4 text-left transition-all border", formData.composition.framing === shot.id ? "bg-[linear-gradient(135deg,#7e22ce,#b05bff)] border-transparent text-white shadow-[0_4px_15px_rgba(176,91,255,0.2)]" : "bg-transparent border-transparent text-neutral-400 hover:bg-[#111]")}>
                  <div className={cn("w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs", formData.composition.framing === shot.id ? "bg-white/20 text-white" : "bg-[#222] text-[#666]")}><User size={14}/></div>
                  <div>
                    <div className="font-bold text-[13px]">{shot.label}</div>
                    <div className={cn("text-[11px] mt-0.5", formData.composition.framing === shot.id ? "text-white/70" : "text-[#555]")}>Foco no enquadramento ideal</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="pt-6 flex items-center justify-between">
              <span className="text-[13px] text-[#888] font-medium">Elementos Flutuantes?</span>
              <Toggle checked={hasFloatingElements} onChange={setHasFloatingElements} />
            </div>
            {hasFloatingElements && (
              <input type="text" placeholder="Ex: Notas de dólar, moedas..." value={formData.composition.floatingElements} onChange={e => setFormData(f => ({...f, composition: {...f.composition, floatingElements: e.target.value}}))} className="w-full mt-4 rounded-2xl bg-transparent border border-[#222] text-white placeholder:text-[#555] text-[13px] p-4 focus:outline-none focus:border-[#b05bff] transition-colors" />
            )}
          </div>

          {/* ESTILO */}
          <div className="pb-28">
            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">REFERÊNCIAS DE ESTILO</label>
              
              {!styleRefImage ? (
                <button 
                  onClick={() => styleRefInputRef.current?.click()}
                  className="w-full py-6 border-[1.5px] border-dashed border-[#222] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#111] transition-colors group"
                >
                  <div className="w-[30px] h-[30px] rounded-full bg-[#1a1a1a] text-[#888] group-hover:text-white flex items-center justify-center font-bold transition-colors"><Plus size={16}/></div>
                  <span className="text-[10px] text-[#666] group-hover:text-[#888] uppercase font-bold tracking-widest transition-colors">ADICIONAR REFERÊNCIA</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="relative w-full rounded-2xl overflow-hidden border border-[#333] bg-[#111]">
                    <img src={styleRefImage} alt="Style Reference" className="w-full h-40 object-cover" />
                    <button 
                      onClick={() => { setStyleRefImage(null); setStyleRefInstruction(''); }} 
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 hover:bg-black transition-colors"
                    >
                      <X size={12} className="text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <span className="text-[10px] text-[#b05bff] font-bold uppercase tracking-wider">✓ Referência carregada</span>
                    </div>
                  </div>
                  
                  <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
                    <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">
                      O QUE REAPROVEITAR DESSA IMAGEM?
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['Fundo/Cenário', 'Iluminação', 'Paleta de cores', 'Composição', 'Estilo visual', 'Elementos flutuantes'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            const current = styleRefInstruction;
                            if (current.includes(opt)) {
                              setStyleRefInstruction(current.replace(opt + ', ', '').replace(', ' + opt, '').replace(opt, '').trim());
                            } else {
                              setStyleRefInstruction(current ? current + ', ' + opt : opt);
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                            styleRefInstruction.includes(opt)
                              ? "bg-[#b05bff] border-[#b05bff] text-white"
                              : "bg-transparent border-[#333] text-[#666] hover:border-[#555] hover:text-[#aaa]"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Ou descreva livremente o que quer reaproveitar... Ex: quero o mesmo fundo escuro com luz roxa vindo de trás"
                      value={styleRefInstruction}
                      onChange={(e) => setStyleRefInstruction(e.target.value)}
                      className="w-full h-20 rounded-xl bg-[#0a0a0a] border border-[#222] text-white placeholder:text-[#444] text-[12px] p-3 focus:outline-none focus:border-[#b05bff] resize-none transition-colors"
                    />
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={styleRefInputRef} 
                onChange={(e) => handleImageUpload(e, setStyleRefImage)} 
                hidden 
                accept="image/*" 
              />
            </div>

            {/* PROMPT ADICIONAL */}
            <div className="mb-6">
              <label className="text-[10px] text-[#888] font-bold mb-3 block uppercase tracking-wider">
                PROMPT ADICIONAL
              </label>
              <div className="relative">
                <textarea
                  placeholder="Descreva qualquer detalhe extra que queira adicionar... Ex: 'quero que ele esteja sorrindo levemente', 'adicione névoa dramática ao fundo', 'estilo anos 80 com cores neon'"
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  className="w-full h-24 rounded-2xl bg-[#0a0a0a] border border-[#333] text-white placeholder:text-[#444] text-[12px] p-4 focus:outline-none focus:border-[#b05bff] resize-none transition-colors"
                />
                {extraPrompt && (
                  <button
                    onClick={() => setExtraPrompt('')}
                    className="absolute top-3 right-3 text-[#555] hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#555] mt-2">
                A IA vai interpretar e integrar seu pedido ao criativo automaticamente.
              </p>
            </div>

            <SectionTitle title="ATRIBUTOS VISUAIS & ESTILO" />
            <div className="bg-[#111]/50 border border-[#1a1a1a] rounded-3xl p-6">
              <div className="mb-8">
                <div className="flex justify-between items-end mb-4">
                  <label className="text-[10px] text-[#888] uppercase tracking-wider font-bold">SOBRIEDADE</label>
                  <span className="text-[12px] text-[#b05bff] font-bold tracking-wide">{formData.style.sobriety < 33 ? 'Criativo' : formData.style.sobriety > 66 ? 'Profissional' : 'Equilibrado'}</span>
                </div>
                <div className="relative pt-1 pb-4">
                  <input type="range" min="0" max="100" value={formData.style.sobriety} onChange={(e) => setFormData(f => ({...f, style: {...f.style, sobriety: parseInt(e.target.value)}}))} className="w-full h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer accent-[#b05bff]" />
                  <div className="absolute top-8 w-full flex justify-between text-[9px] text-[#555] font-bold uppercase tracking-widest">
                    <span>Criativo</span>
                    <span>Profissional</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#888] font-bold uppercase tracking-widest">ATIVAR ESTILO VISUAL</span>
                  <Toggle checked={visualStyleActive} onChange={setVisualStyleActive} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#888] font-medium">Usar Desfoque (Blur)?</span>
                  <Toggle checked={useBlur} onChange={setUseBlur} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#888] font-medium">Usar Degradê?</span>
                  <Toggle checked={useSideGradient} onChange={setUseSideGradient} />
                </div>
                {useSideGradient && (
                  <div className="flex items-center justify-between pl-2 border-l-2 border-[#b05bff]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-[#888] font-bold uppercase tracking-wider">Cor do Degradê</span>
                      <span className="text-[10px] text-[#555]">De baixo para cima, cor → transparente</span>
                    </div>
                    <div className="w-12 h-10 rounded-xl border border-[#333] overflow-hidden relative flex items-center justify-center"
                         style={{ backgroundColor: gradientColor }}>
                      <input
                        type="color"
                        value={gradientColor}
                        onChange={(e) => setGradientColor(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Right Preview Pane */}
      <main className="flex-1 bg-[#000] relative flex flex-col items-center justify-center overflow-y-auto">
        {/* API Key top right */}
        <div className="absolute top-5 right-6 z-10 flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 bg-[#111] border rounded-2xl px-4 py-2.5 transition-all",
            apiKeyStatus === 'ok' ? "border-[#a3e635]" : apiKeyStatus === 'error' ? "border-red-500" : "border-[#222]"
          )}>
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", 
              apiKeyStatus === 'ok' ? "bg-[#a3e635]" : 
              apiKeyStatus === 'error' ? "bg-red-500" : 
              apiKeyStatus === 'testing' ? "bg-yellow-400 animate-pulse" : "bg-[#333]"
            )} />
            <input
              type="password"
              placeholder="Cole sua API Key do Gemini aqui"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeyStatus('idle');
              }}
              onBlur={async () => {
                if (!apiKey || apiKey.length < 8) return;
                setApiKeyStatus('testing');
                try {
                  const res = await fetch('/api/validate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey })
                  });
                  setApiKeyStatus(res.ok ? 'ok' : 'error');
                } catch {
                  setApiKeyStatus('error');
                }
              }}
              className="bg-transparent text-[11px] text-white placeholder:text-[#555] focus:outline-none w-56"
            />
            {apiKeyStatus === 'ok' && <span className="text-[10px] text-[#a3e635] font-bold">✓ CONECTADO</span>}
            {apiKeyStatus === 'error' && <span className="text-[10px] text-red-400 font-bold">✗ INVÁLIDA</span>}
          </div>
        </div>

        {generatedImages.length === 0 ? (
          <div className="flex items-center justify-center h-full w-full">
            <div className="flex flex-col items-center justify-center text-[#333]">
              <div className="w-16 h-16 border-[1.5px] border-[#222] rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.02)]">
                <ImageIcon size={24} className="text-[#444]"/>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#444]">AGUARDANDO CRIAÇÃO</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
              {generatedImages.map((img) => (
                <div key={img.id} className={cn("group relative rounded-3xl overflow-hidden border border-[#222] bg-[#111] shadow-2xl", img.isVertical ? "row-span-2 aspect-[9/16]" : "aspect-square")}>
                  <img src={img.url} alt="Generated Visual" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                    <p className="text-[11px] text-white/80 line-clamp-3 mb-4 leading-relaxed font-medium bg-black/40 p-3 rounded-xl backdrop-blur-md border border-white/5">{img.prompt}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(img.url, img.id)} className="flex-1 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors">Baixar</button>
                      <button onClick={() => setRefineModal({isOpen: true, image: img, instruction: ''})} className="flex-1 py-2 bg-[#b05bff] text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors">Refinar</button>
                      {!img.isVertical && (
                        <button onClick={() => convertToVertical(img)} disabled={isConverting === img.id} className="min-w-[50px] bg-[#222] text-white text-[11px] font-bold uppercase rounded-xl border border-[#333] hover:bg-[#333] transition-colors disabled:opacity-50">
                          9:16
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bar */}
      <div className="absolute bottom-0 left-[256px] w-[500px] p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pointer-events-none z-20">
        <button 
          onClick={handleGenerateImage}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#a3e635] hover:bg-[#91ce2f] rounded-2xl text-black font-extrabold text-[13px] uppercase tracking-wider shadow-[0_0_20px_rgba(163,230,53,0.2)] transition-all pointer-events-auto disabled:opacity-70 disabled:grayscale"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {subjectMode === 'produto' ? 'Criando layout do produto...' : subjectImage ? 'Gerando com seu rosto...' : 'Gerando Magia...'}
            </span>
          ) : (
            subjectMode === 'produto' && subjectImage ? '📦 Gerar Layout do Produto' :
            subjectMode === 'pessoa' && subjectImage ? '✦ Gerar com Meu Rosto' : 'Gerar Imagem'
          )}
        </button>
      </div>

      {refineModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-white">Refinar Imagem</h3>
            <p className="text-sm text-[#888] mb-6">Insira instruções para modificar o design, preservando a composição geral.</p>
            <textarea 
              value={refineModal.instruction} 
              onChange={(e) => setRefineModal(f => ({...f, instruction: e.target.value}))}
              placeholder="Ex: alterar fundo para pôr do sol..."
              className="w-full h-32 bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-[#b05bff] focus:outline-none resize-none mb-6"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRefineModal({isOpen: false, image: null, instruction: ''})} className="px-5 py-2.5 text-sm font-semibold text-[#888] hover:text-white transition-colors">Cancelar</button>
              <button onClick={submitRefinement} disabled={isRefining || !refineModal.instruction} className="px-6 py-2.5 bg-[#b05bff] text-white text-sm font-bold rounded-xl hover:bg-[#9b4add] transition-colors disabled:opacity-50">
                {isRefining ? 'Aplicando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
