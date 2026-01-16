import React, { useEffect, useMemo, useState } from 'react';
import { AssetRecord, subscribeToAssets, deleteAsset, clearVault } from '../../services/geminiService';
import { toast } from '../../services/toastManager';

type FilterType = 'ALL' | AssetRecord['type'];

export const AssetLibrary: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  useEffect(() => {
    const unsub = subscribeToAssets((a) => setAssets(a));
    return () => { try { unsub(); } catch { } };
  }, []);

  const filtered = useMemo(() => {
    let base = filter === 'ALL' ? assets : assets.filter((a) => a.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(a => 
        a.title?.toLowerCase().includes(q) || 
        a.module?.toLowerCase().includes(q) || 
        a.leadId?.toLowerCase().includes(q)
      );
    }
    return base;
  }, [assets, filter, search]);

  const handleDelete = (id: string) => {
    if (confirm("Permanently delete this asset from the vault?")) {
      deleteAsset(id);
      toast.info("Asset removed.");
    }
  };

  const handleClearAll = () => {
    if (confirm("CRITICAL: Wipe entire Media Vault? This cannot be undone.")) {
      clearVault();
      toast.success("Vault Purged.");
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto py-8 px-6 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">MEDIA <span className="text-emerald-500 not-italic">VAULT</span></h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] italic">Persistent Multi-Modal Asset Repository</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-[#0b1021] border border-slate-800 rounded-2xl px-4 flex items-center shadow-inner">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mr-3">VIEW:</span>
              <div className="flex gap-2 p-1">
                 <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.5"/></svg>
                 </button>
                 <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:text-white'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeWidth="2.5"/></svg>
                 </button>
              </div>
           </div>
           <button onClick={handleClearAll} className="px-6 py-3 bg-rose-950/20 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">CLEAR VAULT</button>
        </div>
      </div>

      <div className="bg-[#0b1021] border border-slate-800 rounded-[40px] p-6 flex flex-col md:flex-row gap-6 items-center shadow-2xl">
         <div className="flex-1 w-full relative">
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 rounded-2xl px-12 py-4 text-sm font-bold text-white placeholder-slate-700 focus:border-emerald-500 transition-all outline-none"
              placeholder="SEARCH ASSETS BY TITLE, MODULE, OR TARGET..."
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
         </div>
         <div className="flex bg-[#020617] border border-slate-800 rounded-2xl p-1 overflow-x-auto no-scrollbar">
            {['ALL', 'TEXT', 'IMAGE', 'VIDEO', 'AUDIO'].map(t => (
              <button 
                key={t} 
                onClick={() => setFilter(t as any)}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
         </div>
      </div>

      <div className="relative min-h-[500px]">
        {filtered.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 space-y-8 grayscale">
             <span className="text-[120px]">📂</span>
             <p className="text-[12px] font-black uppercase tracking-[0.8em]">Vault Buffer Empty</p>
          </div>
        ) : viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
             {filtered.map(asset => (
               <div key={asset.id} className="bg-[#141414] border border-slate-800 rounded-[32px] overflow-hidden group hover:border-emerald-500/50 transition-all shadow-xl flex flex-col">
                  <div className="aspect-square bg-black relative overflow-hidden flex items-center justify-center">
                     {asset.type === 'IMAGE' && <img src={asset.data} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={asset.title} />}
                     {asset.type === 'VIDEO' && <div className="text-4xl group-hover:scale-110 transition-transform">🎬</div>}
                     {asset.type === 'AUDIO' && <div className="text-4xl group-hover:scale-110 transition-transform">🎵</div>}
                     {asset.type === 'TEXT' && <div className="text-4xl group-hover:scale-110 transition-transform">📄</div>}
                     
                     <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur border border-white/10 text-[7px] font-black text-white uppercase tracking-widest">
                        {asset.type}
                     </div>
                     <button 
                        onClick={() => handleDelete(asset.id)}
                        className="absolute top-3 right-3 p-2 bg-rose-900/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                     >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                     </button>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                     <div className="space-y-1">
                        <h3 className="text-[11px] font-black text-white uppercase truncate tracking-tight">{asset.title}</h3>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic">{asset.module}</p>
                     </div>
                     <div className="mt-4 flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-600 uppercase font-mono">{new Date(asset.timestamp).toLocaleDateString()}</span>
                        <button 
                          onClick={() => asset.type === 'TEXT' && navigator.clipboard.writeText(asset.data)}
                          className="text-emerald-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {asset.type === 'TEXT' ? 'COPY' : 'VIEW'} →
                        </button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">TYPE</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">TITLE</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">MODULE</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CREATED</th>
                      <th className="px-8 py-5"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                   {filtered.map(asset => (
                      <tr key={asset.id} className="group hover:bg-white/5 transition-all">
                         <td className="px-8 py-4">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[8px] font-black text-slate-400 uppercase tracking-widest">{asset.type}</span>
                         </td>
                         <td className="px-8 py-4">
                            <p className="text-sm font-bold text-white uppercase tracking-tight truncate max-w-xs">{asset.title}</p>
                         </td>
                         <td className="px-8 py-4">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">{asset.module}</p>
                         </td>
                         <td className="px-8 py-4">
                            <p className="text-[10px] font-black text-slate-600 font-mono">{new Date(asset.timestamp).toLocaleString()}</p>
                         </td>
                         <td className="px-8 py-4 text-right">
                            <div className="flex gap-4 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="text-[9px] font-black text-emerald-400 hover:text-white uppercase tracking-widest">OPEN</button>
                               <button onClick={() => handleDelete(asset.id)} className="text-[9px] font-black text-rose-500 hover:text-white uppercase tracking-widest">DELETE</button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetLibrary;
