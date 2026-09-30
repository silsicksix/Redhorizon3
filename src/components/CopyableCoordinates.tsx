import React, { useState } from 'react';
import { Copy, Check, MapPin } from 'lucide-react';

interface CopyableCoordinatesProps {
  lat: number;
  lon: number;
  label?: string;
  className?: string;
  showIcon?: boolean;
  onCopy?: (coordsStr: string) => void;
}

export const formatLatLonString = (lat: number, lon: number): string => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
};

export const formatLatLonDisplay = (lat: number, lon: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
};

export const copyCoordinatesToClipboard = async (lat: number, lon: number, customLabel?: string): Promise<string> => {
  const textToCopy = formatLatLonString(lat, lon);
  let success = false;

  // 1. Try modern Clipboard API if supported
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(textToCopy);
      success = true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, trying DOM fallback...', err);
    }
  }

  // 2. Synchronous fallback using temporary textarea
  if (!success) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      textArea.style.position = 'fixed';
      textArea.style.top = '50%';
      textArea.style.left = '50%';
      textArea.style.width = '100px';
      textArea.style.height = '40px';
      textArea.style.opacity = '0.01';
      textArea.style.pointerEvents = 'none';
      textArea.style.zIndex = '99999';
      textArea.setAttribute('readonly', '');
      textArea.contentEditable = 'true';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      if (typeof textArea.setSelectionRange === 'function') {
        textArea.setSelectionRange(0, textToCopy.length);
      }
      
      const copyExec = document.execCommand('copy');
      if (copyExec) {
        success = true;
      }
      document.body.removeChild(textArea);
    } catch (err) {
      console.warn('execCommand copy fallback failed: ', err);
    }
  }

  // 3. Last-ditch prompt fallback if both fails (e.g. strict iframe permissions)
  if (!success && typeof window !== 'undefined') {
    try {
      if (window.prompt) {
        window.prompt('Salin kordinat secara manual (Ctrl+C / Cmd+C):', textToCopy);
      }
    } catch {
      // ignore
    }
  }

  return textToCopy;
};

export const CopyableCoordinates: React.FC<CopyableCoordinatesProps> = ({
  lat,
  lon,
  label,
  className = '',
  showIcon = true,
  onCopy
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const copiedText = await copyCoordinatesToClipboard(lat, lon, label);
    setCopied(true);
    if (onCopy) onCopy(copiedText);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const displayText = label ? `${label}: ${formatLatLonDisplay(lat, lon)}` : formatLatLonDisplay(lat, lon);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] transition-all cursor-pointer group select-none ${
        copied
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
          : 'bg-black/60 hover:bg-cyan-950/80 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 shadow-sm'
      } ${className}`}
      title={`Klik untuk salin kordinat (${formatLatLonString(lat, lon)}) ke clipboard`}
    >
      {showIcon && (
        copied ? (
          <Check size={12} className="text-emerald-400 animate-in zoom-in-50 duration-200" />
        ) : (
          <MapPin size={12} className="text-cyan-400 group-hover:scale-110 transition-transform" />
        )
      )}
      <span className="font-bold">{copied ? 'KORDINAT DISALIN!' : displayText}</span>
      {!copied && <Copy size={10} className="text-gray-400 group-hover:text-cyan-300 ml-0.5 opacity-70 group-hover:opacity-100" />}
    </button>
  );
};

export default CopyableCoordinates;
