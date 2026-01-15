import React, { useMemo, useState } from 'react';
import { Lead } from '../../types';
import { groundedLeadSearch, pushLog } from '../../services/geminiService';
import { db } from '../../services/automation/db';
import { toast } from '../../services/toastManager';

type Props = {
  market: string;
  onNewLeads?: (leads: Lead[]) => void;
};

export const AutomatedSearch: React.FC<Props> = ({ market, onNewLeads }) => {
  const [query, setQuery] = useState<string>('');
  const [count, setCount] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Lead[]>([]);

  const canRun = useMemo(() => query.trim().length > 0, [query]);

  const run = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await groundedLeadSearch(query.trim(), market, count);
      const leads = res.leads || [];
      setResults(leads);

      // Explicitly upsert results to permanent storage
      db.upsertLeads(leads);

      if (onNewLeads) onNewLeads(leads);
      toast.success(`AUTO_CRAWL_COMPLETE: ${leads.length} records synchronized.`);
      pushLog(`AUTOMATED_SEARCH_OK query="${query.trim()}" count=${count}`);
    } catch (e: any) {
      const msg = e?.message || 'Automated search failed';
      setError(msg);
      pushLog(`AUTOMATED_SEARCH_ERR ${msg}`);
      toast.error(`AUTO_CRAWL_FAILED: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 space-y-12 animate-in fade-in duration-700">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white">AUTO <span className="text-emerald-500 italic">CRAWL</span></h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-3">Target Region: {market}</p>
      </div>

      <div className="bg-[#0b1021] border-2 border-slate-800 rounded-[40px] p-10 space-y-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row gap-6 relative z-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-[#020617] border-2 border-slate-800 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all shadow-inner"
            placeholder="Search query (e.g., “Luxury medspas in the suburbs”)"
          />

          <div className="flex items-center bg-[#020617] border-2 border-slate-800 rounded-2xl px-4 gap-4">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LIMIT:</span>
            <input
              type="number"
              value={count}
              min={3}
              max={30}
              onChange={(e) => setCount(Number(e.target.value || 10))}
              className="w-12 bg-transparent text-emerald-400 font-black text-sm outline-none"
            />
          </div>

          <button 
            onClick={run} 
            disabled={!canRun || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border-b-4 border-emerald-800"
          >
            {loading ? 'CRAWLING...' : 'RUN SEARCH'}
          </button>
        </div>

        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold uppercase text-center">{error}</div>}

        <div className="space-y-4">
           {results.length > 0 ? (
             results.map((l) => (
                <div key={l.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] hover:border-emerald-500/40 transition-all group flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-emerald-400 transition-colors">{l.businessName}</h3>
                    <div className="flex items-center gap-3 mt-1 opacity-60">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{l.niche}</span>
                       <span className="text-slate-700">•</span>
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{l.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className="text-2xl font-black italic text-emerald-500 tracking-tighter">{l.leadScore}</span>
                  </div>
                </div>
              ))
           ) : !loading && (
             <div className="h-64 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center opacity-20 italic">
                <span className="text-4xl mb-4">🕵️</span>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Establish parameters to begin crawl</p>
             </div>
           )}
           {loading && (
             <div className="py-20 flex flex-col items-center justify-center space-y-6">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] animate-pulse">Syncing grounded search vectors...</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};