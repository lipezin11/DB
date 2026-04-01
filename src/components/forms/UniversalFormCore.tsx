'use client';

import { useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { UniversalFormData } from '@/hooks/useUniversalForm';
import { Plus, Loader2, Copy, Sparkles, Smartphone, Monitor, Square, GripVertical, Droplet, Paintbrush, Sun, SunMoon, Type } from 'lucide-react';
import { SharedUploadEngine, UploadedReference } from '@/components/forms/SharedUploadEngine';

interface UniversalFormCoreProps {
  formData: UniversalFormData;
  updateForm: (updater: (prev: UniversalFormData) => Partial<UniversalFormData>) => void;
  children?: ReactNode;
  onGenerate: () => void;
  isGenerating: boolean;
  generateLabel?: ReactNode;
  subjectRefs: UploadedReference[];
  setSubjectRefs: (refs: UploadedReference[]) => void;
  styleRefs: UploadedReference[];
  setStyleRefs: (refs: UploadedReference[]) => void;
}

const NativeSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button 
     onClick={onChange} 
     className={cn("w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer flex items-center shrink-0 border border-white/5", checked ? "bg-white" : "bg-white/5")}
  >
     <div className={cn("w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-xl", checked ? "translate-x-4 bg-black" : "translate-x-0 bg-zinc-700")} />
  </button>
);

const SectionHeader = ({ id, title, icon: Icon, colorClass = "text-[#a855f7]" }: { id: string, title: string, icon?: any, colorClass?: string }) => (
  <div className="flex items-center gap-4 px-1 border-l-2 border-[#a855f7]/50 pl-4 py-2 bg-gradient-to-r from-[#a855f7]/5 to-transparent mb-6">
    {Icon && <Icon size={14} className={colorClass + " drop-shadow-[0_0_5px_currentColor]"} />}
    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/90">{title}</span>
  </div>
);

export function UniversalFormCore({
  formData, updateForm, children, onGenerate, isGenerating, generateLabel,
  subjectRefs, setSubjectRefs, styleRefs, setStyleRefs
}: UniversalFormCoreProps) {
  
  const ctxPhotosRef = useRef<HTMLInputElement>(null);
  const floatingElemRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col space-y-16 pb-40 w-full animate-fade-up relative">
        {/* Pro Industrial Grid Background */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]">
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>
       {/* 1. SUBJECT */}
       <div className="space-y-10 group/section">
          <SectionHeader id="subject" title="Genetic Subject DNA" />
          
          <div className="bg-white/[0.02] rounded-[32px] p-6 border border-white/5 ring-1 ring-white/[0.02] shadow-2xl transition-all group-hover/section:border-[#a855f7]/20">
             <SharedUploadEngine references={subjectRefs} onChange={setSubjectRefs} maxFiles={5} title="" hideInstructions={true} />
          </div>

          <div className="grid grid-cols-2 gap-10 px-2">
             <div className="space-y-4">
                <label className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.3em] px-1 flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-[#a855f7]" /> Scale / Count
                </label>
                <div className="flex gap-1.5 h-9 bg-white/[0.01] p-1 rounded-xl border border-white/[0.03]">
                  {['1','2','3'].map(n => (
                    <button key={n} onClick={() => updateForm(f => ({ subject: { ...f.subject, count: n } }))} className={cn("flex-1 rounded-lg text-[10px] font-black transition-all", formData.subject.count === n ? "bg-white text-black shadow-2xl" : "text-zinc-500 hover:text-white")}>{n}</button>
                  ))}
                </div>
             </div>
             <div className="space-y-3">
                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest px-1">Gender</label>
                <div className="flex gap-1.5 h-9 bg-white/[0.01] p-1 rounded-xl border border-white/[0.03]">
                  {['Masculino','Feminino'].map(g => (
                    <button key={g} onClick={() => updateForm(f => ({ subject: { ...f.subject, gender: g.toLowerCase() as any } }))} className={cn("flex-1 rounded-lg text-[9px] font-black transition-all", formData.subject.gender === g.toLowerCase() ? "bg-white text-black shadow-2xl" : "text-zinc-500 hover:text-white")}>
                       {g.charAt(0)}
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="px-1 space-y-3">
             <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest px-1">Pose & Trait Intel</label>
             <textarea 
                placeholder="Ex: Confident pose, looking at camera, cyberpunk glasses..." 
                value={formData.subject.description} 
                onChange={e => updateForm(f => ({ subject: { ...f.subject, description: e.target.value } }))} 
                className="w-full bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5 text-[10px] text-zinc-400 placeholder:text-zinc-800 min-h-[80px] focus:outline-none focus:border-white/10 transition-all font-medium leading-relaxed" 
             />
          </div>
       </div>

       {/* 2. TEXT (CONDITIONAL) */}
       <div className="space-y-10 group/section">
          <div className="flex items-center justify-between px-1">
             <SectionHeader id="text" title="Typography Control Module" icon={Type} />
             <NativeSwitch checked={formData.text.active} onChange={() => updateForm(f => ({ text: { ...f.text, active: !f.text.active } }))} />
          </div>
          
          {formData.text.active && (
            <div className="space-y-6 px-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-white/[0.01] p-8 rounded-[32px] border border-white/5 ring-1 ring-white/[0.02]">
               <div className="relative group">
                  <input type="text" placeholder="Headline (H1)" value={formData.text.headline} onChange={e => updateForm(f => ({ text: { ...f.text, headline: e.target.value } }))} className="w-full bg-transparent border-b border-white/[0.05] focus:border-[#a855f7] p-3 text-xs text-white placeholder:text-zinc-800 transition-all focus:outline-none" />
                  <div className="absolute bottom-0 left-0 h-[100%] w-[1px] bg-gradient-to-t from-[#a855f7] to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
               </div>
               <input type="text" placeholder="Subheadline (H2)" value={formData.text.subheadline} onChange={e => updateForm(f => ({ text: { ...f.text, subheadline: e.target.value } }))} className="w-full bg-transparent border-b border-white/[0.05] focus:border-[#a855f7] p-3 text-xs text-zinc-400 placeholder:text-zinc-800 transition-all focus:outline-none mt-2" />
               
               <div className="pt-6 space-y-4">
                  <label className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.3em] px-1">Optic Alignment</label>
                  <div className="flex bg-white/[0.02] p-1.5 rounded-2xl gap-2 border border-white/5">
                    {['Esquerda','Centro','Direita'].map(pos => (
                      <button key={pos} onClick={() => updateForm(f => ({ text: { ...f.text, position: pos.toLowerCase() as any } }))} className={cn("flex-1 py-3 rounded-xl text-[8px] font-black uppercase transition-all tracking-widest", formData.text.position === pos.toLowerCase() ? "bg-white text-black shadow-2xl scale-[1.02]" : "text-zinc-600 hover:text-white")}>{pos}</button>
                    ))}
                  </div>
               </div>
            </div>
          )}
       </div>

       {/* 3. SCENARIO & ATMOSPHERE */}
       <div className="space-y-10 group/section">
          <SectionHeader id="scenario" title="Biosphere Grid" />
          <div className="px-5 py-8 space-y-6 bg-white/[0.02] border border-white/5 rounded-[32px] ring-1 ring-white/[0.02]">
             <div className="space-y-2">
                <label className="text-[7.5px] font-black uppercase text-zinc-500 tracking-[0.3em] px-1">Visual Context</label>
                <input type="text" placeholder="e.g. Modern Office" value={formData.context.niche} onChange={e => updateForm(f => ({ context: { ...f.context, niche: e.target.value } }))} className="w-full bg-transparent border-b border-white/[0.05] focus:border-[#a855f7] p-3 text-xs text-white placeholder:text-zinc-800 transition-all focus:outline-none" />
             </div>
             <div className="space-y-2">
                <label className="text-[7.5px] font-black uppercase text-zinc-500 tracking-[0.3em] px-1">Environmental Atmosphere</label>
                <input type="text" placeholder="e.g. Cinematic fog" value={formData.context.environment} onChange={e => updateForm(f => ({ context: { ...f.context, environment: e.target.value } }))} className="w-full bg-transparent border-b border-white/[0.05] focus:border-[#a855f7] p-3 text-xs text-white placeholder:text-zinc-800 transition-all focus:outline-none mt-2" />
             </div>
          </div>
       </div>

       {/* 4. LIGHTING */}
       <div className="space-y-10 group/section">
          <SectionHeader id="lighting" title="Photon DNA" icon={Sun} colorClass="text-amber-500" />
          <div className="grid grid-cols-3 gap-8 px-2">
             {[
               { id: 'ambient', label: 'Ambient', icon: Droplet },
               { id: 'rim', label: 'Rim', icon: Sun },
               { id: 'fill', label: 'Fill', icon: SunMoon },
             ].map(light => (
               <div key={light.id} className="space-y-4">
                  <label className="text-[7.5px] font-black uppercase text-zinc-500 tracking-[0.4em] text-center block">{light.label}</label>
                  <div className="relative group aspect-square rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden transition-all hover:border-[#a855f7]/40 ring-1 ring-white/[0.02] shadow-2xl" style={{ backgroundColor: (formData.lighting as any)[light.id] }}>
                     <input type="color" value={(formData.lighting as any)[light.id]} onChange={e => updateForm(f => ({ lighting: { ...f.lighting, [light.id]: e.target.value } }))} className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer opacity-0" />
                     <light.icon size={16} className="text-white/30 group-hover:text-white/60 transition-colors z-10 pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                  </div>
               </div>
             ))}
          </div>
       </div>

       {/* 5. MASTERY STYLE */}
       <div className="space-y-10 group/section">
          <SectionHeader id="style" title="Aesthetic Interpolation" />
          <div className="bg-white/[0.02] rounded-[40px] p-8 border border-white/5 ring-1 ring-white/[0.02] shadow-2xl relative overflow-hidden">
             {/* Local Grid Overlay */}
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#a855f7_1px,transparent_1px)] bg-[size:10px_10px]" />
             
             <SharedUploadEngine references={styleRefs} onChange={setStyleRefs} maxFiles={3} title="" description="Style DNA references." />
             
             <div className="mt-12 space-y-6 px-2 relative z-10">
                <div className="flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-white tracking-[0.3em]">Neural Drift Stability</span>
                      <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest">Interpolation Coefficient</span>
                   </div>
                   <span className="text-[#a855f7] font-mono text-xs font-black drop-shadow-[0_0_10px_#a855f7]">{formData.style.sobriety}%</span>
                </div>
                <input type="range" min="0" max="100" value={formData.style.sobriety} onChange={e => updateForm(f => ({ style: { ...f.style, sobriety: parseInt(e.target.value) } }))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#a855f7]" />
             </div>

             <div className="mt-10 grid grid-cols-2 gap-4 relative z-10">
                <div className="flex items-center justify-between bg-white/[0.01] p-5 rounded-2xl border border-white/5">
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Optic Blur</span>
                   <NativeSwitch checked={formData.style.useBlur} onChange={() => updateForm(f => ({ style: { ...f.style, useBlur: !f.style.useBlur } }))} />
                </div>
                <div className="flex items-center justify-between bg-white/[0.01] p-5 rounded-2xl border border-white/5">
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Side Gradient</span>
                   <NativeSwitch checked={formData.style.useSideGradient} onChange={() => updateForm(f => ({ style: { ...f.style, useSideGradient: !f.style.useSideGradient } }))} />
                </div>
             </div>
          </div>
       </div>

       {/* 6. PROMPT ADICIONAL */}
       <div className="space-y-10 group/section">
          <div className="flex items-center justify-between px-1">
             <SectionHeader id="extra" title="Direct Prompt Override" icon={Paintbrush} />
             <NativeSwitch checked={formData.prompt.active} onChange={() => updateForm(f => ({ prompt: { ...f.prompt, active: !f.prompt.active } }))} />
          </div>
          {formData.prompt.active && (
             <div className="relative group animate-in zoom-in-95 duration-500">
                <textarea placeholder="Direct prompt override..." value={formData.prompt.text} onChange={e => updateForm(f => ({ prompt: { ...f.prompt, text: e.target.value } }))} className="w-full bg-white/[0.02] border border-white/5 rounded-[32px] p-8 text-[10px] text-zinc-300 placeholder:text-zinc-800 min-h-[150px] focus:outline-none focus:border-[#a855f7]/50 transition-all leading-relaxed font-medium" />
                <div className="absolute top-4 right-6 flex gap-1 items-center">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
                   <span className="text-[7px] font-black text-[#a855f7] uppercase tracking-widest">Manual Mode</span>
                </div>
             </div>
          )}
       </div>

       {/* INJEÇÃO DE CAMPOS EXCLUSIVOS DO APLICATIVO */}
       {children && (
          <div className="pt-8 w-full border-t border-white/[0.05]">
             <div className="mb-8">
               <SectionHeader id="exclusive" title="Exclusive Agent Controls" />
             </div>
             {children}
          </div>
       )}

       {/* GENERATE ACTION */}
       <div className="space-y-4 pt-12">
           <button 
             onClick={onGenerate} 
             disabled={isGenerating} 
             className="w-full h-16 bg-white text-black rounded-full flex items-center justify-center gap-4 font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
           >
             {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={18} />}
             {isGenerating ? 'Forging...' : (generateLabel || 'Initiate Generation')}
           </button>
           
           <button 
             onClick={() => navigator.clipboard.writeText(JSON.stringify(formData, null, 2))}
             className="w-full py-4 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-white transition-colors flex items-center justify-center gap-2"
           >
             <Copy size={12} className="opacity-30" /> Export DNA
           </button>
       </div>

    </div>
  );
}
