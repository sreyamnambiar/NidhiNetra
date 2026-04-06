import React, { useState } from 'react';
import { Filter, Search } from 'lucide-react';

interface LeftPanelProps {
  onFilterChange: (filters: { phone: string; ip: string; minRisk: number }) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ onFilterChange }) => {
  const [phone, setPhone] = useState('');
  const [ip, setIp] = useState('');
  const [minRisk, setMinRisk] = useState(0);

  const handleApply = () => {
    onFilterChange({ phone, ip, minRisk });
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2 text-sky-400">
        <Filter className="w-5 h-5" />
        <h2 className="text-xl font-bold font-mono tracking-wider">FILTERS</h2>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-400 uppercase font-semibold tracking-wide">Phone Number</label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search phone..." 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded p-2 pl-9 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-slate-400 uppercase font-semibold tracking-wide">IP Address</label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search IP..." 
            value={ip}
            onChange={e => setIp(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-700/50 rounded p-2 pl-9 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <label className="text-sm text-slate-400 uppercase font-semibold tracking-wide">Min Risk Score</label>
          <span className="text-sky-400 text-sm font-mono">{minRisk}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={minRisk}
          onChange={e => setMinRisk(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
      </div>

      <button 
        onClick={handleApply}
        className="mt-6 w-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/50 rounded py-2 transition-all font-semibold uppercase tracking-widest text-sm"
      >
        Apply Filters
      </button>

      <div className="mt-8 border-t border-slate-800 pt-4">
         <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Legend</h3>
         <div className="flex flex-col gap-2 text-sm">
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Low Risk</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Medium Risk (20+)</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Risk (50+)</div>
         </div>
      </div>
    </div>
  );
};

export default LeftPanel;
