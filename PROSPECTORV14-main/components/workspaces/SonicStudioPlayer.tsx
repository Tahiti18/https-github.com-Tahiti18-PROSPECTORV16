import React, { useState, useRef, useEffect } from 'react';
import { AssetRecord, deleteAsset } from '../../services/geminiService';

interface SonicStudioPlayerProps {
  assets: AssetRecord[];
  onSetCover?: (url: string) => void;
  exportFormat?: 'MP3' | 'WAV';
}

export const SonicStudioPlayer: React.FC<SonicStudioPlayerProps> = ({ assets, onSetCover, exportFormat = 'MP3' }) => {
  // Filters
  const audioOnly = assets.filter(a => a.type === 'AUDIO');
  const allMedia = assets.filter(a => a.type === 'AUDIO' || a.type === 'IMAGE');
  
  // State
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Simulated Stems state
  const [activeStems, setActiveStems] = useState({ drums: true, bass: true, vocals: true, other: true });

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentAsset = allMedia[currentAssetIndex];

  // Sync to first asset if none selected
  useEffect(() => {
    if (allMedia.length > 0 && !currentAsset) {
        setCurrentAssetIndex(0);
    }
  }, [allMedia.length]);

  // Handle Audio Events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    const onError = (e: any) => {
        console.error("Audio Playback Error", e);
        if (currentAsset?.type === 'AUDIO') {
            setLoadError("Playback Failed: Source Unreachable");
        }
        setIsPlaying(false);
    };
    const onCanPlay = () => setLoadError(null);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [currentAssetIndex, currentAsset?.type]);

  useEffect(() => {
    if (audioRef.current && currentAsset?.type === 'AUDIO') {
        if (isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Autoplay prevented", error);
                    setIsPlaying(false);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentAsset?.type]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const selectAsset = (index: number) => {
    setCurrentAssetIndex(index);
    setLoadError(null);
    setIsPlaying(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Permanently delete this sonic asset?")) {
        deleteAsset(id);
        setCurrentAssetIndex(0);
        setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setProgress(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleStem = (stem: keyof typeof activeStems) => {
    setActiveStems(prev => ({ ...prev, [stem]: !prev[stem] }));
  };

  if (!allMedia || allMedia.length === 0) {
    return (
        <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-4 min-h-[500px]">
            <span className="text-8xl grayscale">🎧</span>
            <p className="text-[12px] font-black text-slate-600 uppercase tracking-[0.4em]">Sonic Gallery Empty</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#05091a] rounded-[48px] overflow-hidden border border-slate-800 shadow-2xl relative">
      {currentAsset?.type === 'AUDIO' && (
        <audio ref={audioRef} src={currentAsset.data} crossOrigin="anonymous" preload="metadata" />
      )}

      {/* --- TOP: ACTIVE PANEL --- */}
      <div className="bg-[#0b1021] p-10 border-b border-slate-800 relative overflow-hidden flex-none">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>

         <div className="relative z-10 flex flex-col items-center space-y-10">
            
            {/* LARGE COVER / VISUALIZER */}
            <div className="flex items-center gap-12 w-full max-w-5xl justify-center h-56">
                {currentAsset?.type === 'AUDIO' ? (
                    <>
                        <div className="w-56 h-56 rounded-[40px] overflow-hidden border-2 border-slate-800 shadow-2xl relative group shrink-0">
                            {currentAsset.metadata?.coverUrl ? (
                                <img src={currentAsset.metadata.coverUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-5xl">🎵</div>
                            )}
                            {isPlaying && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                        <div className="w-4 h-4 bg-white rounded-sm animate-spin"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 h-32 bg-slate-950/50 rounded-3xl border border-slate-800 flex items-end justify-center gap-1.5 p-6 overflow-hidden relative shadow-inner">
                            <div className="absolute top-4 left-6 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-slate-700'}`}></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">FREQ ANALYZER</span>
                            </div>
                            
                            {loadError ? (
                                <div className="flex items-center justify-center h-full w-full">
                                    <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">SIGNAL_FAULT: RELOAD NODE</p>
                                </div>
                            ) : (
                                [...Array(50)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-2.5 rounded-t-sm transition-all duration-[50ms] ${isPlaying ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-slate-800'}`}
                                        style={{ height: isPlaying ? `${Math.random() * 90 + 10}%` : '5%' }}
                                    ></div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center relative group">
                        <img src={currentAsset?.data} className="h-full object-contain rounded-3xl border border-slate-800 shadow-2xl" />
                        {onSetCover && (
                            <button 
                                onClick={() => onSetCover && onSetCover(currentAsset.data)}
                                className="absolute bottom-6 px-6 py-3 bg-black/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                                USE AS COVER ART
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* TRACK DATA */}
            <div className="text-center space-y-4">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter truncate max-w-2xl mx-auto px-10">
                    {currentAsset?.title || "UNNAMED_SONIC_VECTOR"}
                </h3>
                <div className="flex items-center justify-center gap-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">
                        SONIC STUDIO • {new Date(currentAsset?.timestamp || 0).toLocaleDateString()}
                    </p>
                </div>

                {currentAsset?.type === 'AUDIO' && (
                    <div className="flex gap-3 justify-center items-center p-3 bg-slate-950/50 rounded-2xl border border-slate-800 inline-flex mt-4 shadow-lg">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-4">STEMS</span>
                        {['DRUMS', 'BASS', 'VOCALS', 'OTHER'].map(stem => (
                            <button
                                key={stem}
                                onClick={() => toggleStem(stem.toLowerCase() as any)}
                                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                    activeStems[stem.toLowerCase() as keyof typeof activeStems] 
                                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                                        : 'bg-slate-900 border-slate-800 text-slate-600 opacity-40'
                                }`}
                            >
                                {stem}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* TRANSPORT BAR */}
            {currentAsset?.type === 'AUDIO' ? (
                <div className="w-full max-w-3xl space-y-6">
                   <div className="flex items-center gap-6 w-full px-10">
                      <span className="text-[10px] font-mono text-slate-500 w-12 text-right">{formatTime(progress)}</span>
                      <input 
                        type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek}
                        className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-[10px] font-mono text-slate-500 w-12">{formatTime(duration || currentAsset?.metadata?.duration || 0)}</span>
                   </div>

                   <div className="flex items-center justify-center gap-12">
                      <button onClick={() => selectAsset(Math.max(0, currentAssetIndex - 1))} className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95">
                         <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                      </button>

                      <button 
                        onClick={togglePlay} 
                        className="w-20 h-20 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-90 transition-all border-b-4 border-emerald-800"
                      >
                         {isPlaying ? (
                           <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                         ) : (
                           <svg className="w-10 h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                         )}
                      </button>

                      <button onClick={() => selectAsset(Math.min(allMedia.length - 1, currentAssetIndex + 1))} className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95">
                         <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                      </button>
                   </div>
                </div>
            ) : <div className="h-20"></div>}
         </div>
      </div>

      {/* --- BOTTOM: ASSET GALLERY --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/40 p-10">
         <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">ASSET GALLERY</h4>
            <div className="flex gap-4">
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/20">{audioOnly.length} AUDIO</span>
                <span className="text-[9px] font-black text-slate-500 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">{allMedia.length - audioOnly.length} VISUAL</span>
            </div>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {allMedia.map((asset, i) => {
               const active = i === currentAssetIndex;
               return (
                 <div 
                   key={asset.id} 
                   onClick={() => selectAsset(i)}
                   className={`group relative aspect-square rounded-[24px] overflow-hidden cursor-pointer transition-all border-2 ${active ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                 >
                    {asset.type === 'IMAGE' ? (
                        <img src={asset.data} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full bg-[#0b1021] flex flex-col items-center justify-center relative overflow-hidden">
                            {asset.metadata?.coverUrl && <img src={asset.metadata.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                            <span className="text-3xl relative z-10">{active && isPlaying ? '🔊' : '♫'}</span>
                        </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[7px] font-black text-white uppercase tracking-widest border border-white/10 z-20">
                        {asset.type}
                    </div>

                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <p className="text-[9px] font-black text-white uppercase truncate">{asset.title}</p>
                    </div>
                    
                    <button 
                         onClick={(e) => handleDelete(e, asset.id)}
                         className="absolute top-2 right-2 p-2 bg-rose-950/80 hover:bg-rose-600 text-white rounded-lg backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 transform translate-y-[-4px] group-hover:translate-y-0"
                    >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};