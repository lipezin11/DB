'use client';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const APPS = [
  {
    id: 'design',
    path: '/',
    icon: '✨',
    label: 'Design Builder',
    sub: 'Genérico',
    activeColor: 'bg-gradient-to-br from-[#7C3AED] to-[#A855F7]',
    glow: 'shadow-[0_0_20px_rgba(124,58,237,0.5)]',
    borderActive: 'border-[#7C3AED]/40',
  },
  {
    id: 'art',
    path: '/art',
    icon: '🎨',
    label: 'Art Builder',
    sub: 'Posts & Ads',
    activeColor: 'bg-gradient-to-br from-[#F59E0B] to-[#EF4444]',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
    borderActive: 'border-[#F59E0B]/40',
  },
  {
    id: 'bg',
    path: '/bg',
    icon: '🖼️',
    label: 'BG Builder',
    sub: 'Backgrounds',
    activeColor: 'bg-gradient-to-br from-[#3B82F6] to-[#06B6D4]',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    borderActive: 'border-[#3B82F6]/40',
  },
  {
    id: 'ref',
    path: '/ref',
    icon: '📌',
    label: 'Ref Builder',
    sub: 'Moodboards',
    activeColor: 'bg-gradient-to-br from-[#10B981] to-[#06B6D4]',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    borderActive: 'border-[#10B981]/40',
  },
] as const;

export default function AppDock() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-20 z-50 flex flex-col gap-1">
      <div className="px-2 pb-1">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#2a2a2a]">Apps</span>
      </div>
      <div className="flex flex-col gap-1.5 p-2 bg-[#080808]/95 backdrop-blur-xl border border-white/[0.04] rounded-2xl shadow-2xl">
        {APPS.map((app) => {
          const isActive = pathname === app.path;
          return (
            <button
              key={app.id}
              onClick={() => router.push(app.path)}
              title={`${app.label} — ${app.sub}`}
              className={cn(
                'group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 border',
                isActive
                  ? `${app.activeColor} ${app.glow} scale-105 border-transparent`
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.04] hover:border-white/10'
              )}
            >
              <span className="text-lg leading-none">{app.icon}</span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <div className="px-3 py-1.5 bg-[#111] border border-[#222] rounded-lg shadow-xl whitespace-nowrap">
                  <p className="text-white text-[10px] font-bold uppercase tracking-wider">{app.label}</p>
                  <p className="text-[#555] text-[9px] uppercase tracking-wider">{app.sub}</p>
                  {isActive && <p className="text-[#A855F7] text-[9px] font-bold mt-0.5">● ATIVO</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
