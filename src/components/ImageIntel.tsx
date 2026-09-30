
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, ScanEye, FileImage, Layers, UserCheck, ArrowRightLeft, Globe, ExternalLink, MapPin, Info, Compass, Sun } from 'lucide-react';
import { analyzeImageOSINT, compareFacesOSINT, analyzeGeospatialIMINT, analyzeSPRDocument } from '../services/geminiService';
import { extractExifAsync, ExifData } from '../utils/exifParser';

interface ImageIntelProps {
  onClose: () => void;
  onLog: (msg: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  onUpdateGraph?: (data: any) => void;
}

type TabMode = 'analysis' | 'comparison' | 'bellingcat' | 'spr';

const ImageIntel: React.FC<ImageIntelProps> = ({ onClose, onLog, onUpdateGraph }) => {
  const [mode, setMode] = useState<TabMode>('analysis');
  
  // Single Analysis State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{name: string, size: string, type: string} | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  
  // Bellingcat Specific
  const [geoContext, setGeoContext] = useState('');

  // Comparison State
  const [refImageSrc, setRefImageSrc] = useState<string | null>(null);
  const [candImageSrc, setCandImageSrc] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const candInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers for Single Analysis ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 2 * 1024 * 1024) {
          onLog("Image too large. Please use an image under 2MB.", 'error');
          return;
      }

      setFileData({ name: file.name, size: (file.size / 1024).toFixed(2) + ' KB', type: file.type });
      setAnalysis(null);
      setExifData(null);

      // Read for display
      const reader = new FileReader();
      reader.onload = (e) => setImageSrc(e.target?.result as string);
      reader.readAsDataURL(file);

      // Extract EXIF asynchronously using exifr
      try {
          const exif = await extractExifAsync(file);
          if (exif && Object.keys(exif).length > 0) {
              setExifData(exif);
              onLog("EXIF metadata successfully extracted from image.", 'success');
          } else {
              onLog("No actionable EXIF data found in image.", 'warning');
          }
      } catch (err) {
          onLog("Failed to parse EXIF metadata.", 'error');
      }
    }
  };

  const pushExifToCanvas = () => {
    if (!onUpdateGraph || !exifData || !fileData) {
        onLog("No EXIF data to push to canvas.", 'error');
        return;
    }
    const rootId = `img-${Date.now()}`;
    const nodes: any[] = [{
        id: rootId,
        label: fileData.name,
        type: 'file',
        details: 'Uploaded Image'
    }];
    const links: any[] = [];

    if (exifData.Make || exifData.Model) {
        const camId = `cam-${Date.now()}`;
        nodes.push({ id: camId, label: `${exifData.Make || ''} ${exifData.Model || ''}`.trim(), type: 'device', details: 'Camera Device' });
        links.push({ id: `link-${rootId}-${camId}`, source: rootId, target: camId, label: 'taken with' });
    }
    if (exifData.latitude && exifData.longitude) {
        const locId = `loc-${Date.now()}`;
        nodes.push({ id: locId, label: `${exifData.latitude.toFixed(5)}, ${exifData.longitude.toFixed(5)}`, type: 'location', details: 'GPS Coordinates' });
        links.push({ id: `link-${rootId}-${locId}`, source: rootId, target: locId, label: 'taken at' });
    }
    if (exifData.DateTimeOriginal) {
        const timeId = `time-${Date.now()}`;
        const dtStr = exifData.DateTimeOriginal instanceof Date ? exifData.DateTimeOriginal.toISOString() : String(exifData.DateTimeOriginal);
        nodes.push({ id: timeId, label: dtStr, type: 'timeline', details: 'Capture Date' });
        links.push({ id: `link-${rootId}-${timeId}`, source: rootId, target: timeId, label: 'taken on' });
    }

    if (nodes.length > 1) {
        onUpdateGraph({ nodes, links });
        onLog(`Plotted ${nodes.length - 1} EXIF data points to the Intelligence Canvas.`, 'success');
        onClose();
    } else {
        onLog("EXIF data did not contain plotable coordinates, device, or time info.", 'warning');
    }
  };

  const handleAnalyze = async () => {
    if (!imageSrc || !fileData) return;
    setLoading(true);

    try {
      const base64Data = imageSrc.split(',')[1];
      let resultText = '';
      let graphData: any = null;

      if (mode === 'bellingcat') {
          onLog("Initiating Bellingcat Geospatial IMINT Protocol...", 'warning');
          resultText = await analyzeGeospatialIMINT(base64Data, fileData.type, geoContext);
      } else if (mode === 'spr') {
          onLog("Initiating SPR Document Extraction...", 'info');
          const result = await analyzeSPRDocument(base64Data, fileData.type);
          resultText = result.report;
          graphData = result.graph;
      } else {
          onLog("Uploading image to visual cortex...", 'info');
          resultText = await analyzeImageOSINT(base64Data, fileData.type);
      }

      setAnalysis(resultText);
      onLog("Visual forensic analysis complete.", 'success');
      
      // Push results to canvas
      if (onUpdateGraph) {
          if (graphData) {
              onUpdateGraph(graphData);
          } else {
              const rootId = `image-intel-${Date.now()}`;
              const nodes: any[] = [{
                  id: rootId,
                  label: 'Image Analysis Result',
                  type: 'analysis_result',
                  details: resultText.substring(0, 200) + '...'
              }];
              const links: any[] = [];
              
              // Plot EXIF automatically as well!
              if (exifData) {
                  if (exifData.Make || exifData.Model) {
                      const camId = `cam-${Date.now()}`;
                      nodes.push({ id: camId, label: `${exifData.Make || ''} ${exifData.Model || ''}`.trim(), type: 'device', details: 'Camera Device' });
                      links.push({ id: `link-${rootId}-${camId}`, source: rootId, target: camId, label: 'taken with' });
                  }
                  if (exifData.latitude && exifData.longitude) {
                      const locId = `loc-${Date.now()}`;
                      nodes.push({ id: locId, label: `${exifData.latitude.toFixed(5)}, ${exifData.longitude.toFixed(5)}`, type: 'location', details: 'GPS Coordinates' });
                      links.push({ id: `link-${rootId}-${locId}`, source: rootId, target: locId, label: 'taken at' });
                  }
              }

              onUpdateGraph({nodes, links});
          }
      }
    } catch (error: any) {
      onLog(`Image Analysis Failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const launchExternalSearch = (engine: 'yandex' | 'brave' | 'bing') => {
      let url = '';
      if (engine === 'yandex') url = 'https://yandex.com/images/';
      if (engine === 'brave') url = 'https://search.brave.com/images';
      if (engine === 'bing') url = 'https://www.bing.com/visualsearch';
      
      window.open(url, '_blank');
      onLog(`Launched ${engine.toUpperCase()} Image Search. Drag local image there manually.`, 'info');
  };

  // --- Handlers for Comparison ---
  const handleRefSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setRefImageSrc(e.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCandSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setCandImageSrc(e.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCompare = async () => {
    if (!refImageSrc || !candImageSrc) return;
    setLoading(true);
    setAnalysis(null);
    onLog("Initiating Biometric Morphology Comparison...", 'warning');
    try {
      // Very basic mime check, assuming jpeg for simplicity or extracting from string
      const refBase64 = refImageSrc.split(',')[1];
      const candBase64 = candImageSrc.split(',')[1];
      
      const result = await compareFacesOSINT(refBase64, candBase64);
      setAnalysis(result);
      onLog("Facial Comparison Complete.", 'success');
    } catch (error: any) {
      onLog(`Comparison Failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4">
      <div className="w-full max-w-5xl bg-[#050505] border-2 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.2)] font-mono flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-cyan-500/50 bg-cyan-900/10">
          <div className="flex items-center gap-4">
             <Camera className="text-cyan-500" size={24} />
             <div>
               <div className="flex items-center gap-3">
                 <h2 className="text-xl font-bold text-white tracking-widest uppercase">Visual Intelligence Lab</h2>
                 <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold font-mono uppercase">
                   Agent 1: Multimodal 256K
                 </span>
               </div>
               <p className="text-[10px] text-cyan-400 mb-1">IMINT • CCTV / VIDEO OCR • BIOMETRIC RECOGNITION</p>
               <div className="text-[10px] text-cyan-300 border border-cyan-500/30 inline-block px-1.5 py-0.5 bg-cyan-900/30 w-fit font-mono">
                 ⚡ Multi-Agent Matrix: NVIDIA Nemotron 3 Nano Omni (256K) / Gemma 4 31B Vision
               </div>
             </div>
          </div>
          <button onClick={onClose} className="hover:text-white text-cyan-500"><X /></button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-cyan-900/50">
          <button onClick={() => setMode('analysis')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'analysis' ? 'bg-cyan-500 text-black' : 'text-gray-500 hover:text-cyan-500'}`}><ScanEye size={14}/> General Analysis</button>
          <button onClick={() => setMode('comparison')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'comparison' ? 'bg-cyan-500 text-black' : 'text-gray-500 hover:text-cyan-500'}`}><UserCheck size={14}/> Facial Comparison</button>
          <button onClick={() => setMode('bellingcat')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'bellingcat' ? 'bg-cyan-500 text-black' : 'text-gray-500 hover:text-cyan-500'}`}><MapPin size={14}/> Geospatial (IMINT)</button>
          <button onClick={() => setMode('spr')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${mode === 'spr' ? 'bg-cyan-500 text-black' : 'text-gray-500 hover:text-cyan-500'}`}><Info size={14}/> SPR Semak</button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex overflow-hidden">
           {/* ANALYSIS/BELLINGCAT VIEW */}
           {(mode === 'analysis' || mode === 'bellingcat' || mode === 'spr') && (
              <div className="flex-1 flex overflow-hidden">
                 {/* Left Panel */}
                 <div className="w-4/12 border-r border-cyan-900/30 bg-[#0a0a0a] p-4 flex flex-col gap-4 overflow-y-auto">
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-900/20 h-32 flex flex-col items-center justify-center cursor-pointer transition-all">
                       <Upload className="text-cyan-500 mb-2" />
                       <p className="text-xs font-bold text-gray-400">DROP IMAGE / CLICK</p>
                       <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </div>
                    {imageSrc && (
                       <div className="space-y-4">
                          <img src={imageSrc} alt="Analysis subject" className="w-full border border-gray-700"/>
                          {mode === 'bellingcat' && (
                             <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Context / Clues</label>
                                <textarea value={geoContext} onChange={(e) => setGeoContext(e.target.value)} placeholder="e.g. 'Suspect mentioned being in Asia', 'License plate looks European'" className="w-full bg-black border border-gray-700 text-xs p-2 mt-1 h-20 outline-none focus:border-cyan-500" />
                             </div>
                          )}
                          <button onClick={handleAnalyze} disabled={loading} className="w-full bg-cyan-600 text-black font-bold uppercase py-3 hover:bg-white transition-all flex items-center justify-center gap-2">
                             {loading ? 'ANALYZING...' : `RUN ${mode.toUpperCase()} SCAN`}
                          </button>
                          <div className="text-center text-[10px] text-gray-600">Reverse Image Search</div>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => launchExternalSearch('brave')} className="bg-gray-800 text-gray-300 text-[9px] py-1">Brave</button>
                            <button onClick={() => launchExternalSearch('yandex')} className="bg-gray-800 text-gray-300 text-[9px] py-1">Yandex</button>
                            <button onClick={() => launchExternalSearch('bing')} className="bg-gray-800 text-gray-300 text-[9px] py-1">Bing</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <button onClick={() => window.open('https://pimeyes.com', '_blank')} className="bg-cyan-900 text-cyan-300 text-[9px] py-1 font-bold">PimEyes</button>
                            <button onClick={() => window.open('https://facecheck.id', '_blank')} className="bg-cyan-900 text-cyan-300 text-[9px] py-1 font-bold">FaceCheck.id</button>
                          </div>
                       </div>
                    )}
                 </div>
                 {/* Right Panel */}
                 <div className="w-8/12 bg-black p-4 overflow-y-auto custom-scrollbar">
                    <h3 className="text-cyan-400 font-bold uppercase text-xs mb-2">Analysis Report</h3>
                    {analysis ? <div className="prose prose-sm prose-invert whitespace-pre-wrap">{analysis}</div> : <div className="text-gray-600 text-sm">Awaiting analysis...</div>}
                    {exifData && (
                        <div className="mt-6 border-t border-gray-800 pt-4 relative">
                           <div className="flex items-center justify-between mb-2">
                             <h4 className="text-yellow-500 font-bold uppercase text-xs">Extracted EXIF Data</h4>
                             <button onClick={pushExifToCanvas} className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-500 hover:text-black border border-yellow-500/50 px-3 py-1 text-[10px] font-bold uppercase transition-colors">
                               Plot to Canvas
                             </button>
                           </div>
                           <pre className="text-xs text-gray-400 bg-[#111] p-2 overflow-x-auto max-h-64">
                              {JSON.stringify(exifData, null, 2)}
                           </pre>
                        </div>
                    )}
                 </div>
              </div>
           )}

           {/* COMPARISON VIEW */}
           {mode === 'comparison' && (
              <div className="flex-1 flex p-4 gap-4 overflow-hidden">
                 {/* Ref Image */}
                 <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-700 hover:border-cyan-500 transition-all cursor-pointer" onClick={() => refInputRef.current?.click()}>
                    {refImageSrc ? <img src={refImageSrc} className="max-h-full max-w-full" /> : <span>REFERENCE (PERSON A)</span>}
                    <input ref={refInputRef} type="file" className="hidden" accept="image/*" onChange={handleRefSelect} />
                 </div>
                 {/* Actions */}
                 <div className="w-64 flex flex-col items-center justify-center gap-4">
                    <ArrowRightLeft size={32} />
                    <button onClick={handleCompare} disabled={!refImageSrc || !candImageSrc || loading} className="w-full bg-cyan-600 text-black py-3 uppercase font-bold text-sm disabled:opacity-50">
                       {loading ? 'COMPARING...' : 'RUN MATCH'}
                    </button>
                    {analysis && <div className="text-center p-2 bg-cyan-900/20 border border-cyan-800 w-full overflow-y-auto">{analysis}</div>}
                 </div>
                 {/* Candidate Image */}
                 <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-700 hover:border-cyan-500 transition-all cursor-pointer" onClick={() => candInputRef.current?.click()}>
                    {candImageSrc ? <img src={candImageSrc} className="max-h-full max-w-full" /> : <span>CANDIDATE (PERSON B)</span>}
                    <input ref={candInputRef} type="file" className="hidden" accept="image/*" onChange={handleCandSelect} />
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ImageIntel;
