'use client';
import { Home, Globe, Sparkles, Minimize, Settings, Plus, Box } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const isDashboard = pathname === '/';

  const handleNewProject = () => {
    if (isDashboard) {
      setShowNewProjectModal(true);
    } else {
      window.dispatchEvent(new CustomEvent('forge-new-project'));
    }
  };

  const menuItems = [
    { href: '/', icon: Home, label: 'Dashboard' },
    { href: '/gallery', icon: Globe, label: 'Gallery' },
    { href: '/design', icon: Sparkles, label: 'Design' },
    { href: '/optimizer', icon: Minimize, label: 'Optimizer' },
  ];

  return (
    <>
      <div className="hidden md:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col items-center gap-7 p-3 bg-[#111] border border-white/5 rounded-full z-[100] backdrop-blur-xl shadow-2xl">
         {/* Top Dot Indicator */}
         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 relative">
            <div className="w-4 h-4 rounded-full bg-zinc-600 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]" />
         </div>

         {/* Animated Menu Items */}
         <div className="flex flex-col gap-4 py-2 relative">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors relative group",
                    isActive ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-pill"
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <div className="relative z-10">
                    <Icon size={18} className={cn("transition-transform duration-300", isActive && "scale-110")} />
                  </div>
                </Link>
              );
            })}
         </div>

         {/* New Project Button */}
         <div 
           onClick={handleNewProject}
           className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-500 hover:text-white transition-all cursor-pointer border border-white/5 active:scale-95 group"
         >
            <Plus size={18} className={cn(!isDashboard && "text-white group-hover:rotate-90 transition-transform duration-500")} />
         </div>

         {/* Bottom Icon */}
         <div className="w-10 h-10 flex items-center justify-center text-emerald-500/80 cursor-pointer mt-1 hover:scale-110 transition-transform">
            <Box size={18} />
         </div>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
             >
                <div className="col-span-full flex justify-between items-center mb-4">
                   <h2 className="text-2xl font-black tracking-tighter text-white uppercase tracking-[0.2em]">Select Agent</h2>
                   <button onClick={() => setShowNewProjectModal(false)} className="text-zinc-500 hover:text-white font-bold uppercase text-[9px] tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">Close [ESC]</button>
                </div>
                
                {[
                  { id: '/design', label: 'Design Builder', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { id: '/ref', label: 'Ref Builder', icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { id: '/product', label: 'Product Builder', icon: Box, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                  { id: '/bg', label: 'Background AI', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map(app => (
                  <button 
                    key={app.id} 
                    onClick={() => { router.push(app.id); setShowNewProjectModal(false); }}
                    className="group bg-[#111] border border-white/5 p-8 rounded-3xl text-left hover:bg-white/[0.02] hover:border-white/20 transition-all flex flex-col gap-6"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", app.bg)}>
                       <app.icon size={24} className={app.color} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight">{app.label}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Surgical Generation</p>
                    </div>
                  </button>
                ))}
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
