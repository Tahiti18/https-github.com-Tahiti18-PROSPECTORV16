import React, { useState, useEffect, useRef } from 'react';
import { Lead, BrandIdentity, MainMode, SubModule } from '../../types';
// Fix: toast is not exported from geminiService, importing from toastManager instead
import { extractBrandDNA } from '../../services/geminiService';
import { toast } from '../../services/toastManager';

interface BrandDNAProps {
  lead?: Lead;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => void;
  onNavigate?: (mode: MainMode, mod: SubModule) => void;
}

// Resilient Image Component to handle broken AI URLs
const BrandImage: React.FC<{ src: string }> = ({ src }) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    
    if (status === 'error') return null;

    return (
        <div className={`aspect-[4/5] bg-[#1a1a1a] rounded-[24px] overflow-hidden relative group border-2 border-slate-800/50 hover:border-emerald-500/50 transition-all cursor-pointer ${status === 'loading' ? 'animate-pulse' : ''}`}>
            <img 
                src={src} 
                onLoad={() => setStatus('success')}
                onError={() => setStatus('error')}
                className={`w-full h-full object-cover transition-all duration-700 ${status === 'success' ? 'opacity-80 group-hover:opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
                alt="Extracted Asset"
            />
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
};

// UI Modes
type ViewMode = 'INTRO' | 'IDLE' | 'SCANNING' | 'DASHBOARD';

export const BrandDNA: React.FC<BrandDNAProps> = ({ lead, onUpdateLead, onNavigate }) => {
  // --- STATE ---
  const [view, setView] = useState<ViewMode>('INTRO');
  const [targetUrl, setTargetUrl] = useState(lead?.websiteUrl || '');
  const [progress, setProgress] = useState(0);
  
  // Data State
  const [adHocLead, setAdHocLead] = useState<Partial<Lead>>({
    id: 'temp-adhoc',
    businessName: 'TARGET BRAND',
    niche: 'Unclassified',
    brandIdentity: undefined
  });

  const activeEntity = lead || adHocLead as Lead;
  const activeIdentity = activeEntity.brandIdentity;

  // Loading States
  const [scanStep, setScanStep] = useState(0);
  const extractionPromiseRef = useRef<Promise<BrandIdentity> | null>(null);
  const manualUploadRef = useRef<HTMLInputElement>(null);

  const SCAN_STEPS = [
    "Analyzing brand architecture...",
    "Conducting multi-vector search grounding...",
    "Verifying official business domain node...",
    "Crawling digital footprint and portfolios...",
    "Extracting typographic hierarchy...",
    "Sampling primary and secondary color gamut...",
    "Deconstructing visual tone and archetype...",
    "Harvesting high-fidelity hero photography...",
    "Synthesizing brand manifesto...",
    "Finalizing Alchemy Matrix..."
  ];

  // If lead already has DNA, jump to dashboard if coming from intro
  useEffect(() => {
    if (activeIdentity && view === 'INTRO') {
      setView('DASHBOARD');
    }
  }, [activeIdentity]);

  // --- ACTIONS ---

  const handleExtract = async () => {
    if (!targetUrl.trim()) return;
    
    let safeUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(safeUrl)) safeUrl = `https://${safeUrl}`;
    setTargetUrl(safeUrl); 

    setView('SCANNING');
    setScanStep(0);
    setProgress(0);

    // Simulation for cinematic effect (~30s total)
    const TOTAL_MS = 30000; 
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

      await new Promise(r => setTimeout(r, 1200));
      
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

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const currentImages = activeIdentity?.extractedImages || [];
        const updatedIdentity = { 
            ...activeIdentity!, 
            extractedImages: [dataUrl, ...currentImages] 
        };
        
        if (lead && onUpdateLead) {
          onUpdateLead(lead.id, { brandIdentity: updatedIdentity });
        } else {
          setAdHocLead(prev => ({ ...prev, brandIdentity: updatedIdentity }));
        }
        toast.success("Manual asset synchronized.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLooksGood = () => {
    if (onNavigate) onNavigate('OUTREACH', 'CAMPAIGN_ORCHESTRATOR');
  };

  // --- RENDERERS ---

  if (view === 'INTRO') {
    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-8 bg-[#0a0a0a] animate-in fade-in duration-1000">
            <div className="max-w-6xl w-full text-center space-y-20">
                <div className="space-y-6">
                    <span className="text-4xl">🧪</span>
                    <h1 className="text-6xl font-serif text-white italic tracking-tight">Welcome to Brand Alchemy</h1>
                    <p className="text-slate-400 text-lg font-medium opacity-80 uppercase tracking-widest">Easily generate on brand social media campaigns</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { step: 1, title: 'Generate Business DNA', desc: 'Enter your website and we\'ll analyze your brand and business.', icon: '🧬' },
                        { step: 2, title: 'Get campaign ideas', desc: 'We\'ll use your Business DNA to create tailored marketing ideas.', icon: '📢' },
                        { step: 3, title: 'Generate creatives', desc: 'We\'ll generate high quality, on brand creatives that are ready to share.', icon: '✨' }
                    ].map((s) => (
                        <div key={s.step} className="bg-[#141414] rounded-[48px] p-12 border-2 border-slate-800/50 flex flex-col items-center text-center space-y-6 shadow-xl group hover:border-emerald-500/30 transition-all">
                            <span className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">{s.step}</span>
                            <h3 className="text-2xl font-serif italic text-white leading-none">{s.title}</h3>
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-[32px] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                                {s.icon}
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-[200px]">{s.desc}</p>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => setView('IDLE')}
                    className="bg-[#c2d18b] hover:bg-[#d4ff5f] text-black px-16 py-5 rounded-full text-sm font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95"
                >
                    Let's go!
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
                    <h1 className="text-6xl font-serif text-white italic tracking-tight">Initialize Alchemy Protocol</h1>
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
            <div className="relative w-full max-w-xl bg-[#141414] rounded-[48px] p-20 text-center shadow-2xl border border-slate-800/80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
                
                <div className="space-y-12 relative z-10">
                    <div className="space-y-4">
                        <h2 className="text-4xl font-serif text-white italic tracking-tight">Generating your Business DNA</h2>
                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                            We’re conducting multi-vector research and domain verification. This will take several minutes.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#c2d18b]/20 border border-[#c2d18b]/30 rounded-full">
                       <span className="text-xl">✨</span>
                       <span className="text-[12px] font-bold text-[#c2d18b] uppercase tracking-wide animate-in fade-in" key={scanStep}>{SCAN_STEPS[scanStep]}</span>
                    </div>
                    
                    <div className="bg-[#0f0f0f] rounded-[32px] p-4 aspect-video flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden relative">
                        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                        <div className="w-16 h-16 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>

                    <div className="pt-6 flex flex-col items-center gap-4">
                       <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                       </div>
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic animate-pulse">STATUS: {progress}% COMPLETE</p>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (view === 'DASHBOARD' && activeIdentity) {
      return (
          <div className="max-w-[1550px] mx-auto py-12 px-8 space-y-12 animate-in fade-in zoom-in-95 duration-1000 bg-[#0a0a0a] min-h-screen pb-40">
              <div className="text-center space-y-6">
                  <span className="text-4xl">🧬</span>
                  <h1 className="text-6xl font-serif text-white italic tracking-tight leading-none uppercase tracking-tighter">Your Business DNA</h1>
                  <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed uppercase tracking-widest opacity-60">Here is a snapshot of your business for campaign orchestration. Feel free to edit this at anytime.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Left Column: Brand Cards */}
                  <div className="lg:col-span-6 space-y-6 flex flex-col">
                      <div className="bg-[#141414] rounded-[32px] p-12 flex flex-col justify-between border-2 border-slate-800/50 shadow-xl relative overflow-hidden flex-1">
                          <div className="space-y-4">
                              <h2 className="text-5xl font-serif text-white uppercase tracking-tighter leading-none">{activeEntity.businessName}</h2>
                              <a href={activeEntity.websiteUrl} target="_blank" className="text-[11px] text-emerald-400 font-mono hover:underline flex items-center gap-2 uppercase tracking-[0.1em]">
                                  🔗 {activeEntity.websiteUrl ? new URL(activeEntity.websiteUrl).hostname : 'N/A'}
                              </a>
                          </div>

                          <div className="grid grid-cols-2 gap-6 mt-12">
                              <div className="bg-[#1a1a1a] p-10 rounded-[32px] border border-slate-800 flex flex-col justify-center items-center text-center group transition-all hover:bg-slate-900">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 block">FONTS</span>
                                  <span className="text-6xl font-serif leading-none text-[#c2d18b]">Aa</span>
                                  <span className="text-[10px] font-black mt-6 text-slate-300 uppercase tracking-widest">{activeIdentity.fontPairing?.split('/')?.[0] || 'Modern Sans'}</span>
                              </div>
                              <div className="bg-[#1a1a1a] p-10 rounded-[32px] border border-slate-800 flex flex-col items-center justify-center group transition-all hover:bg-slate-900">
                                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 block">COLORS</span>
                                  <div className="flex gap-4">
                                      {(activeIdentity.colors || []).slice(0,3).map((c, i) => (
                                          <div key={i} className="flex flex-col items-center gap-3">
                                              <div className="w-12 h-12 rounded-full border-4 border-[#141414] shadow-xl transition-transform group-hover:scale-110" style={{ backgroundColor: c }}></div>
                                              <span className="text-[8px] font-bold text-slate-600 uppercase font-mono">{c}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-[#141414] rounded-[32px] p-12 border-2 border-slate-800/50 shadow-xl space-y-10">
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

                  {/* Right Column: Assets Scrollable Grid */}
                  <div className="lg:col-span-6 bg-[#141414] border-2 border-slate-800/50 rounded-[48px] p-12 shadow-2xl flex flex-col min-h-[850px]">
                      <div className="flex justify-between items-center mb-10 border-b border-slate-800/50 pb-8">
                          <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">DETECTED ASSETS</h3>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Extracted via Premier Alchemy engine.</p>
                          </div>
                          <div className="flex items-center gap-6">
                             <button 
                                onClick={() => manualUploadRef.current?.click()}
                                className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all"
                             >
                                + UPLOAD MANUALLY
                             </button>
                             <input type="file" ref={manualUploadRef} onChange={handleManualUpload} className="hidden" accept="image/*" />
                             <div className="text-right border-l border-slate-800 pl-6">
                                <span className="text-2xl font-black text-emerald-500 italic tracking-tighter">{(activeIdentity.extractedImages?.length || 0)}</span>
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block">ITEMS</span>
                             </div>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 overflow-y-auto custom-scrollbar pr-4 content-start">
                          {activeIdentity.extractedImages?.map((img, i) => (
                              <BrandImage key={i} src={img} />
                          ))}
                          {(!activeIdentity.extractedImages || activeIdentity.extractedImages.length === 0) && (
                              <div className="col-span-full h-96 flex flex-col items-center justify-center opacity-10 space-y-8 grayscale scale-110">
                                  <span className="text-[120px]">📂</span>
                                  <p className="text-[12px] font-black uppercase tracking-[0.8em]">Extraction Buffer Empty</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex justify-between items-center pt-16 border-t border-slate-800/50">
                  <button 
                    onClick={() => setView('INTRO')}
                    className="px-8 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-4 group"
                  >
                    <span className="group-hover:-translate-x-2 transition-transform text-lg">←</span> BACK
                  </button>
                  
                  <div className="flex items-center gap-8">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic hidden md:block">Next we'll use your Business DNA to generate social media campaigns</p>
                      <button 
                          onClick={handleLooksGood}
                          className="bg-[#c2d18b] hover:bg-[#d4ff5f] text-black px-16 py-6 rounded-full text-sm font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
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
