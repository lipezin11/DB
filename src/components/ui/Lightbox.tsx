'use client';
import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface LightboxProps {
  image: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function Lightbox({ image, onClose, onDownload }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => {
      const newScale = prev - e.deltaY * 0.005;
      return Math.min(Math.max(1, newScale), 5); // Max 5x zoom, Min 1x
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="absolute top-8 right-8 flex items-center gap-4 z-50">
        {onDownload && (
           <button onClick={onDownload} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all">
             <Download size={20} />
           </button>
        )}
        <div className="flex bg-white/10 rounded-full overflow-hidden">
          <button onClick={() => setScale(s => Math.min(s + 0.5, 5))} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 text-white transition-all">
             <ZoomIn size={20} />
          </button>
          <div className="w-12 h-12 flex items-center justify-center font-black text-xs text-white border-l border-r border-white/5">
            {Math.round(scale * 100)}%
          </div>
          <button onClick={() => setScale(s => Math.max(s - 0.5, 1))} className="w-12 h-12 flex items-center justify-center hover:bg-white/10 text-white transition-all">
             <ZoomOut size={20} />
          </button>
        </div>
        <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all">
          <X size={24} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          src={image} 
          className="max-w-full max-h-full object-contain transition-transform duration-75 select-none"
          style={{ 
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            imageRendering: 'auto',
            filter: 'contrast(1.02) saturate(1.05)'
          }}
          alt="Expanded"
          draggable={false}
        />
      </div>
    </div>
  );
}
