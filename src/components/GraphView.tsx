import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { NodeData, LinkData } from '../data/mockData';

interface GraphViewProps {
  nodes: NodeData[];
  links: LinkData[];
  onNodeClick: (node: NodeData) => void;
  selectedNodeId: string | null;
}

const GraphView: React.FC<GraphViewProps> = ({ nodes, links, onNodeClick, selectedNodeId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    setDimensions({ width: clientWidth, height: clientHeight });
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({ ...n })),
      links: links.map(l => ({ ...l }))
    };
  }, [nodes, links]);

  return (
    <div ref={containerRef} className="w-full h-full glass-panel relative overflow-hidden flex items-center justify-center">
      {dimensions.width > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="id"
          nodeColor={node => {
            const risk = (node as any).riskScore || 0;
            if (risk > 50) return '#ef4444'; // red-500
            if (risk > 20) return '#eab308'; // yellow-500
            return '#22c55e'; // green-500
          }}
          nodeRelSize={6}
          linkColor={() => '#475569'}
          linkWidth={link => (link as any).amount > 30000 ? 3 : 1}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={d => ((d as any).amount > 10000 ? 0.01 : 0.005)}
          onNodeClick={n => onNodeClick(n as NodeData)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id as string;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const r = (node as any).riskScore || 0;
            if (r > 50) ctx.fillStyle = '#ef4444';
            else if (r > 20) ctx.fillStyle = '#eab308';
            else ctx.fillStyle = '#22c55e';
            
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, 5, 0, 2 * Math.PI, false);
            ctx.fill();

            if (selectedNodeId === node.id) {
               ctx.strokeStyle = '#38bdf8'; // sky-400
               ctx.lineWidth = 2;
               ctx.stroke();
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(label, node.x!, node.y! + 8);
          }}
        />
      )}
    </div>
  );
};

export default GraphView;
