import React, { useState, useRef } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';

interface ExportPromptModalProps {
  prompt: string;
  onClose: () => void;
}

const ExportPromptModal: React.FC<ExportPromptModalProps> = ({ prompt, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    setCopyError(false);
    let success = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(prompt);
        success = true;
      } catch (err) {
        console.warn("Clipboard API failed", err);
      }
    }

    if (!success && textAreaRef.current) {
      textAreaRef.current.select();
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.error("execCommand failed", err);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
      if (textAreaRef.current) {
        textAreaRef.current.select();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80  p-4">
      <div className="bg-[#0a0a0a] border border-white/20 w-full max-w-4xl flex flex-col shadow-2xl rounded-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Copy size={18} className="text-purple-500" /> External AI Prompt
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            Due to strict browser security in this environment, automatic copying might be blocked. 
            Click the <strong>Copy</strong> button below, or manually click inside the text box and press <kbd className="bg-white/10 px-1 py-0.5 rounded text-white">Ctrl+C</kbd> (or <kbd className="bg-white/10 px-1 py-0.5 rounded text-white">Cmd+C</kbd> on Mac).
          </p>
          
          {copyError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              Automatic copy blocked by browser. Please use Ctrl+C / Cmd+C.
            </div>
          )}

          <textarea 
            ref={textAreaRef}
            className="w-full h-[50vh] bg-black text-green-400 font-mono text-xs p-4 border border-white/10 rounded focus:outline-none focus:border-purple-500 resize-none custom-scrollbar"
            readOnly
            value={prompt}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
        <div className="p-4 border-t border-white/10 bg-black flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded border border-transparent hover:border-white/10">
            Close
          </button>
          <button 
            onClick={handleCopy}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied Successfully!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPromptModal;
