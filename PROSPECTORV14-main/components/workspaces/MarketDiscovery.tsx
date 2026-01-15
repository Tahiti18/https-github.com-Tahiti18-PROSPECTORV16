import React, { useState, useRef, useEffect } from 'react';
import { Lead } from '../../types';
import { generateLeads } from '../../services/geminiService';
import { Loader } from '../../services/Loader';
import { toast } from '../../services/toastManager';
import { db } from '../../services/automation/db';

interface MarketDiscoveryProps {
  market: string;
  onLeadsGenerated: (l: Lead[]) => void;
}

const STRATEGIC_CLUSTERS = [
  {
    category: "HEALTH & AESTHETICS",
    niches: ["LUXURY MEDSPAS", "COSMETIC SURGEONS", "HIGH-END DENTAL", "PET HOSPITALS", "BEAUTY & WELLNESS"]
  },
  {
    category: "PROFESSIONAL SERVICES",
    niches: ["PERSONAL INJURY LAW", "FINANCIAL ADVISORY", "PRIVATE WEALTH MGMT", "RECRUITMENT AGENCIES", "EXECUTIVE COACHING"]
  },
  {
    category: "PROPERTY & DESIGN",
    niches: ["REAL ESTATE (LUXURY)", "INTERIOR DESIGN", "ARCHITECTURE FIRMS", "CONSTRUCTION (CUSTOM)", "ROOFING & SOLAR", "HVAC & HOME SERVICES"]
  },
  {
    category: "LUXURY LIFESTYLE",
    niches: ["BOUTIQUE HOSPITALITY", "FINE DINING GROUPS", "YACHT & PRIVATE JET", "EVENT ARCHITECTS", "FITNESS (ELITE)"]
  },
  {
    category: "TECH & INNOVATION",
    niches: ["SAAS & TECH STARTUPS", "BLOCKCHAIN ENTITIES", "SUSTAINABILITY TECH", "DIGITAL NOMAD HUBS"]
  },
  {
    category: "INDUSTRIAL & INSTITUTIONAL",
    niches: ["SPECIALIZED LOGISTICS", "SPECIALTY MANUFACTURING", "E-COMMERCE (PREMIUM)", "PRIVATE SCHOOLS", "FRANCHISE GROUPS"]
  }
];

export const MarketDiscovery: React.FC<MarketDiscoveryProps> = ({ market, onLeadsGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [niche, setNiche] = useState('LUXURY MEDSPAS');
  const [isCustomNiche, setIsCustomNiche] = useState(false);
  const [nicheExpanded, setNicheExpanded] = useState(false);
  const [volume, setVolume] = useState(6);
  const [isCustomVolume, setIsCustomVolume] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicheRef = useRef<HTMLDivElement>(null);

  // Close niche dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nicheRef.current && !nicheRef.current.contains(event.target as Node)) {
        setNicheExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScan = async () => {
    if (!market) {
        toast.error("Please select a target region.");
        return;
    }
    setLoading(true);
    try {
      const result = await generateLeads(market, niche || 'Business', volume);
      if (!result.leads || !Array.isArray(result.leads)) {
          throw new Error("Invalid intelligence response.");
      }

      const formatted: Lead[] = result.leads.map((l: any, i: number) => ({
        ...l, 
        id: l.id || `L-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`, 
        status: 'cold', 
        outreachStatus: 'cold', 
        rank: i + 1, 
        city: l.city || market, 
        niche: l.niche || niche || 'AI Transformation',
        leadScore: l.leadScore || 85,
        assetGrade: l.assetGrade || 'A'
      }));

      db.upsertLeads(formatted);
      onLeadsGenerated(formatted);
      toast.success(`${formatted.length} Client profiles synchronized.`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Discovery Interrupted: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const leads = db.getLeads();
    if (leads.length === 0) {
      toast.info("Ledger is empty.");
      return;
    }
    const dataStr = JSON.stringify(leads, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PROSPECTOR_DATABASE_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("DATABASE_EXPORTED");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target?.result as string);
            if (Array.isArray(imported)) {
                db.upsertLeads(imported);
                toast.success(`IMPORTED ${imported.length} RECORDS`);
            } else {
                toast.error("INVALID_FILE");
            }
        } catch (err) {
            toast.error("PARSE_FAILURE");
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNicheSelect = (val: string) => {
    if (val === "CUSTOM_OVERRIDE") {
      setIsCustomNiche(true);
      setNiche("");
    } else {
      setNiche(val);
      setIsCustomNiche(false);
    }
    setNicheExpanded(false);
  };

  const handleVolumePreset = (val: number) => {
    setVolume(val);
    setIsCustomVolume(false);
  };

  const handleCustomVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
        setVolume(Math.min(50, Math.max(1, val))); // Cap at 50 for API stability
    } else {
        setVolume(0);
    }
  };

  if (loading) return <div className="py-20"><Loader /></div>;

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in duration-500 pb-40">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
          MARKET <span className="text-emerald-500 italic">DISCOVERY</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-3 italic">
          Regional Intelligence Node // Active Market: <span className="text-emerald-400">{market}</span>
        </p>
      </div>

      {/* --- CONFIGURATION CARD --- */}
      <div className="bg-[#0b1021]/80 border-2 border-slate-800 rounded-[40px] p-12 space-y-10 shadow-2xl relative">
        {/* Background Clipping Layer for Glows */}
        <div className="absolute inset-0 rounded-[40px] overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-[50]">
          
          {/* --- CUSTOM NICHE SELECTOR --- */}
          <div className="space-y-4" ref={nicheRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">FOCUS INDUSTRY</label>
            <div className="relative">
              {isCustomNiche ? (
                <div className="relative group">
                  <input 
                    autoFocus
                    value={niche} 
                    onChange={(e) => setNiche(e.target.value.toUpperCase())} 
                    onKeyDown={(e) => e.key === 'Enter' && setIsCustomNiche(false)}
                    className="w-full bg-[#020617] border-2 border-emerald-500/50 rounded-2xl px-6 py-5 text-sm font-black text-emerald-400 focus:outline-none focus:border-emerald-500 transition-all shadow-inner uppercase tracking-widest italic" 
                    placeholder="TYPE CUSTOM NICHE..."
                  />
                  <button 
                    onClick={() => { setIsCustomNiche(false); setNiche(STRATEGIC_CLUSTERS[0].niches[0]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 hover:text-white uppercase tracking-widest"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setNicheExpanded(!nicheExpanded)}
                  className={`flex items-center justify-between w-full bg-[#020617] border-2 rounded-2xl px-6 py-5 cursor-pointer transition-all duration-300 group shadow-inner ${nicheExpanded ? 'border-emerald-500 bg-[#05091a]' : 'border-slate-800 hover:border-emerald-500/40'}`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.1em] truncate max-w-[220px]">
                      {niche || 'SELECT NICHE...'}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-emerald-500 transition-transform duration-300 ${nicheExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                </div>
              )}

              {/* DROPDOWN MENU */}
              {nicheExpanded && !isCustomNiche && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-[#0b1021] backdrop-blur-3xl border-2 border-slate-800 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in zoom-in-95 fade-in duration-200">
                  <div className="p-2 border-b border-slate-800 bg-emerald-500/5">
                    <button 
                      onClick={() => handleNicheSelect('CUSTOM_OVERRIDE')}
                      className="w-full text-left px-5 py-4 rounded-xl hover:bg-emerald-600 group transition-all flex items-center justify-between"
                    >
                      <span className="text-[10px] font-black text-emerald-400 group-hover:text-white uppercase tracking-widest italic">CUSTOM OVERRIDE...</span>
                      <span className="text-xs opacity-40 group-hover:opacity-100">✏️</span>
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-4">
                    {STRATEGIC_CLUSTERS.map((cluster) => (
                      <div key={cluster.category} className="space-y-1">
                        <div className="px-5 py-2">
                           <h4 className="text-[12px] font-black text-emerald-500/60 uppercase tracking-[0.35em] border-b border-emerald-500/10 pb-1.5">{cluster.category}</h4>
                        </div>
                        {cluster.niches.map(n => (
                          <button
                            key={n}
                            onClick={() => handleNicheSelect(n)}
                            className={`w-full text-left px-5 py-3 rounded-xl transition-all flex items-center justify-between group ${niche === n ? 'bg-emerald-600 shadow-lg' : 'hover:bg-slate-800/50'}`}
                          >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${niche === n ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{n}</span>
                            {niche === n && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">SAMPLE SIZE</label>
            <div className="flex gap-3">
              {[6, 12, 18].map(v => (
                <button 
                  key={v} 
                  onClick={() => handleVolumePreset(v)} 
                  className={`flex-1 py-5 rounded-2xl text-[11px] font-black border-2 transition-all active:scale-95 ${!isCustomVolume && volume === v ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-[#020617] border-slate-800 text-slate-500 hover:border-slate-600'}`}
                >
                  {v}
                </button>
              ))}
              
              {/* CUSTOM VOLUME SLOT */}
              <div className="flex-1">
                {isCustomVolume ? (
                    <input 
                        type="number"
                        autoFocus
                        value={volume || ''}
                        onChange={handleCustomVolumeInput}
                        onBlur={() => volume === 0 && setIsCustomVolume(false)}
                        className="w-full h-full bg-[#020617] border-2 border-emerald-500 rounded-2xl text-center text-[11px] font-black text-emerald-400 focus:outline-none shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        placeholder="--"
                    />
                ) : (
                    <button 
                        onClick={() => setIsCustomVolume(true)}
                        className={`w-full py-5 rounded-2xl text-[11px] font-black border-2 transition-all active:scale-95 ${isCustomVolume ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-[#020617] border-slate-800 text-slate-500 hover:border-slate-600 hover:text-emerald-400/80'}`}
                    >
                        CUSTOM
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleScan} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.4em] text-white shadow-xl shadow-emerald-600/20 active:scale-[0.98] border-b-4 border-emerald-800 transition-all relative z-10 flex items-center justify-center gap-4"
        >
          <span className="text-xl">📡</span>
          START MARKET ANALYSIS
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-10 bg-[#0b1021]/60 border-2 border-slate-800 rounded-[40px] shadow-xl relative z-10">
         <div className="flex gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-4 bg-slate-900 border-2 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              IMPORT LEDGER
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
            
            <button 
              onClick={handleExport}
              className="px-6 py-4 bg-slate-900 border-2 border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              EXPORT DATA
            </button>
         </div>

         <div className="flex items-center gap-4 bg-slate-950/50 px-6 py-3 rounded-2xl border border-slate-800">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">NODE_SYNCHRONIZED</span>
         </div>
      </div>
    </div>
  );
};