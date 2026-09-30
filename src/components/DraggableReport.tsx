
import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Move } from 'lucide-react';

interface DraggableReportProps {
  report: string;
  onClose: () => void;
}

const DraggableReport: React.FC<DraggableReportProps> = ({ report, onClose }) => {
  const [position, setPosition] = useState({ 
    x: Math.max(10, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 420), 
    y: 80 
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const animFrameRef = useRef<number | null>(null);

  const startDrag = (clientX: number, clientY: number) => {
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        const dx = clientX - dragStartRef.current.startX;
        const dy = clientY - dragStartRef.current.startY;
        const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.posX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.posY + dy));
        setPosition({ x: newX, y: newY });
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchcancel', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDragging]);

  return (
    <div 
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        top: 0,
        left: 0,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      className={`fixed w-96 max-w-[92vw] bg-black/95 border border-orange-500 shadow-2xl z-50 flex flex-col max-h-[60vh] rounded-lg overflow-hidden transition-shadow ${
        isDragging ? 'select-none ring-2 ring-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.4)]' : ''
      }`}
    >
        <div 
          className="bg-orange-900/30 p-2.5 border-b border-orange-500/50 flex justify-between items-center cursor-grab active:cursor-grabbing select-none touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
            <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase pointer-events-none">
                <FileText size={14} /> Situation Report
            </div>
            <div className="flex items-center gap-2">
                <Move size={14} className="text-orange-400/70 pointer-events-none" />
                <button onClick={onClose} className="cursor-pointer p-0.5 hover:bg-orange-950 rounded transition-colors">
                  <X size={14} className="text-orange-400 hover:text-white" />
                </button>
            </div>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="prose prose-invert prose-sm text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                {report}
            </div>
        </div>
    </div>
  );
};

export default DraggableReport;
