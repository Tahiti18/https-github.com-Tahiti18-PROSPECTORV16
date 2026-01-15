import React, { useEffect, useState, useMemo } from 'react';
import { AutomationRun, AutomationArtifact } from '../../services/automation/types';
import { AutomationOrchestrator } from '../../services/automation/orchestrator';
import { FormattedOutput } from '../common/FormattedOutput';

interface RunStatusProps {
  runId: string;
  onClose: () => void;
}

const STEP_META: Record<string, { label: string; goal: string }> = {
  ResolveLead: { label: 'Client Identification', goal: 'Normalize client data structure' },
  DeepResearch: { label: 'Market Research', goal: 'Comprehensive discovery and brand profiling' },
  ExtractSignals: { label: 'Analyze Insights', goal: 'Identify key growth opportunities' },
  DecisionGovernor: { label: 'Strategic Alignment', goal: 'Verify insights and project feasibility' },
  SynthesizeIntelligence: { label: 'Strategic Synthesis', goal: 'Construct comprehensive project brief' },
  GenerateStrategy: { label: 'Strategic Planning', goal: 'Develop marketing implementation plan' },
  GenerateTextAssets: { label: 'Content Production', goal: 'Draft professional copy and communications' },
  GenerateSocialAssets: { label: 'Social Engagement', goal: 'Develop multi-platform social strategy' },
  GenerateVideoScripts: { label: 'Visual Narrative', goal: 'Draft cinematic video outlines' },
  GenerateAudioAssets: { label: 'Sonic Identity', goal: 'Define vocal tone and audio branding' },
  GenerateVisualAssets: { label: 'Brand Direction', goal: 'Establish art direction and design guidelines' },
  AssembleRun: { label: 'Project Integration', goal: 'Consolidate assets into unified roadmap' },
  GenerateICP: { label: 'Customer Profiling', goal: 'Define ideal customer persona' },
  GenerateOffer: { label: 'Offer Engineering', goal: 'Architect high-value solution packages' },
  GenerateOutreach: { label: 'Outreach Framework', goal: 'Draft multi-channel engagement assets' },
  CreateFinalPackage: { label: 'Client Deliverables', goal: 'Finalize project briefing materials' },
  CompleteRun: { label: 'Project Completion', goal: 'Finalize and release for review' }
};

const REGULATED_KEYWORDS = ['medical', 'health', 'dental', 'dentist', 'aesthetics', 'legal', 'finance', 'banking', 'insurance'];

export const RunStatus: React.FC<RunStatusProps> = ({ runId, onClose }) => {
  const [run, setRun] = useState<AutomationRun | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'artifacts' | 'raw'>('progress');
  const [selectedRawAssetId, setSelectedRawAssetId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) return;
      const data = await AutomationOrchestrator.getInstance().getRun(runId);
      if (data) { setRun(data); setNotFound(false); } 
      else { setNotFound(true); }
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => { active = false; clearInterval(interval); };
  }, [runId]);

  const runContext = useMemo(() => {
    if (!run) return null;
    const resolveArt = run.artifacts.find(a => a.stepName === 'ResolveLead' && a.type === 'json');
    const researchArt = run.artifacts.find(a => a.stepName === 'DeepResearch' && a.type === 'json');
    
    let identityStrict = false;
    try {
        if (resolveArt) {
            const parsed = JSON.parse(resolveArt.content);
            if (parsed.resolved_lead?.business_confirmed === false) identityStrict = true;
        }
        if (researchArt) {
            const parsed = JSON.parse(researchArt.content);
            if (parsed.identity_resolution?.business_confirmed === false) identityStrict = true;
        }
    } catch(e) {}

    const niche = run.artifacts.find(a => a.stepName === 'ResolveLead')?.content?.toLowerCase() || "";
    const isRegulated = REGULATED_KEYWORDS.some(ind => niche.includes(ind));
    
    return {
      compliance_mode: isRegulated ? 'REGULATED_COMPLIANCE' : 'STANDARD_COMPLIANCE',
      evidence_level: run.leadScore && run.leadScore < 60 ? 'LOW_CONFIDENCE' : 'HIGH_CONFIDENCE',
      identity_strict: identityStrict
    };
  }, [run]);

  if (notFound) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] font-black uppercase text-white">Project Not Found</div>;
  if (!run) return <div className="fixed inset-0 bg-black/80 flex items-center justify-center text-slate-500 animate-pulse z-[200] font-black uppercase">Synchronizing Intelligence Engine...</div>;

  const downloadArtifact = (art: AutomationArtifact) => {
    const blob = new Blob([art.content], { type: art.type === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${art.stepName}_${run.leadName}.${art.type === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const rawArtifacts = run.artifacts.filter(a => a.stepName.endsWith('_RAW') || a.stepName.includes('_FAILURE_RAW'));
  const cleanArtifacts = run.artifacts.filter(a => !a.stepName.endsWith('_RAW') && !a.stepName.includes('_FAILURE_RAW'));

  const selectedRaw = rawArtifacts.find(a => a.id === selectedRawAssetId);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
      <div className="bg-[#0b1021] border border-slate-800 rounded-[40px] w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
        
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <div>
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">INTELLIGENCE <span className="text-emerald-500">ENGINE</span></h2>
            <div className="flex flex-wrap items-center gap-3 mt-1">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">{run.leadName} • {run.status}</p>
               {runContext && (
                 <div className="flex gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${runContext.compliance_mode.includes('REGULATED') ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {runContext.compliance_mode}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${runContext.evidence_level.includes('LOW') ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                      {runContext.evidence_level}
                    </span>
                 </div>
               )}
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-white border border-slate-700">CLOSE MONITOR</button>
          </div>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/50">
          {[
            { id: 'progress', label: 'PROJECT ROADMAP' },
            { id: 'artifacts', label: 'COMPILED ASSETS' },
            { id: 'raw', label: 'INTELLIGENCE DATA' }
          ].map(tab => (
            <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600/10 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-[#020617] custom-scrollbar">
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {run.steps.map((step, i) => {
                const meta = STEP_META[step.name] || { label: step.name, goal: 'Process' };
                const isFailed = step.status === 'failed';
                const isRunning = step.status === 'running';
                const isSuccess = step.status === 'success';

                return (
                  <div key={step.name} className={`p-6 rounded-3xl border transition-all ${isRunning ? 'bg-indigo-600/10 border-indigo-500/40 ring-1 ring-indigo-500/20' : isSuccess ? 'bg-emerald-500/5 border-emerald-500/20 opacity-90' : isFailed ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-900/50 border-slate-800 opacity-40'}`}>
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${isSuccess ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : isFailed ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-500'}`}>
                            {isSuccess ? '✓' : isFailed ? '!' : i + 1}
                        </div>
                        <div>
                          <h4 className={`text-sm font-black uppercase tracking-wide ${isFailed ? 'text-rose-400' : 'text-white'}`}>{meta.label}</h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{meta.goal}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${isRunning ? 'text-indigo-400 border-indigo-500/30 animate-pulse' : isSuccess ? 'text-emerald-400 border-emerald-500/20' : isFailed ? 'text-rose-400 border-rose-500/30' : 'text-slate-600 border-slate-800'}`}>
                            {step.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cleanArtifacts.map(art => (
                <div key={art.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] hover:border-emerald-500/30 transition-all flex flex-col group">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 py-1 bg-black rounded-lg border border-slate-800">{art.type}</span>
                    <button onClick={() => downloadArtifact(art)} className="text-[9px] font-black text-emerald-500 hover:text-white uppercase tracking-widest">DOWNLOAD</button>
                  </div>
                  <h4 className="text-lg font-black text-white uppercase tracking-tight mb-4">{art.stepName}</h4>
                  <div className="flex-1 bg-black/40 p-6 rounded-xl border border-slate-800/50 overflow-y-auto max-h-96 custom-scrollbar relative">
                    <FormattedOutput content={art.content} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'raw' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-[500px]">
                <div className="lg:col-span-1 space-y-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">INTELLIGENCE NODES</h3>
                    {rawArtifacts.map(art => (
                        <button 
                            key={art.id}
                            onClick={() => setSelectedRawAssetId(art.id)}
                            className={`w-full text-left p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedRawAssetId === art.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                        >
                            {art.stepName.replace('_RAW', '').replace('_FAILURE', ' (ERROR)')}
                        </button>
                    ))}
                    {rawArtifacts.length === 0 && <p className="text-[10px] text-slate-700 italic px-2">No data available.</p>}
                </div>
                <div className="lg:col-span-2 h-full flex flex-col">
                    {selectedRaw ? (
                        <div className="bg-black border border-slate-800 rounded-[32px] p-8 h-full flex flex-col shadow-inner">
                            <div className="flex justify-between items-center mb-6">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedRaw.stepName.includes('FAILURE') ? 'text-rose-400' : 'text-indigo-400'}`}>
                                    {selectedRaw.stepName.includes('FAILURE') ? 'ERROR_REPORT_DECODED' : 'DATA_FEED_ACTIVE'}
                                </span>
                                <button onClick={() => navigator.clipboard.writeText(selectedRaw.content)} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest">COPY RAW</button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/50 p-6 rounded-2xl border border-slate-900">
                                <FormattedOutput content={selectedRaw.content} />
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border-2 border-dashed border-slate-800 rounded-[32px] flex items-center justify-center text-slate-700 opacity-50 italic uppercase tracking-[0.4em] font-black">
                            SELECT DATA NODE
                        </div>
                    )}
                </div>
             </div>
          )}

        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center px-10">
           <div className="flex gap-10">
              <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">ARTIFACTS</span>
                  <span className="text-xs font-black text-white">{run.artifacts.length}</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-indigo-500 animate-pulse' : run.status === 'succeeded' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {runId.slice(-8)}</span>
           </div>
        </div>
      </div>
    </div>
  );
};