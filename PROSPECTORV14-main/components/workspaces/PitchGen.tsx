/* =========================================================
   PITCH GEN – ENHANCED RENDERING
   ========================================================= */

import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { generatePitch } from '../../services/geminiService';
import { FormattedOutput } from '../common/FormattedOutput';

interface PitchGenProps {
  lead?: Lead;
}

export const PitchGen: React.FC<PitchGenProps> = ({ lead }) => {
  const [pitch, setPitch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const loadPitch = async () => {
      setIsLoading(true);
      try {
        const data = await generatePitch(lead);
        setPitch(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPitch();
  }, [lead]);

  if (!lead) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-slate-900/30 border border-slate-800 rounded-[48px] border-dashed">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Target Required for Pitch Generation</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">
            PITCH <span className="text-emerald-500 not-italic">ENGINE</span>
        </h1>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] italic">High-Impact Scripting Core</p>
      </div>

      <div className="bg-[#0b1021] border border-slate-800 rounded-[56px] shadow-2xl relative min-h-[600px] flex flex-col">
         {isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="w-1.5 h-16 bg-emerald-500/20 rounded-full relative overflow-hidden mx-auto">
                 <div className="absolute inset-0 bg-emerald-500 animate-[progress_2s_infinite]"></div>
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] animate-pulse italic">Crystallizing Hook Dynamics...</p>
           </div>
         ) : pitch && (
           <div className="flex-1 p-12 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 duration-700">
              <FormattedOutput content={pitch} />
              
              <div className="mt-16 flex justify-center gap-6 border-t border-slate-800 pt-10">
                 <button className="bg-slate-900 border border-slate-800 text-slate-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95">TELEPROMPTER MODE</button>
                 <button 
                    onClick={() => navigator.clipboard.writeText(pitch)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 border-b-4 border-emerald-800"
                 >
                    COPY RECOVERY MANIFEST
                 </button>
              </div>
           </div>
         )}
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
};