import React, { useState, useMemo } from 'react';
import { Activity } from 'lucide-react';
import GraphView from './components/GraphView';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import LoginPage from './components/LoginPage';
import { mockNodes, mockLinks } from './data/mockData';
import type { NodeData, LinkData } from './data/mockData';
import { calculateRisk } from './utils/riskLogic';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ phone: '', ip: '', minRisk: 0 });

  // Compute risk scores
  const { updatedNodes, detections } = useMemo(() => calculateRisk(mockNodes, mockLinks), []);

  // Apply filters but keep connections intact for context
  const filteredNodes = useMemo(() => {
    const isFiltering = filters.minRisk > 0 || filters.phone !== '' || filters.ip !== '';
    
    if (!isFiltering) return updatedNodes;

    const matchingNodeIds = new Set(
      updatedNodes.filter(n => {
        if (filters.minRisk > 0 && n.riskScore < filters.minRisk) return false;
        if (filters.phone && !n.phone?.includes(filters.phone)) return false;
        if (filters.ip && !n.ip?.includes(filters.ip)) return false;
        return true;
      }).map(n => n.id)
    );

    const nodesToShow = new Set(matchingNodeIds);
    mockLinks.forEach(l => {
       if (matchingNodeIds.has(l.source)) nodesToShow.add(l.target);
       if (matchingNodeIds.has(l.target)) nodesToShow.add(l.source);
    });

    return updatedNodes.filter(n => nodesToShow.has(n.id));
  }, [updatedNodes, filters]);

  const filteredLinks = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return mockLinks.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
  }, [filteredNodes]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return filteredNodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, filteredNodes]);

  const nodeLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return filteredLinks.filter(l => l.source === selectedNodeId || l.target === selectedNodeId);
  }, [selectedNodeId, filteredLinks]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 glass-panel border-x-0 border-t-0 rounded-none flex items-center px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-emerald-400 neon-text">
            AML Sentinel
          </h1>
        </div>
        <div className="text-sm font-mono text-slate-400 flex items-center gap-4">
           <span>Total Nodes: <span className="text-sky-400">{filteredNodes.length}</span></span>
           <span>Total Links: <span className="text-sky-400">{filteredLinks.length}</span></span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 overflow-hidden grid grid-cols-[300px_1fr_350px] gap-4 p-4 z-0">
        <LeftPanel onFilterChange={setFilters} />
        <GraphView 
          nodes={filteredNodes} 
          links={filteredLinks} 
          selectedNodeId={selectedNodeId}
          onNodeClick={(n: NodeData) => setSelectedNodeId(n.id)}
        />
        <RightPanel 
          selectedNode={selectedNode}
          nodeLinks={nodeLinks}
          detections={detections}
        />
      </main>
    </div>
  );
}

export default App;
