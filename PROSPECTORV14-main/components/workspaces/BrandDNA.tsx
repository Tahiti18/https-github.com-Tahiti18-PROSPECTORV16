import React, { useState, useEffect, useRef } from 'react';
import { Lead, CreativeAsset, Campaign, BrandIdentity } from '../../types';
import { extractBrandDNA, generateVisual, saveAsset, loggedGenerateContent } from '../../services/geminiService';
import { toast } from '../../services/toastManager';

interface BrandDNAProps {
  lead?: Lead;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => void;
}

// Resilient Image Component to handle broken AI URLs
const BrandImage: React.FC<{ src: string }> = ({ src }) => {
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    
    if (status === 'error') return null;

    return (
        <div className={`aspect-[3/4] bg-[#020617] rounded-2xl overflow-hidden relative group border border-slate-800 hover:border-[#d4ff5f] transition-all cursor-pointer ${status === 'loading' ? 'animate-pulse' : ''}`}>
            <img 
                src={src} 
                onLoad={() => setStatus('success')}
                onError={() => setStatus('error')}
                className={`w-full h-full object-cover transition-all duration-700 ${status === 'success' ? 'opacity-80 group-hover:opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
                alt="Extracted Asset"
            />
            <div className="absolute top-2 right-2 w-6 h-6 bg-[#d4ff5f] text-black rounded-full flex items-center justify-center text-[12px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20">
                +
            </div>
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-[#d4ff5f]/20 border-t-[#d4ff5f] rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

// UI Modes
type ViewMode = 'IDLE' | 'SCANNING' | 'DASHBOARD' | 'STRATEGY_SELECT' | 'CAMPAIGN';

interface CampaignConcept {
  id: string;
  title: string;
  hook: string;
  visualDirection: string;
}

export const BrandDNA: React.FC<BrandDNAProps> = ({ lead, onUpdateLead }) => {
  // --- STATE ---
  const [view, setView] = useState<ViewMode>('IDLE');
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

  // Flow State
  const [concepts, setConcepts] = useState<CampaignConcept[]>([]);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  
  // Loading States
  const [scanStep, setScanStep] = useState(0);
  const extractionRef = useRef<Promise<BrandIdentity> | null>(null);
  const manualUploadRef = useRef<HTMLInputElement>(null);

  const SCAN_STEPS = [
    "Establishing multi-vector neural link to root domain...",
    "Scanning hierarchy of sub-pages and internal directories...",
    "Crawling official social media portfolios (IG, Behance, FB)...",
    "Analyzing typographic scale and hierarchy (H1-H6, Body)...",
    "Sampling primary, secondary, and accent color gamut...",
    "Extracting brand values and core mission statement...",
    "Evaluating visual tone and Jungian archetype deconstruction...",
    "Harvesting high-fidelity hero photography (filtering icons)...",
    "Deconstructing aesthetic DNA markers for future synthesis...",
    "Cross-referencing PR archives for brand authority signals...",
    "Compiling Alchemy Matrix into high-fidelity structure..."
  ];

  // Logic to handle auto-dashboard if lead already has DNA
  useEffect(() => {
    if (activeIdentity && view === 'IDLE') {
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

    // TARGET DURATION: 5 Minutes (300,000ms)
    const TOTAL_MS = 300000; 
    const stepIntervalMs = TOTAL_MS / SCAN_STEPS.length;

    // 1. Kick off the REAL async extraction
    extractionRef.current = extractBrandDNA(activeEntity, safeUrl);

    // 2. Start the simulation timers
    const progressInterval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 99) return 99; // Cap at 99 until real AI call finishes
            return prev + 1;
        });
    }, TOTAL_MS / 100);

    const stepInterval = setInterval(() => {
        setScanStep(prev => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, stepIntervalMs);

    try {
      // 3. Wait for the real API response
      const brandData = await extractionRef.current;
      
      // 4. Force a minimum wait if the AI was too fast (we want that 5m feel)
      // but if the user wants it faster, we could allow skipping.
      // For this spec, we want it to feel deep.
      
      // 5. Finalize
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      setProgress(100);
      setScanStep(SCAN_STEPS.length - 1);

      // Brief pause at 100% for impact
      await new Promise(r => setTimeout(r, 1500));
      
      if (lead && onUpdateLead) {
        onUpdateLead(lead.id, { brandIdentity: brandData });
      } else {
        let name = "TARGET";
        try { name = new URL(safeUrl).hostname.replace('www.', '').split('.')[0].toUpperCase(); } catch (e) {}
        setAdHocLead(prev => ({ ...prev, businessName: name, brandIdentity: brandData }));
      }
      setView('DASHBOARD');
      toast.success("PREMIER AUDIT SYNCHRONIZED.");
    } catch (e: any) {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      console.error("Extraction Failed:", e);
      toast.error(`Extraction failed: ${e.message || 'Node Error'}`);
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
            extractedImages: [...currentImages, dataUrl] 
        };
        
        if (lead && onUpdateLead) {
          onUpdateLead(lead.id, { brandIdentity: updatedIdentity });
        } else {
          setAdHocLead(prev => ({ ...prev, brandIdentity: updatedIdentity }));
        }
        toast.success("Manual asset uplink established.");
      };
      reader.readAsDataURL(file);
    }
  };

  const generateConcepts = async () => {
    if (isGeneratingConcepts) return;
    setIsGeneratingConcepts(true);
    try {
        const prompt = `
            STRATEGY FORGE: Analyze the Brand DNA for "${activeEntity.businessName}". 
            Tone: ${activeIdentity?.visualTone}. 
            Archetype: ${activeIdentity?.archetype}.
            
            Generate exactly 3 high-impact social media campaign concepts based on these aesthetic markers.
            Return ONLY a valid JSON array of objects.
        `;
        
        const response = await loggedGenerateContent({
            module: 'BRAND_STRATEGY', 
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const parsed = JSON.parse(response);
        setConcepts(parsed.map((c: any, i: number) => ({ ...c, id: `concept-${i}` })));
        setView('STRATEGY_SELECT');
    } catch (e) {
        toast.error("Strategy synthesis interrupted.");
    } finally {
        setIsGeneratingConcepts(false);
    }
  };

  // --- RENDERERS ---

  if (view === 'IDLE') {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-[#020617]">
            <div className="max-w-3xl w-full text-center space-y-16 animate-in fade-in duration-1000">
                <div className="space-y-8">
                    <span className="text-7xl animate-pulse inline-block">🧬</span>
                    <h1 className="text-7xl font-serif text-[#e2e2e2] italic tracking-tight leading-none">Brand Alchemy</h1>
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.6em] max-w-lg mx-auto leading-relaxed">
                        Exhaustive multi-vector aesthetic deconstruction protocol.
                    </p>
                </div>

                <div className="relative group max-w-xl mx-auto space-y-10">
                    <div className="relative">
                        <input 
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                            placeholder="HTTPS://BUSINESS-DOMAIN.COM"
                            className="w-full bg-[#0b1021] border-2 border-slate-800 text-[#e2e2e2] px-10 py-7 rounded-[32px] text-center text-sm font-bold focus:outline-none focus:border-[#d4ff5f] transition-all shadow-2xl placeholder-slate-700"
                        />
                    </div>
                    <button 
                        onClick={handleExtract}
                        className="bg-[#d4ff5f] hover:bg-[#b8e645] text-black px-16 py-6 rounded-full text-xs font-black uppercase tracking-[0.4em] transition-all active:scale-95 shadow-[0_0_40px_rgba(212,255,95,0.2)] border-b-4 border-[#a2c83c]"
                    >
                        INITIATE PREMIER AUDIT
                    </button>
                </div>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.5em] italic opacity-40">
                  ESTIMATED ANALYSIS TIME: 4-5 MINUTES FOR HIGH-FIDELITY EXTRACTION
                </p>
            </div>
        </div>
    );
  }

  if (view === 'SCANNING') {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-[#020617]">
            <div className="relative w-full max-w-3xl bg-[#0b1021] rounded-[64px] p-20 text-center shadow-2xl border-2 border-slate-800/80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#d4ff5f]/5 to-transparent rounded-[64px] pointer-events-none"></div>
                
                <div className="space-y-12 relative z-10">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-serif text-[#e2e2e2] italic tracking-tight">Conducting Alchemy Audit</h2>
                        <p className="text-[10px] text-slate-500 font-black leading-relaxed max-w-md mx-auto uppercase tracking-[0.4em]">
                            Establishing multi-vector grounded search of global digital footprint and social presence.
                        </p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-8 py-4">
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50 p-[1px]">
                           <div className="h-full bg-[#d4ff5f] transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(212,255,95,0.5)] rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between w-full text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
                            <span>Status: Processing</span>
                            <span className="text-white">{progress}% Complete</span>
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-5 px-10 py-5 bg-[#05091a] rounded-[24px] border border-slate-800 shadow-inner min-w-[400px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#d4ff5f] animate-pulse shadow-[0_0_10px_rgba(212,255,95,0.8)]"></div>
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.25em] animate-in fade-in duration-500 text-left" key={scanStep}>
                           {SCAN_STEPS[scanStep]}
                        </span>
                    </div>
                    
                    <div className="pt-6">
                        <p className="text-[10px] text-slate-600 italic uppercase tracking-[0.4em] animate-pulse">
                          PHASE: NEURAL SIGNAL DECONSTRUCTION ACTIVE
                        </p>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (view === 'DASHBOARD' && activeIdentity) {
      const fontName = activeIdentity.fontPairing?.split('/')?.[0] || 'Modern Sans';
      return (
          <div className="max-w-[1700px] mx-auto py-12 px-8 space-y-12 animate-in fade-in zoom-in-95 duration-1000 bg-[#020617] min-h-screen pb-40">
              <div className="text-center space-y-4">
                  <span className="text-4xl">🧬</span>
                  <h1 className="text-6xl font-serif text-[#e2e2e2] italic tracking-tight">Alchemy Matrix</h1>
                  <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.6em] italic">PREMIER AESTHETIC EXTRACTION FOR {activeEntity.businessName}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Left Column: Identity Info */}
                  <div className="lg:col-span-5 space-y-8">
                      <div className="bg-[#0b1021] rounded-[48px] p-12 border-2 border-slate-800 flex flex-col justify-between min-h-[400px] relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-[200px] font-black italic select-none pointer-events-none">A</div>
                          
                          <div className="relative z-10">
                              <h2 className="text-5xl font-serif text-white mb-4 uppercase tracking-tighter leading-none">{activeEntity.businessName}</h2>
                              <a href={targetUrl} target="_blank" className="text-[11px] text-[#d4ff5f] font-mono hover:underline flex items-center gap-3 uppercase tracking-[0.3em] font-black">
                                  🔗 {targetUrl ? new URL(targetUrl).hostname : 'N/A'}
                              </a>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6 mt-12 relative z-10">
                              <div className="bg-[#05091a] p-8 rounded-[32px] border border-slate-800 shadow-inner">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-5 block">COLOR GENOME</span>
                                  <div className="flex -space-x-3">
                                      {(activeIdentity.colors || ['#222']).slice(0,5).map((c, i) => (
                                          <div key={i} className="w-12 h-12 rounded-full border-4 border-[#0b1021] shadow-xl transition-transform hover:scale-110 cursor-pointer" style={{ backgroundColor: c }} title={c}></div>
                                      ))}
                                  </div>
                              </div>
                              <div className="bg-[#e8e8e3] p-8 rounded-[32px] text-black flex flex-col justify-center items-center text-center shadow-xl group transition-all hover:bg-white">
                                  <span className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">TYPOGRAPHY</span>
                                  <span className="text-5xl font-serif leading-none">Aa</span>
                                  <span className="text-[10px] font-black mt-3 uppercase tracking-widest">{fontName}</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-[#0b1021] rounded-[48px] p-10 border-2 border-slate-800 shadow-2xl space-y-8">
                          <div className="space-y-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block border-b border-slate-800 pb-4">BRAND VOICE & ARCHETYPE</span>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-6 py-3 rounded-full border-2 border-slate-800 bg-slate-900/50 text-slate-300 text-[11px] font-serif italic uppercase tracking-widest">{activeIdentity.visualTone || 'Elite Professional'}</span>
                                <span className="px-6 py-3 rounded-full border-2 border-emerald-500/20 bg-emerald-900/10 text-emerald-400 text-[11px] font-black uppercase tracking-widest shadow-inner">{activeIdentity.archetype || 'Creator'}</span>
                            </div>
                          </div>
                          {activeIdentity.manifesto && (
                            <div className="pt-8 border-t border-slate-800">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] block mb-3">BRAND MANIFESTO</span>
                                <p className="text-[12px] text-slate-400 font-medium leading-relaxed italic line-clamp-6">"{activeIdentity.manifesto}"</p>
                            </div>
                          )}
                          {activeIdentity.competitiveGapNarrative && (
                            <div className="pt-8 border-t border-slate-800">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em] block mb-3">COMPETITIVE DEFICIT AUDIT</span>
                                <p className="text-[12px] text-slate-500 font-bold leading-relaxed">"{activeIdentity.competitiveGapNarrative}"</p>
                            </div>
                          )}
                      </div>
                  </div>

                  {/* Right Column: Assets Grid */}
                  <div className="lg:col-span-7 bg-[#0b1021] rounded-[64px] p-12 border-2 border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col min-h-[800px]">
                      <div className="flex justify-between items-center mb-12">
                          <div className="space-y-1">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">DETECTED ASSETS</h3>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic">Authentic photography extracted via grounded multi-vector crawl.</p>
                          </div>
                          <div className="flex items-center gap-6">
                              <button 
                                onClick={() => manualUploadRef.current?.click()}
                                className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-[#d4ff5f] hover:bg-[#d4ff5f] hover:text-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                              >
                                + Upload Manually
                              </button>
                              <input type="file" ref={manualUploadRef} onChange={handleManualUpload} className="hidden" accept="image/*" />
                              <span className="text-[11px] text-[#d4ff5f] font-black tracking-[0.2em] uppercase border-l-2 border-slate-800 pl-6">{(activeIdentity.extractedImages?.length || 0)} ITEMS EXTRACTED</span>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                          {activeIdentity.extractedImages?.map((img, i) => (
                              <BrandImage key={i} src={img} />
                          ))}
                          {(!activeIdentity.extractedImages || activeIdentity.extractedImages.length === 0) && (
                              <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 space-y-6 grayscale scale-110">
                                  <span className="text-[120px]">📂</span>
                                  <p className="text-[12px] font-black uppercase tracking-[0.8em]">Extraction Buffer Empty</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="flex justify-between items-center pt-12 border-t border-slate-800">
                  <button 
                    onClick={() => setView('IDLE')}
                    className="px-8 py-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3 group"
                  