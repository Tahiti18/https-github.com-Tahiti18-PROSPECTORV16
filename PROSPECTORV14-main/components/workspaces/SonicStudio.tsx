import React, { useState, useEffect, useMemo } from 'react';
import { Lead } from '../../types';
import { AssetRecord, subscribeToAssets, saveAsset } from '../../services/geminiService';
import { kieSunoService } from '../../services/kieSunoService';
import { SonicStudioPlayer } from './SonicStudioPlayer';
import { SonicPromptGuide } from './SonicPromptGuide';
import { toast } from '../../services/toastManager';

interface SonicStudioProps {
  lead?: Lead | null;
}

const INDUSTRY_PRESETS = [
  { id: 'tech', label: 'TECH / SAAS', icon: '🌐', prompt: 'Modern, clean, digital, futuristic synthesizer, high-tech pulse.' },
  { id: 'luxury', label: 'LUXURY ESTATE', icon: '💎', prompt: 'Sophisticated, elegant, sparse piano, expensive atmosphere, cinematic slow tempo.' },
  { id: 'clinic', label: 'MODERN CLINIC', icon: '🩺', prompt: 'Calm, trust-building, ambient textures, soothing minimalist pads, medical professional vibe.' },
  { id: 'performance', label: 'HIGH PERFORMANCE', icon: '⚡', prompt: 'High-energy, driving rhythm, motivational, punchy percussion, success anthem.' },
  { id: 'focus', label: 'DEEP FOCUS', icon: '🧘', prompt: 'Lo-fi, hypnotic, repetitive background, unobtrusive, deep study atmosphere.' },
  { id: 'epic', label: 'CINEMATIC EPIC', icon: '🎬', prompt: 'Grand, orchestral swelling, powerful strings, dramatic, trailer style.' }
];

const GENRES = ['CINEMATIC', 'ELECTRONIC', 'ROCK', 'HIP HOP', 'JAZZ', 'AMBIENT', 'CORPORATE', 'POP', 'SYNTHWAVE', 'LO-FI'];
const ATMOSPHERES = ['UPLIFTING', 'MELANCHOLIC', 'ENERGETIC', 'RELAXING', 'SUSPENSEFUL'];

export const SonicStudio: React.FC<SonicStudioProps> = ({ lead }) => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [duration, setDuration] = useState(30);
  const [isInstrumental, setIsInstrumental] = useState(true);
  const [exportFormat, setExportFormat] = useState<'MP3' | 'WAV'>('MP3');
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [activeCover, setActiveCover] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAssets((a) => setAssets(a));
    return () => { try { unsub(); } catch (e) {} };
  }, []);

  const audioAssets = useMemo(() => assets.filter(a => a.type === 'AUDIO'), [assets]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
        toast.error("Please provide a sonic directive.");
        return;
    }
    setIsGenerating(true);
    try {
        await kieSunoService.runFullCycle(
            prompt,
            isInstrumental,
            lead?.id,
            activeCover || undefined,
            duration
        );
    } catch (e: any) {
        console.error(e);
        toast.error(`FORGE_FAILED: ${e.message}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const applyPreset = (p: string) => setPrompt(p);

  return (
    <div className="max-w-[1700px] mx-auto py-4 space-y-8 animate-in fade-in duration-700 min-h-screen">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* --- LEFT: PRESETS --- */}
        <div className="lg:col-span-3 space-y-8">
           <div className="bg-[#0b1021] border border-slate-800 rounded-[32px] p-8 shadow-2xl h-full">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 INDUSTRY PRESETS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                 {INDUSTRY_PRESETS.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => applyPreset(p.prompt)}
                      className="bg-[#020617] border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all group"
                    >
                       <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
                       <span className="text-[9px] font-black text-slate-500 group-hover:text-emerald-400 text-center uppercase tracking-widest">{p.label}</span>
                    </button>
                 ))}
              </div>

              <div className="mt-12 space-y-8">
                 <div>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">GENRE DEFINITION</h3>
                    <div className="flex flex-wrap gap-2">
                       {GENRES.map(g => (
                         <button 
                            key={g} 
                            onClick={() => setPrompt(prev => `${prev} Genre: ${g}.`)}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[8px] font-black text-slate-500 hover:text-white hover:border-slate-600 transition-all"
                         >
                           {g}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">ATMOSPHERE</h3>
                    <div className="flex flex-wrap gap-2">
                       {ATMOSPHERES.map(a => (
                         <button 
                            key={a} 
                            onClick={() => setPrompt(prev => `${prev} Mood: ${a}.`)}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[8px] font-black text-slate-500 hover:text-white hover:border-slate-600 transition-all"
                         >
                           {a}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* --- CENTER: PLAYER --- */}
        <div className="lg:col-span-6">
           <SonicStudioPlayer 
              assets={assets.filter(a => a.type === 'AUDIO' || a.type === 'IMAGE')} 
              onSetCover={setActiveCover}
              exportFormat={exportFormat}
           />
        </div>

        {/* --- RIGHT: ENGINE --- */}
        <div className="lg:col-span-3 space-y-8">
           <div className="bg-[#0b1021] border border-slate-800 rounded-[32px] p-8 shadow-2xl h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">SONIC PROMPT</h3>
                 <button 
                    onClick={() => setShowPromptGuide(true)}
                    className="flex items-center gap-2 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
                 >
                    <span>⚡</span> MAGIC WAND
                 </button>
              </div>

              <div className="flex-1 space-y-8">
                 <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-3xl p-6 text-sm font-medium text-slate-300 h-48 resize-none focus:border-emerald-500 outline-none shadow-inner leading-relaxed italic"
                    placeholder="Describe background music for your client..."
                 />

                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CONFIGURATION</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <span className="text-[8px] font-black text-slate-700 uppercase">DURATION</span>
                          <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                             {[30, 60].map(d => (
                               <button 
                                 key={d} 
                                 onClick={() => setDuration(d)}
                                 className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${duration === d ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}
                               >
                                 {d}S
                               </button>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-2">
                          <span className="text-[8px] font-black text-slate-700 uppercase">MODE</span>
                          <button 
                             onClick={() => setIsInstrumental(!isInstrumental)}
                             className={`w-full py-3 rounded-xl border text-[9px] font-black transition-all ${isInstrumental ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                          >
                             {isInstrumental ? 'INSTRUMENTAL' : 'VOCAL_MODE'}
                          </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <span className="text-[8px] font-black text-slate-700 uppercase">EXPORT FORMAT</span>
                       <div className="flex gap-2">
                          {['MP3', 'WAV'].map(f => (
                             <button 
                                key={f} 
                                onClick={() => setExportFormat(f as any)}
                                className={`flex-1 py-3 rounded-xl border text-[9px] font-black transition-all ${exportFormat === f ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                             >
                                {f}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <span className="text-[8px] font-black text-slate-700 uppercase">COVER ART</span>
                    <div className="grid grid-cols-2 gap-2">
                       <button className="py-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-1 hover:border-emerald-500/30 transition-all">
                          <span className="text-[10px] font-black text-slate-400 uppercase">AI COVER</span>
                          <span className="text-[7px] font-bold text-slate-600 uppercase">Create Art</span>
                       </button>
                       <button className="py-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-1 hover:border-emerald-500/30 transition-all">
                          <span className="text-[10px] font-black text-slate-400 uppercase">UPLOAD</span>
                          <span className="text-[7px] font-bold text-slate-600 uppercase">Custom</span>
                       </button>
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-800">
                 <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-6 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 border-b-4 border-emerald-800 transition-all"
                 >
                    {isGenerating ? 'FORGING AUDIO...' : 'INITIATE SONIC FORGE'}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {showPromptGuide && (
        <SonicPromptGuide 
           onClose={() => setShowPromptGuide(false)} 
           onSelect={(template) => { setPrompt(template); setShowPromptGuide(false); }} 
        />
      )}
    </div>
  );
};

export default SonicStudio;