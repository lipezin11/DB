'use client';

import { GalleryV2 } from '@/components/ui/GalleryV2';

export default function GlobalGalleryPage() {
  return (
    <div className="h-full p-8 lg:p-12 overflow-hidden flex flex-col bg-black">
       <div className="mb-8">
         <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
           Neural Vault <span className="text-[#a855f7] font-normal ml-3">/ Global</span>
         </h1>
         <p className="text-zinc-500 mt-2 font-black uppercase text-[10px] tracking-widest">
           Baú de Criações - Histórico Completo
         </p>
       </div>
       <div className="flex-1 w-full relative">
         <GalleryV2 isGenerating={false} defaultFilter="all" />
       </div>
    </div>
  );
}
