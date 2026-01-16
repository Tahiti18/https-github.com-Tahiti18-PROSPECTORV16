
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, BrandIdentity, MainMode, SubModule } from '../../types';
import { extractBrandDNA, saveAsset, subscribeToAssets, AssetRecord } from '../../services/geminiService';
import { toast } from '../../services/toastManager';

interface BrandDNAProps {
  lead?: Lead;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => void;
  onNavigate?: (mode: MainMode, mod: SubModule) => void;
}

// Resilient Image Component with intelligent loading and fallback
const BrandImage: React.FC<{ src: string; fallback?: string }> = ({ src, fallback }) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [currentSrc, setCurrentSrc] = useState(src);
    
    useEffect(() => {
        if (src.startsWith('data:')) setStatus('success');
    }, [src]);

    const handleError = () => {
        if (fallback && currentSrc !== fallback) {
            setCurrentSrc(fallback);
            setStatus('loading');
        } else {
            setStatus('error');
        }
    };

    return (
        <div className={`aspect-[4/5] bg-[#1a1a1a] rounded-[24px] overflow-hidden relative group border-2 border-slate-800/50 hover:border-emerald-500/50 transition-all cursor-pointer ${status === 'loading' ? 'animate-pulse' : ''}`}>
            {status === 'error' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 p-4 text-center">
                    <span className="text-2xl mb-2 opacity-20">🖼️</span>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-tight">MEDIA_LINK_UNRELIABLE</span>
                </div>
            ) : (
                <img 
                    src={currentSrc} 
                    onLoad={() => setStatus('success')}
                    onError={handleError}
                    className={`w-full h-full object-cover transition-all duration-700 ${status === 'success' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
                    alt="Extracted Asset"
                />
            )}
            
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
};

// HELPER: NEURAL ALCHEMY COMPRESSION (Resizes large iPad images to save storage)
const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200; 
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85)); 
        };
        img.src = dataUrl;
    });
};

type ViewMode = 'INTRO' | 'IDLE' | 'SCANNING' | 'DASHBOARD';

export const BrandDNA: React.FC<BrandDNAProps> = ({ lead, onUpdateLead, onNavigate }) => {
  const [view, setView] = useState<ViewMode>('INTRO');
  const [targetUrl, setTargetUrl] = useState(lead?.websiteUrl || '');
  const [progress, setProgress] = useState(0);
  const [globalAssets, setGlobalAssets] = useState<AssetRecord[]>([]);
  
  const [adHocLead, setAdHocLead] = useState<Partial<Lead>>({
    id: 'temp-adhoc',
    businessName: 'TARGET BRAND',
    niche: 'Unclassified',
    brandIdentity: undefined
  });

  const activeEntity = lead || adHocLead as Lead;
  const activeIdentity = activeEntity.brandIdentity;

  const [scanStep, setScanStep] = useState(0);
  const extractionPromiseRef = useRef<Promise<BrandIdentity> | null>(null);
  const manualUploadRef = useRef<HTMLInputElement>(null);

  // Unified Asset Feed: Deduplicate scraped images and manual uploads for this specific lead
  const unifiedAssets = useMemo(() => {
    const scraped = activeIdentity?.extractedImages || [];
    const manual = globalAssets
        .filter(a => a.type === 'IMAGE' && a.leadId === activeEntity.id)
        .map(a => a.data);
    
    // Create unique set to prevent "Duplication" error
    return Array.from(new Set([...manual, ...scraped]));
  }, [activeIdentity?.extractedImages, globalAssets, activeEntity.id]);

  useEffect(() => {
    const unsub = subscribeToAssets(setGlobalAssets);
    return () => unsub();
  }, []);

  const SCAN_STEPS = [
    "Analyzing brand architecture...",
    "Conducting multi-vector search grounding...",
    "Verifying official business domain node...",
    "Crawling digital footprint and portfolios...",
    "Extracting typographic hierarchy...",
    "Sampling primary and secondary color gamut...",
    "Deconstructing visual tone and archetype...",
    "Harvesting high-fidelity hero photography...",
    "Summarizing your business...",
    "Finalizing Alchemy Matrix..."
  ];

  useEffect(() => {
    if (activeIdentity && view === 'INTRO') {
      setView('DASHBOARD');
    }
  }, [activeIdentity]);

  const handleExtract = async () => {
    if (!targetUrl.trim()) {
        toast.info("Target URL required.");
        return;
    }
    
    let safeUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(safeUrl)) safeUrl = `https://${safeUrl}`;
    setTargetUrl(safeUrl); 

    setView('SCANNING');
    setScanStep(0);
    setProgress(0);

    const TOTAL_MS = 15000; 
    const stepIntervalMs = TOTAL_MS / SCAN_STEPS.length;

    extractionPromiseRef.current = extractBrandDNA(activeEntity, safeUrl);

    const progressInterval = setInterval(() => {
        setProgress(prev => (prev >= 99 ? 99 : prev + 1));
    }, TOTAL_MS / 100);

    const stepInterval = setInterval(() => {
        setScanStep(prev => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, stepIntervalMs);

    try {
      const brandData = await extractionPromiseRef.current;
      
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setProgress(100);
      setScanStep(SCAN_STEPS.length - 1);

      await new Promise(r => setTimeout(r, 600));
      
      // SYNC EVERY UNIQUE EXTRACTED IMAGE TO GLOBAL ASSET LIBRARY
      if (brandData.extractedImages) {
        brandData.extractedImages.forEach((img, idx) => {
          saveAsset('IMAGE', `DNA_EXTRACT_${idx+1}: ${activeEntity.businessName}`, img, 'BRAND_DNA', activeEntity.id);
        });
      }

      if (lead && onUpdateLead) {
        onUpdateLead(lead.id, { 
            brandIdentity: brandData,
            websiteUrl: brandData.verifiedUrl || targetUrl 
        });
      } else {
        setAdHocLead(prev => ({ 
            ...prev, 
            businessName: new URL(brandData.verifiedUrl || safeUrl).hostname.replace('www.', '').split('.')[0].toUpperCase(),
            websiteUrl: brandData.verifiedUrl || targetUrl,
            brandIdentity: brandData 
        }));
      }
      
      setView('DASHBOARD');
      toast.success("ALCHEMY MATRIX SYNCHRONIZED.");
      
    } catch (e: any) {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      toast.error(`Extraction failed: ${e.message || 'Check URL'}`);
      setView('IDLE');
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    toast.neural(`Alchemy Compression Active: Optimizing ${fileArray.length} assets...`);

    for (const file of fileArray) {
        const rawDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
        });
        
        // COMPRESS BEFORE SAVING
        const optimizedDataUrl = await compressImage(rawDataUrl);
        
        // COMMIT TO ASSET LIBRARY
        saveAsset('IMAGE', `MANUAL_UPLOAD: ${activeEntity.businessName}`, optimizedDataUrl, 'BRAND_DNA', activeEntity.id);
    }

    toast.success(`${fileArray.length} Assets Optimized and Synced.`);
    if (manualUploadRef.current) manualUploadRef.current.value = '';
  };

  const handleLooksGood = () => {
    if (onNavigate) {
        onNavigate('OUTREACH', 'CAMPAIGN_ORCHESTRATOR');
    } else {
        toast.info("Nav Link Offline. Re-initializing...");
    }
  };

  if (view === 'INTRO') {
    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-8 bg-[#0a0a0a] animate-in fade-in duration-1000">
            <div className="max-w-6xl w-full text-center space-y-20">
                <div className="space-y-6">
                    <span className="text-4xl">🧪</span>
                    <h1 className="text-3xl font-serif text-white italic tracking-tight uppercase">Brand Alchemy Protocol</h1>
                    <p className="text-slate-400 text-sm font-medium opacity-80 uppercase tracking-widest">Generate On-Brand Campaigns with Neural Extraction</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { step: 1, title: 'Extract DNA', desc: 'Enter your website and we\'ll extract your unique brand matrix.', icon: '🧬' },
                        { step: 2, title: 'Concept Hooks', desc: 'We\'ll use your DNA to create tailored marketing hooks.', icon: '📢' },
                        { step: 3, title: 'Synthesize Assets', desc: 'Neural synthesis of high-fidelity, on-brand creatives.', icon: '✨' }
                    ].map((s) => (
                        <div key={s.step} className="bg-[#141414] rounded-[48px] p-12 border-2 border-slate-800/50 flex flex-col items-center text-center space-y-6 shadow-xl group hover:border-emerald-500/30 transition-all">
                            <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">{s.step}</div>
                            <h3 className="text-lg font-serif italic text-white leading-none uppercase">{s.title}</h3>
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                                {s.icon}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{s.desc}</p>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => setView('IDLE')}
                    className="bg-[#c2d18b] hover:bg-[#d4ff5f] text-black px-16 py-5 rounded-full text-sm font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95"
                >
                    Initialize Extraction
                </button>
            </div>
        </div>
    );
  }

  if (view === 'IDLE') {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-[#0a0a0a]">
            <div className="max-w-3xl w-full text-center space-y-12">
                <div className="space-y-4">
                    <h1 className="text-3xl font-serif text-white italic tracking-tight uppercase">Initialize Alchemy Protocol</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Enter official business domain for extraction</p>
                </div>
                <div className="relative max-w-xl mx-auto space-y-10">
                    <input 
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                        placeholder="HTTPS://BUSINESS-DOMAIN.COM"
                        className="w-full bg-[#141414] border-2 border-slate-800 rounded-full px-10 py-7 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all shadow-2xl"
                    />
                    <button 
                        onClick={handleExtract}
                        className="bg-[#c2d18b] hover:bg-[#d4ff5f] text-black px-16 py-5 rounded-full text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                    >
                        START ALCHEMY AUDIT
                    </button>
                </div>
            </div>
        </div>
    );
  }

  if (view === 'SCANNING') {
      return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 bg-[#0a0a0a]">
            <div className="relative w-full max-w-xl bg-[#141414] rounded-[48px] p-16 text-center shadow-2xl border border-slate-800/80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
                
                <div className="space-y-10 relative z-10">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-serif text-white italic tracking-tight uppercase leading-none">Generating Business DNA</h2>
                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                            We’re researching and analyzing your business. This usually takes 30-60 seconds.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#c2d18b] border border-[#c2d18b]/30 rounded-full">
                       <span className="text-xl">✨</span>
                       <span className="text-[11px] font-black text-black uppercase tracking-wide animate-in fade-in" key={scanStep}>{SCAN_STEPS[scanStep]}</span>
                    </div>
                    
                    <div className="bg-[#0f0f0f] rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl relative aspect-video flex items-center justify-center">
                        {targetUrl ? (
                            <img 
                                src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1280&h=960`} 
                                className="w-full h-full object-cover opacity-80" 
                                alt="Site Preview"
                            />
                        ) : (
                            <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                        )}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 px-6 py-4 rounded-full flex items-center justify-center gap-3">
                        <span className="text-slate-500">🔗</span>
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest truncate max-w-xs">{targetUrl}</span>
                    </div>

                    <div className="pt-4 flex flex-col items-center gap-4">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic animate-pulse">PROCESSING_MATRICES</p>
                       </div>
                       <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                       </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setView('IDLE')}
                className="mt-8 px-8 py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
            >
                ← ABORT_SCAN
            </button>
        </div>
      );
  }

  if (view === 'DASHBOARD' && activeIdentity) {
      return (
          <div className="max-w-[1550px] mx-auto py-12 px-8 space-y-12 animate-in fade-in zoom-in-95 duration-1000 bg-[#0a0a0a] min-h-screen pb-40">
              <div className="text-center space-y-6">
                  <span className="text-4xl">🧬</span>
                  <h1 className="text-3xl font-serif text-white italic tracking-tight leading-none uppercase tracking-tighter">Your Business DNA</h1>
                  <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed uppercase tracking-widest opacity-60">Neural snapshot of your business profile and creative assets.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-6 space-y-6 flex flex-col">
                      <div className="bg-[#141414] rounded-[32px] p-12 flex flex-col justify-between border-2 border-slate-800/50 shadow-xl relative overflow-hidden flex-1 min-h-[400px]">
                          <div className="space-y-4">
                              <h2 className="text-2xl font-serif text-white uppercase tracking-tighter leading-tight max-w-md">{activeEntity.businessName}</h2>
                              <a href={activeEntity.websiteUrl} target="_blank" className="text-[11px] text-emerald-400 font-mono hover:underline flex items-center gap-2 uppercase tracking-[0.1em]">
                                  🔗 {activeEntity.websiteUrl ? new URL(activeEntity.websiteUrl).hostname : 'N/A'}
                              </a>
                          </div>

                          <div className="grid grid-cols-2 gap-6 mt-12">
                              <div className="bg-[#1a1a1a] p-12 rounded-[40px] border border-slate-800 flex flex-col justify-center items-center text-center group transition-all hover:bg-slate-900 shadow-xl">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 block">FONTS</span>
                                  <span className="text-5xl font-serif leading-none text-[#c2d18b]">Aa</span>
                                  <span className="text-[10px] font-black mt-8 text-slate-300 uppercase tracking-widest">{activeIdentity.fontPairing?.split('/')?.[0] || 'Modern Sans'}</span>
                              </div>
                              <div className="bg-[#1a1a1a] p-12 rounded-[40px] border border-slate-800 flex flex-col items-center justify-center group transition-all hover:bg-slate-900 shadow-xl">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-8 block">COLORS</span>
                                  <div className="flex gap-6">
                                      {(activeIdentity.colors || []).slice(0,3).map((c, i) => (
                                          <div key={i} className="flex flex-col items-center gap-4">
                                              <div className="w-10 h-10 rounded-full border-4 border-[#141414] shadow-2xl transition-transform group-hover:scale-110" style={{ backgroundColor: c }}></div>
                                              <span className="text-[8px] font-bold text-slate-600 uppercase font-mono">{c}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-[#141414] rounded-[48px] p-12 border-2 border-slate-800/50 shadow-xl space-y-10">
                          <div className="space-y-6">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] block border-b border-slate-800 pb-4">BRAND VOICE & ARCHETYPE</span>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-6 py-3 rounded-full border-2 border-slate-800 bg-slate-900/50 text-slate-300 text-[11px] font-serif italic uppercase tracking-widest">{activeIdentity.visualTone || 'Elite Professional'}</span>
                                <span className="px-6 py-3 rounded-full border-2 border-emerald-500/30 bg-emerald-900/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-inner">{activeIdentity.archetype || 'Creator'}</span>
                            </div>
                          </div>
                          
                          {activeIdentity.manifesto && (
                            <div className="pt-8 border-t border-slate-800">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] block mb-4">BRAND MANIFESTO</span>
                                <p className="text-[13px] text-slate-300 font-medium leading-relaxed italic line-clamp-10">"{activeIdentity.manifesto}"</p>
                            </div>
                          )}
                      </div>
                  </div>

                  <div className="lg:col-span-6 bg-[#141414] border-2 border-slate-800/50 rounded-[56px] p-12 shadow-2xl flex flex-col min-h-[850px]">
                      <div className="flex justify-between items-center mb-12 border-b border-slate-800/50 pb-10">
                          <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">DETECTED ASSETS</h3>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic">Unique visual proofs and manual uploads.</p>
                          </div>
                          <div className="flex items-center gap-8">
                             <button 
                                onClick={() => manualUploadRef.current?.click()}
                                className="px-6 py-3 bg-[#1a1a1a] border border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all shadow-lg uppercase tracking-widest"
                             >
                                + ADD ASSETS
                             </button>
                             <input 
                                type="file" 
                                ref={manualUploadRef} 
                                onChange={handleManualUpload} 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                             />
                             <div className="text-right border-l border-slate-800 pl-8">
                                <span className="text-3xl font-black text-emerald-500 italic tracking-tighter">{unifiedAssets.length}</span>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">ITEMS</span>
                             </div>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 overflow-y-auto custom-scrollbar pr-4 content-start">
                          {unifiedAssets.map((img, i) => (
                              <BrandImage key={i} src={img} fallback={activeIdentity.screenshotUrl} />
                          ))}
                          {unifiedAssets.length === 0 && (
                              <div className="col-span-full h-96 flex flex-col items-center justify-center opacity-10 space-y-8 grayscale scale-110">
                                  <span className="text-[120px]">📂</span>
                                  <p className="text-[12px] font-black uppercase tracking-[0.8em]">Extraction Buffer Empty</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex justify-between items-center pt-20 border-t border-slate-800/50">
                  <button 
                    onClick={() => setView('SCANNING')}
                    className="px-10 py-5 text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-6 group border border-slate-800 rounded-full"
                  >
                    <span className="group-hover:-translate-x-2 transition-transform text-lg">←</span> RESET
                  </button>
                  
                  <div className="flex items-center gap-12">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic hidden xl:block">READY TO GENERATE SOCIAL MEDIA CAMPAIGNS?</p>
                      <button 
                          onClick={handleLooksGood}
                          className="bg-[#c2d18b] hover:bg-[#d4ff5f] text-black px-20 py-7 rounded-full text-sm font-black uppercase tracking-widest shadow-[0_0_50px_rgba(194,209,139,0.3)] active:scale-95 transition-all"
                      >
                          Looks good
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#0a0a0a] p-20 border-2 border-dashed border-slate-800 rounded-[64px] m-10">
        <p className="text-[12px] font-black text-slate-700 uppercase tracking-[0.6em] animate-pulse">Alchemy Matrix Fault: Critical State Sync Required</p>
        <button onClick={() => setView('IDLE')} className="mt-8 bg-slate-900 border border-slate-800 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800">RESET MODULE</button>
    </div>
  );
};
