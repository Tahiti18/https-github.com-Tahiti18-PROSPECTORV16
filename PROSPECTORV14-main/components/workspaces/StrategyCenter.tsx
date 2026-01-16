import React, { useState, useEffect } from 'react';
import { Lead, OutreachStatus, MainMode, SubModule } from '../../types';
import { dossierStorage } from '../../services/dossierStorage';
import { toast } from '../../services/toastManager';

interface StrategyCenterProps {
  lead?: Lead;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => void;
  onNavigate?: (mode: MainMode, mod: SubModule) => void; 
}

const STATUS_OPTIONS: OutreachStatus[] = ['cold', 'queued', 'sent', 'opened', 'replied', 'booked', 'won', 'lost', 'paused'];

const OPPORTUNITIES = [
  { label: "Content Optimization Engine (Reels/TikTok)", target: { mode: 'MEDIA' as MainMode, mod: 'VIDEO_PRODUCTION' as SubModule } },
  { id: 'CONCIERGE', label: "AI Support Simulation", target: { mode: 'OUTREACH' as MainMode, mod: 'AI_CONCIERGE' as SubModule } },
  { label: "Design Blueprint Studio", target: { mode: 'DESIGN' as MainMode, mod: 'MOCKUPS_4K' as SubModule } },
  { label: "Client Engagement Architect", target: { mode: 'OUTREACH' as MainMode, mod: 'SEQUENCER' as SubModule } }
];

export const StrategyCenter: React.FC<StrategyCenterProps> = ({ lead, onUpdateLead, onNavigate }) => {
  const [localNotes, setLocalNotes] = useState('');
  const [dossier, setDossier] = useState<any>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  useEffect(() => {
    if (lead) {
      setLocalNotes(lead.notes || '');
      setDossier(dossierStorage.getByLead(lead.id));
      setTempUrl(lead.websiteUrl || '');
    }
  }, [lead?.id]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalNotes(val);
    if (lead && onUpdateLead) onUpdateLead(lead.id, { notes: val });
  };

  const handleUrlSave = () => {
    if (lead && onUpdateLead) {
        onUpdateLead(lead.id, { websiteUrl: tempUrl });
        setIsEditingUrl(false);
        toast.success("Domain Node Synchronized.");
    }
  };

  const handleActivate = (opp: any) => {
    toast.info(`INITIATING: ${opp.label}`);
    if (onNavigate) {
      setTimeout(() => onNavigate(opp.target.mode, opp.target.mod), 500);
    }
  };

  const handleStartForge = () => {
    if (onNavigate) onNavigate('OUTREACH', 'CAMPAIGN_ORCHESTRATOR');
  };

  if (!lead) return <div className="h-96 flex flex-col items-center justify-center opacity-50 uppercase font-black text-[10px] tracking-[0.4em]">Awaiting Client Selection</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white leading-none">
            STRATEGY <span className="text-emerald-500">CENTER</span>
          </h1>
          <div className="flex items-center gap-4">
             <p className="text-xl font-medium text-slate-400 italic">{lead.businessName}</p>
             {isEditingUrl ? (
                <div className="flex gap-2">
                    <input 
                        value={tempUrl} 
                        onChange={(e) => setTempUrl(e.target.value)}
                        className="bg-[#0b1021] border border-emerald-500/50 rounded-lg px-3 py-1 text-xs text-white outline-none"
                    />
                    <button onClick={handleUrlSave} className="text-[10px] font-black text-emerald-400">SAVE</button>
                    <button onClick={() => setIsEditingUrl(false)} className="text-[10px] font-black text-slate-500">ESC</button>
                </div>
             ) : (
                <button onClick={() => setIsEditingUrl(true)} className="text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase border-b border-dashed border-slate-700">
                    {lead.websiteUrl || 'CONNECT DOMAIN...'} ✏️
                </button>
             )}
          </div>
        </div>
        <div className="flex gap-3">
          <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all">Visit Site</a>
          <button onClick={() => onNavigate?.('DESIGN', 'BRAND_DNA')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg">Brand Identity</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {dossier ? (
            <div className="bg-[#0b1021] border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
               <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">Current Solution Framework</h3>
               <p className="text-lg text-slate-300 font-serif italic mb-8">"{dossier.data.narrative}"</p>
               <button onClick={() => onNavigate?.('OUTREACH', 'CAMPAIGN_ORCHESTRATOR')} className="text-[10px] font-black text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">REVIEW ARCHITECTURE →</button>
            </div>
          ) : (
            <div className="bg-[#0b1021]/60 border-2 border-slate-800 border-dashed rounded-[48px] p-16 text-center space-y-8">
               <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-3xl mx-auto grayscale opacity-20">🎯</div>
               <div className="space-y-2">
                   <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Strategic Gap Detected</h3>
                   <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest max-w-sm mx-auto">No active strategy dossier found for this target. Run the Campaign Engine to begin.</p>
               </div>
               <button 
                onClick={handleStartForge}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-4 border-emerald-800"
               >
                 INITIATE STRATEGY FORGE
               </button>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8">
             <h3 className="font-bold text-white mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
               Growth Path Options
             </h3>
             <div className="space-y-3">
                {OPPORTUNITIES.map((opp, i) => (
                  <button key={i} onClick={() => handleActivate(opp)} className="w-full flex items-center gap-4 p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all group text-left">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center font-black text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">{i+1}</div>
                    <span className="text-slate-300 font-medium group-hover:text-white">{opp.label}</span>
                    <span className="ml-auto text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-500">INITIALIZE</span>
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#0b1021] border border-slate-800 rounded-3xl p-8 shadow-xl">
             <h3 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Consultant Notes</h3>
             <textarea 
                value={localNotes}
                onChange={handleNotesChange}
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 outline-none focus:border-emerald-500 resize-none font-medium leading-relaxed"
                placeholder="Record project observations..."
             />
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-3xl p-8">
             <h3 className="font-bold text-emerald-400 mb-4 uppercase tracking-widest text-xs">Relationship Lifecycle</h3>
             <select 
                value={lead.outreachStatus || 'cold'} 
                onChange={(e) => onUpdateLead?.(lead.id, { outreachStatus: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white uppercase focus:border-emerald-500 outline-none cursor-pointer"
             >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
             </select>
          </div>
        </div>
      </div>
    </div>
  );
};
