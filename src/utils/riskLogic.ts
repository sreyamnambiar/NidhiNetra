import type { NodeData, LinkData } from '../data/mockData';

export interface Detection {
  nodeId: string;
  pattern: string;
  description: string;
}

export function calculateRisk(nodes: NodeData[], links: LinkData[]): { updatedNodes: NodeData[], detections: Detection[] } {
  const updatedNodes = nodes.map(n => ({...n}));
  const detections: Detection[] = [];

  // Group links by source
  const linksBySource = links.reduce((acc, link) => {
    if (!acc[link.source]) acc[link.source] = [];
    acc[link.source].push(link);
    return acc;
  }, {} as Record<string, LinkData[]>);

  // Group links by target to test rapid sequences
  const linksByTarget = links.reduce((acc, link) => {
    if (!acc[link.target]) acc[link.target] = [];
    acc[link.target].push(link);
    return acc;
  }, {} as Record<string, LinkData[]>);

  updatedNodes.forEach(node => {
    let score = 0;
    const sourceLinks = linksBySource[node.id] || [];
    const targetLinks = linksByTarget[node.id] || [];

    // Rule 1: High Amount > 30000
    const highAmountOutgoing = sourceLinks.filter(l => l.amount > 30000);
    if (highAmountOutgoing.length > 0) {
      score += 40;
      detections.push({ nodeId: node.id, pattern: 'High Amount', description: 'Transferred > 30k' });
    }

    // Rule 2: Split (1 source to 3+ targets)
    if (sourceLinks.length >= 3) {
      score += 50;
      detections.push({ nodeId: node.id, pattern: 'Splitting', description: `${sourceLinks.length} outgoing transfers` });
    }

    // Rule 3: Rapid Transfer (Time delta < 2 min between incoming and outgoing)
    if (targetLinks.length > 0 && sourceLinks.length > 0) {
      for (const tLink of targetLinks) {
        for (const sLink of sourceLinks) {
          const tTime = new Date(tLink.timestamp).getTime();
          const sTime = new Date(sLink.timestamp).getTime();
          const diffMin = (sTime - tTime) / (1000 * 60);

          if (diffMin > 0 && diffMin < 2) {
            score += 60;
            detections.push({ nodeId: node.id, pattern: 'Rapid Transfer', description: 'Passed funds < 2 mins' });
            break; // Once found, no need to flag again
          }
        }
      }
    }

    // Cap score at 100
    node.riskScore = Math.min(score, 100);
  });

  return { updatedNodes, detections };
}
