import React from 'react';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import type { NodeData, LinkData } from '../data/mockData';
import type { Detection } from '../utils/riskLogic';

interface RightPanelProps {
  selectedNode: NodeData | null;
  nodeLinks: LinkData[];
  detections: Detection[];
}

const RightPanel: React.FC<RightPanelProps> = ({ selectedNode, nodeLinks, detections }) => {
  if (!selectedNode) {
    return (
      <div className="glass-panel p-4 flex flex-col items-center justify-center text-slate-500 text-center">
        <Activity className="w-12 h-12 mb-4 opacity-50" />
        <p>Select a node to view detailed transaction and risk analysis.</p>
        
        <div className="mt-8 self-start w-full text-left">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-4">
             Global Alerts ({detections.length})
          </h3>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
            {detections.map((d, i) => (
              <div key={i} className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs flex flex-col gap-1">
                <span className="font-bold text-red-400">{d.nodeId}: {d.pattern}</span>
                <span className="text-slate-300">{d.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const incoming = nodeLinks.filter(l => l.target === selectedNode.id);
  const outgoing = nodeLinks.filter(l => l.source === selectedNode.id);

  const isHighRisk = selectedNode.riskScore > 50;

  return (
    <div className="glass-panel p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black font-mono tracking-wider flex items-center gap-2">
             <Cpu className="text-sky-400" /> {selectedNode.id}
          </h2>
          <span className="text-slate-400 text-sm">{selectedNode.type}</span>
        </div>
        <div className={`flex flex-col items-end ${isHighRisk ? 'text-red-400' : (selectedNode.riskScore > 20 ? 'text-yellow-400' : 'text-green-400')}`}>
           <span className="text-3xl font-black font-mono">{selectedNode.riskScore}</span>
           <span className="text-xs uppercase tracking-widest font-bold">Risk Score</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 uppercase font-semibold">IP Address</span>
          <span className="font-mono">{selectedNode.ip || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 uppercase font-semibold">Phone</span>
          <span className="font-mono">{selectedNode.phone || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 uppercase font-semibold">Location</span>
          <span className="font-mono text-right">{selectedNode.location || 'N/A'}</span>
        </div>
      </div>

      {isHighRisk && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-red-400 font-bold uppercase text-xs tracking-wider">Suspicious Activity</span>
            <span className="text-slate-300 text-xs">This node exhibits behaviors linked to money laundering patterns. Review immediately.</span>
          </div>
        </div>
      )}

      <div>
         <h3 className="text-xs uppercase text-slate-500 font-bold mb-3 tracking-widest flex justify-between">
           <span>Transfers</span>
           <span className="text-slate-400">Total: {incoming.length + outgoing.length}</span>
         </h3>
         <div className="flex flex-col gap-2">
           {nodeLinks.map((link, idx) => {
             const isOut = link.source === selectedNode.id;
             return (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded p-2 text-xs flex justify-between items-center">
                  <div className="flex gap-2 items-center">
                    <span className={isOut ? 'text-red-400' : 'text-green-400'}>
                       {isOut ? 'OUT to' : 'IN from'} {isOut ? link.target : link.source}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="font-mono font-bold">${link.amount.toLocaleString()}</span>
                     <span className="text-slate-500 text-[10px]">{new Date(link.timestamp).toLocaleString()}</span>
                  </div>
                </div>
             );
           })}
         </div>
      </div>
    </div>
  );
};

export default RightPanel;
