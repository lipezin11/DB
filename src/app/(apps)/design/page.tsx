'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, X, Copy } from 'lucide-react';
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
};

export default function DesignBuilderPage() {
  const { apiKey, addGeneratedImage } = useAppContext();
  
  const [projects, setProjects] = useState<Project[]>([
    { id: 'p1', name: 'Projeto 1', formData: initialUniversalData, subjectRefs: [], styleRefs: [] }
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
        name: `Projeto ${prev.length + 1}`, 
        formData: JSON.parse(JSON.stringify(initialUniversalData)), 
        subjectRefs: [], 
        styleRefs: [] 
      };
      setTimeout(() => setActiveProjectId(newId), 0);
      return [...prev, newProject];
    });
  }, []);

  const duplicateProject = useCallback((id: string) => {
    const source = projects.find(p => p.id === id);
    if (!source) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newProject: Project = { 
      ...JSON.parse(JSON.stringify(source)), 
      id: newId, 
      name: `${source.name} (Cópia)` 
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newId);
  }, [projects]);

  useEffect(() => {
    const handleNew = () => createNewProject();
    window.addEventListener('forge-new-project', handleNew);
    return () => window.removeEventListener('forge-new-project', handleNew);
  }, [createNewProject]);

  const handleGenerateImage = async () => {
    if (!apiKey) return alert('API Key Gemini necessária.');
    setIsGenerating(true);
    try {
      const payload = {
        appType: 'design',
        subject: {
          gender: activeProject.formData.subject.gender === 'masculino' ? 'Masculino' : 'Feminino',
          count: activeProject.formData.subject.count,
          photo: activeProject.subjectRefs.length > 0 ? activeProject.subjectRefs[0].url : null,
          photos: activeProject.subjectRefs.map(r => r.url),
          description: `[POSE]: ${activeProject.formData.subject.description}\n[DNA]: ${activeProject.subjectRefs.map((r)=>r.instruction).join(' / ')}`,
        },
        context: {
          niche: activeProject.formData.context.niche,
          environment: activeProject.formData.context.environment,
        },
        lighting: activeProject.formData.lighting,
        style: {
          ...activeProject.formData.style,
          refImage: activeProject.styleRefs.length > 0 ? activeProject.styleRefs[0].url : null,
          extraPrompt: activeProject.formData.prompt.text,
        },
        dimensions: activeProject.formData.dimensions.format,
        textSettings: activeProject.formData.text.active ? activeProject.formData.text : null,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(payload)
      });
      
      const newImage = await response.json();
      addGeneratedImage({
        ...newImage,
        appType: 'design',
        dimensions: activeProject.formData.dimensions.format,
        date: new Date().toISOString()
      });
    } catch (error: any) {
      alert('Erro na geração.');
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
         <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 no-scrollbar px-1">
            {projects.map((p) => {
              const isActive = activeProjectId === p.id;
              return (
                <div 
                  key={`project-tab-${p.id}`}
                  onClick={() => setActiveProjectId(p.id)}
                  className={cn(
                    "group relative flex items-center gap-4 px-6 py-3 rounded-2xl transition-all cursor-pointer border whitespace-nowrap overflow-hidden",
                    isActive 
                    ? "bg-white/[0.03] border-white/10 text-white" 
                    : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {/* Neural Ball Animation (Shared Layout) */}
                  {isActive && (
                    <motion.div 
                      layoutId="tab-neural-ball"
                      className="absolute left-3 w-1.5 h-1.5 bg-[#a855f7] rounded-full shadow-[0_0_15px_#a855f7]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.25em] transition-all", isActive && "pl-2")}>{p.name}</span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); duplicateProject(p.id); }} className="hover:text-white transition-colors"><Copy size={11}/></button>
                     {projects.length > 1 && <button onClick={(e) => { e.stopPropagation(); setProjects(ps => ps.filter(proj => proj.id !== p.id)); }} className="hover:text-red-500 transition-colors"><X size={11}/></button>}
                  </div>
                </div>
              );
            })}
            <button onClick={createNewProject} className="p-2 rounded-xl border border-white/[0.05] text-zinc-500 hover:text-white ml-2"><Plus size={14} /></button>
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
              generateLabel={<><Sparkles size={16}/> Forge Project</>}
            />
         </div>
      </div>

      <div className="flex-1 h-full min-w-0 flex flex-col relative lg:pl-6 lg:border-l border-white/5 pb-24 overflow-y-auto custom-scrollbar">
        <GalleryV2 
          isGenerating={isGenerating} 
          defaultFilter="design" 
          onUseAsSubject={(url) => updateActiveProject(p => ({ subjectRefs: [{ id: Math.random().toString(), url, instruction: 'Subject Neural' }, ...p.subjectRefs] }))}
          onUseAsStyle={(url) => updateActiveProject(p => ({ styleRefs: [{ id: Math.random().toString(), url, instruction: 'Style Neural' }, ...p.styleRefs] }))}
        />
      </div>
    </div>
  );
}
