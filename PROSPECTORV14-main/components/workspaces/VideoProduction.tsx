import React, { useState, useRef, useEffect } from 'react';
import { Lead } from '../../types';
import { enhanceVideoPrompt, saveAsset } from '../../services/geminiService';
import { toast } from '../../services/toastManager';

interface VideoProductionProps {
  lead?: Lead | null;
}

export const VideoProduction: React.FC<VideoProductionProps> = ({ lead }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [model, setModel] = useState('VEO FAST (3.1)');
  
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  // Auto-populate prompt if lead exists
  useEffect(() => {
    if (lead && !prompt) {
      setPrompt(`Cinematic 4k commercial establishing shot for ${lead.businessName} in ${lead.city}. Professional lighting, high fidelity.`);
    }
  }, [lead]);

  // KIE Polling Logic
  useEffect(() => {
    if (!taskId) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/kie/record-info?taskId=${taskId}`);
        const data = await res.json();
        const currentStatus = (data?.data?.status || data?.status || '').toLowerCase();
        setStatus(currentStatus || 'processing');

        if (currentStatus === 'completed' || currentStatus === 'success') {
          clearInterval(interval);
          const url = data?.data?.video_url || data?.video_url;
          if (url) {
            setVideoUrl(url);
            saveAsset('VIDEO', `VEO: ${lead?.businessName || 'Video'}`, url, 'VIDEO_PRODUCTION', lead?.id);
            toast.success("CINEMA RENDER COMPLETE");
          }
          setIsGenerating(false);
          setTaskId(null);
        } else if (currentStatus === 'failed') {
          clearInterval(interval);
          toast.error(`Video Failed: Provider Error`);
          setIsGenerating(false);
          setTaskId(null);
        }
      } catch (e) {
        console.error("Poll Error", e);
      }

      if (attempts > 120) { // 10 minute timeout
        clearInterval(interval);
        setIsGenerating(false);
        setTaskId(null);
        toast.error("VEO RENDER TIMED OUT");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [taskId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'start') setStartFrame(ev.target?.result as string);
        else setEndFrame(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceVideoPrompt(prompt);
      setPrompt(enhanced);
      toast.neural("NEURAL DIRECTIVE OPTIMIZED");
    } catch (e) {
      toast.error("ENHANCE_FAILED");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !startFrame) {
      toast.error("Directive or Start Frame required.");
      return;
    }
    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Initializing...');

    try {
      const payload = {
        prompt,
        image: startFrame ? startFrame.split(',')[1] : undefined,
        lastFrame: endFrame ? endFrame.split(',')[1] : undefined,
        config: {
          aspectRatio,
          resolution,
          numberOfVideos: 1
        }
      };

      const res = await fetch('/api/kie/video_submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const tid = data?.data?.taskId || data?.taskId;

      if (tid) {
        setTaskId(tid);
        toast.info("VEO SEQUENCE QUEUED");
      } else {
        throw new Error(data?.msg || "Submission failed");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`KIE_GEN_ERROR: ${e.message}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] w-full flex flex-col animate-in fade-in duration-700 bg-[#020617]">
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT SIDEBAR: FRAMES --- */}
        <aside className="w-[300px] border-r border-slate-800 p-6 flex flex-col gap-8 bg-[#05091a] overflow-y-auto custom-scrollbar">
           <div className="space-y-3">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">START FRAME</h3>
              <div 
                onClick={() => startInputRef.current?.click()}
                className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${startFrame ? 'border-emerald-500/50 bg-black shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/30'}`}
              >
                 {startFrame ? (
                   <img src={startFrame} className="w-full h-full object-cover" alt="Start Frame" />
                 ) : (
                   <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-60">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      <span className="text-[8px] font-black uppercase tracking-widest">UPLOAD SOURCE</span>
                   </div>
                 )}
                 <input type="file" ref={startInputRef} onChange={(e) => handleImageUpload(e, 'start')} className="hidden" accept="image/*" />
              </div>
           </div>

           <div className="space-y-3">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">END FRAME (OPTIONAL)</h3>
              <div 
                onClick={() => endInputRef.current?.click()}
                className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${endFrame ? 'border-emerald-500/50 bg-black shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800 bg-slate-900/40 hover:border-emerald-500/30'}`}
              >
                 {endFrame ? (
                   <img src={endFrame} className="w-full h-full object-cover" alt="End Frame" />
                 ) : (
                   <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-60">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-7h.01" /></svg>
                      <span className="text-[8px] font-black uppercase tracking-widest">TARGET END</span>
                   </div>
                 )}
                 <input type="file" ref={endInputRef} onChange={(e) => handleImageUpload(e, 'end')} className="hidden" accept="image/*" />
              </div>
           </div>
           
           <div className="mt-auto p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Tip: Vertical shots are optimized for 9:16 reels. Horizontal frames for YouTube/Cinematic.
              </p>
           </div>
        </aside>

        {/* --- CENTER: VIEWPORT --- */}
        <main className="flex-1 p-12 flex flex-col items-center justify-center relative bg-[#020617]">
           <div className="w-full max-w-5xl aspect-video rounded-[60px] bg-[#05091a] border-8 border-slate-900 shadow-[0_0_120px_rgba(0,0,0,0.8),inset_0_0_60px_rgba(16,185,129,0.05)] overflow-hidden relative flex items-center justify-center group">
              {/* Vignette Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/60 z-10 opacity-40"></div>
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10"></div>

              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain relative z-0" />
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-10 relative z-20">
                   <div className="relative">
                      <div className="w-32 h-32 border-4 border-emerald-900/30 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-32 h-32 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">🎬</div>
                   </div>
                   <div className="text-center space-y-4">
                      <p className="text-2xl font-black text-white uppercase italic tracking-[0.2em] animate-pulse">RENDERING SEQUENCE</p>
                      <div className="flex items-center justify-center gap-3">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                         <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.6em]">PIXEL FORGE: {status.toUpperCase()}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 opacity-20 group-hover:opacity-30 transition-opacity relative z-20">
                   <div className="w-24 h-24 bg-slate-900/50 border border-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 10l5 5-5 5M4 4v16h16V4H4z" /></svg>
                   </div>
                   <p className="text-4xl font-black uppercase tracking-[0.8em] italic text-white text-center ml-4">CINEMA VIEWPORT</p>
                   <div className="flex gap-4">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                   </div>
                </div>
              )}

              {/* Viewport UI Overlay */}
              <div className="absolute top-10 left-10 flex items-center gap-4 z-30">
                 <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${isGenerating ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`}></div>
                       <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest">{isGenerating ? 'RECORDING' : 'STBY'}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">4K_LOG_3</span>
                 </div>
              </div>

              <div className="absolute top-10 right-10 flex flex-col items-end z-30">
                 <span className="text-[12px] font-mono text-slate-300 tracking-tighter">TC 00:00:00:00</span>
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">{resolution.toUpperCase()} // {aspectRatio}</span>
              </div>

              {/* Scanline Effect Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] z-20 opacity-30"></div>
           </div>
        </main>

        {/* --- RIGHT SIDEBAR: SETTINGS --- */}
        <aside className="w-[380px] border-l border-slate-800 p-8 flex flex-col gap-10 bg-[#05091a] overflow-y-auto custom-scrollbar">
           
           <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SCENE DIRECTIVE</h3>
                 <button 
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="flex items-center gap-2 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-all group"
                 >
                    <span className={isEnhancing ? 'animate-spin' : 'group-hover:rotate-12'}>✨</span>
                    {isEnhancing ? 'OPTIMIZING...' : 'ENHANCE PROMPT'}
                 </button>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-black/60 border-2 border-slate-800 rounded-3xl p-6 text-sm font-medium text-slate-300 h-48 resize-none focus:border-emerald-500 outline-none leading-relaxed italic shadow-inner"
                placeholder="Describe cinematic motion, lighting, and subject..."
              />
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                 <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ASPECT RATIO</h3>
                 <div className="flex bg-black/40 rounded-xl p-1 border border-slate-800">
                    {['16:9', '9:16'].map(r => (
                       <button 
                         key={r} 
                         onClick={() => setAspectRatio(r as any)}
                         className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${aspectRatio === r ? 'bg-slate-700 text-white shadow-lg shadow-black/40' : 'text-slate-500 hover:text-slate-300'}`}
                       >
                         {r}
                       </button>
                    ))}
                 </div>
              </div>
              <div className="space-y-4">
                 <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">RESOLUTION</h3>
                 <div className="flex bg-black/40 rounded-xl p-1 border border-slate-800">
                    {['720p', '1080p'].map(res => (
                       <button 
                         key={res} 
                         onClick={() => setResolution(res as any)}
                         className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${resolution === res ? 'bg-slate-700 text-white shadow-lg shadow-black/40' : 'text-slate-500 hover:text-slate-300'}`}
                       >
                         {res}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ENGINE NODE</h3>
              <div className="w-full bg-black/40 border-2 border-slate-800 rounded-2xl px-6 py-5 flex items-center justify-between group cursor-default transition-all shadow-inner">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">VEO FAST (3.1)</span>
                 </div>
                 <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15V3m0 12l-4-4m4 4l4-4" strokeWidth="3" strokeLinecap="round"/></svg>
              </div>
           </div>

           <div className="mt-auto pt-6 border-t border-slate-800/50">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-6 rounded-[28px] text-[13px] font-black uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(16,185,129,0.2)] active:scale-95 border-b-4 border-emerald-800 transition-all flex items-center justify-center gap-4"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                {isGenerating ? 'SYNCING...' : 'INITIATE PRODUCTION'}
              </button>
           </div>
        </aside>
      </div>

      {/* --- FOOTER: INDEX --- */}
      <footer className="h-20 border-t border-slate-800 bg-[#030712] px-10 flex items-center justify-between shrink-0">
         <div className="flex gap-4">
            <button className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all hover:bg-slate-800 shadow-sm">IMPORT NODE</button>
            <button className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all hover:bg-slate-800 shadow-sm">EXPORT PAYLOAD</button>
         </div>
         <div className="flex items-center gap-4 bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
            <div className={`w-2 h-2 rounded-full ${lead ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{lead ? `ACTIVE PROJECT: ${lead.businessName.toUpperCase()}` : 'SYSTEM READY: AWAITING SELECTION'}</span>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">PROSPECTOR OS</p>
               <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">VERSION 16.2.0 CORE</p>
            </div>
         </div>
      </footer>
    </div>
  );
};
