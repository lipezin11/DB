'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, Plus, X, Copy } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { GalleryV2 } from '@/components/ui/GalleryV2';
import { initialUniversalData, UniversalFormData } from '@/hooks/useUniversalForm';
import { UniversalFormCore } from '@/components/forms/UniversalFormCore';
import { UploadedReference } from '@/components/forms/SharedUploadEngine';
import { cn } from '@/lib/utils';

type Project = {
  id: string;
  name: string;
  formData: UniversalFormData;
  subjectRefs: UploadedReference[];
  styleRefs: UploadedReference[];
  creativity: 'BAIXO' | 'MÉDIO' | 'ALTO';
};

export default function RefBuilderPage() {
  const { apiKey, addGeneratedImage } = useAppContext();
  
  const [projects, setProjects] = useState<Project[]>([
    { id: 'p1', name: 'Fusão 1', formData: initialUniversalData, subjectRefs: [], styleRefs: [], creativity: 'MÉDIO' }
  ]);
  const [activeProjectId, setActiveProjectId] = useState('p1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formWidth, setFormWidth] = useState(450);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const updateActiveProject = useCallback((updater: (prev: Project) => Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, ...updater(p) } : p));
  }, [activeProjectId]);

  const createNewProject = useCallback(() => {
    setProjects(prev => {
      const newId = Math.random().toString(36).substr(2, 9);
      const newProject: Project = { 
        id: newId, 
        name: `Fusão ${prev.length + 1}`, 
        formData: JSON.parse(JSON.stringify(initialUniversalData)), 
        subjectRefs: [], 
        styleRefs: [],
        creativity: 'MÉDIO'
      };
      setTimeout(() => setActiveProjectId(newId), 0);
      return [...prev, newProject];
    });
  }, []);

  useEffect(() => {
    const handleNew = () => createNewProject();
    window.addEventListener('forge-new-project', handleNew);
    return () => window.removeEventListener('forge-new-project', handleNew);
  }, [createNewProject]);

  const handleGenerateImage = async () => {
    if (!apiKey) return alert('API Key Gemini necessária.');
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          ...activeProject.formData,
          appType: 'ref',
          style: {
            ...activeProject.formData.style,
            refImage: activeProject.subjectRefs.length > 0 ? activeProject.subjectRefs[0].url : (activeProject.styleRefs.length > 0 ? activeProject.styleRefs[0].url : null),
            extraPrompt: `[CREATIVITY: ${activeProject.creativity}] ` + activeProject.formData.prompt.text,
          }
        })
      });
      const data = await response.json();
      addGeneratedImage({ ...data, appType: 'ref', date: new Date().toISOString() });
    } catch (e) {
      alert('Erro na fusão');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-black p-4 lg:p-6 overflow-hidden gap-6">
      <div 
         style={{ width: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : formWidth, minWidth: 350, maxWidth: '60vw' }} 
         className="flex flex-col relative shrink-0 h-full"
      >
         {/* TABS COMPONENT */}
         <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 no-scrollbar px-1">
            {projects.map((p) => {
              const isActive = activeProjectId === p.id;
              return (
                <div 
                  key={`project-tab-${p.id}`}
                  onClick={() => setActiveProjectId(p.id)}
                  className={cn(
                    "group relative flex items-center gap-4 px-6 py-3 rounded-2xl transition-all cursor-pointer border whitespace-nowrap overflow-hidden transition-all duration-500",
                    isActive 
                    ? "bg-white/[0.03] border-white/10 text-white shadow-2xl" 
                    : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="tab-neural-ball"
                      className="absolute left-3 w-1.5 h-1.5 bg-[#a855f7] rounded-full shadow-[0_0_15px_#a855f7]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.25em] transition-all", isActive && "pl-2")}>{p.name}</span>
                  {projects.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setProjects(ps => ps.filter(proj => proj.id !== p.id)); }} 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all active:scale-90"
                    >
                      <X size={10}/>
                    </button>
                   )}
                </div>
              );
            })}
            <button onClick={createNewProject} className="p-2 aspect-square rounded-xl border border-white/[0.05] text-zinc-500 hover:text-white transition-all active:scale-95"><Plus size={14} /></button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
            <UniversalFormCore 
              formData={activeProject.formData} 
              updateForm={(updater) => updateActiveProject(p => ({ formData: { ...p.formData, ...updater(p.formData) } }))}
              isGenerating={isGenerating}
              onGenerate={handleGenerateImage}
              subjectRefs={activeProject.subjectRefs}
              setSubjectRefs={(refs) => updateActiveProject(() => ({ subjectRefs: refs }))}
              styleRefs={activeProject.styleRefs}
              setStyleRefs={(refs) => updateActiveProject(() => ({ styleRefs: refs }))}
              generateLabel={<><Compass size={16}/> Forge Fusion</>}
            >
               {/* CUSTOM REF CONTROLS */}
               <div className="space-y-4 pt-6 mt-6 border-t border-white/[0.05]">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">AI Hallucination Level</label>
                  <div className="flex bg-white/[0.02] p-1 rounded-xl gap-1 border border-white/[0.05]">
                    {['BAIXO', 'MÉDIO', 'ALTO'].map(level => (
                       <button key={level} onClick={() => updateActiveProject(() => ({ creativity: level as any }))} className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all", activeProject.creativity === level ? "bg-white text-black shadow-md px-4" : "text-zinc-600 hover:text-white")}>{level}</button>
                    ))}
                  </div>
               </div>
            </UniversalFormCore>
         </div>

         <div 
           className="hidden lg:flex absolute right-0 top-16 bottom-0 w-1 cursor-col-resize hover:bg-[#a855f7]/20 z-10 transition-colors group items-center justify-center"
           onMouseDown={(e) => {
             e.preventDefault();
             const startX = e.clientX;
             const startW = formWidth;
             const onMove = (me: MouseEvent) => setFormWidth(Math.max(350, Math.min(window.innerWidth * 0.6, startW + (me.clientX - startX))));
             const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
             window.addEventListener('mousemove', onMove);
             window.addEventListener('mouseup', onUp);
           }}
         >
           <div className="h-20 w-0.5 bg-white/5 group-hover:bg-white/20 rounded-full" />
         </div>
      </div>

      <div className="flex-1 h-full min-w-0 flex flex-col relative lg:pl-6 lg:border-l border-white/5 pb-24 overflow-y-auto custom-scrollbar">
        <GalleryV2 
          isGenerating={isGenerating} 
          defaultFilter="ref" 
          onRefine={async () => {}}
          onUseAsSubject={(url) => updateActiveProject(p => ({ subjectRefs: [{ id: Math.random().toString(), url, instruction: 'Subject Neural' }, ...p.subjectRefs] }))}
          onUseAsStyle={(url) => updateActiveProject(p => ({ styleRefs: [{ id: Math.random().toString(), url, instruction: 'Style Neural' }, ...p.styleRefs] }))}
        />
      </div>
    </div>
  );
}
