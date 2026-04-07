// ============================================================
// NidhiNetra — Pattern Detection Engine
// Cycle detection, fan-in/fan-out, velocity scoring, layering
// ============================================================

const PatternEngine = (() => {

  // ── CYCLE DETECTION (DFS-based) ───────────────────────────
  function detectCycles(accounts, transactions) {
    const adj = {};
    accounts.forEach(a => adj[a.id] = []);
    transactions.forEach(t => {
      if (adj[t.from]) adj[t.from].push({ to: t.to, txn: t });
    });

    const cycles = [];
    const visited = new Set();
    const recStack = new Set();
    const parent = {};

    function dfs(node, path, txnPath) {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj[node] || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          parent[edge.to] = node;
          const newPath = [...path, edge.to];
          const newTxnPath = [...txnPath, edge.txn];
          dfs(edge.to, newPath, newTxnPath);
        } else if (recStack.has(edge.to)) {
          // Found cycle
          const cycleStart = path.indexOf(edge.to);
          if (cycleStart !== -1) {
            const cyclePath = path.slice(cycleStart);
            cyclePath.push(edge.to);
            const cycleTxns = txnPath.slice(cycleStart);
            cycleTxns.push(edge.txn);
            const totalAmount = cycleTxns.reduce((s, t) => s + t.amount, 0);
            cycles.push({
              type: 'cycle',
              severity: 'critical',
              nodes: cyclePath,
              transactions: cycleTxns.map(t => t.id),
              totalAmount,
              description: `Circular fund flow detected: ${cyclePath.join(' → ')} (${NidhiData.formatCurrency(totalAmount)})`
            });
          }
        }
      }
      recStack.delete(node);
    }

    accounts.forEach(a => {
      if (!visited.has(a.id)) {
        dfs(a.id, [a.id], []);
      }
    });

    // Deduplicate cycles
    const unique = [];
    const seen = new Set();
    cycles.forEach(c => {
      const key = [...c.nodes].sort().join(',');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    });
    return unique;
  }

  // ── FAN-IN / FAN-OUT DETECTION ────────────────────────────
  function detectFanPatterns(accounts, transactions) {
    const inDegree = {};
    const outDegree = {};
    const inAmount = {};
    const outAmount = {};

    accounts.forEach(a => {
      inDegree[a.id] = 0;
      outDegree[a.id] = 0;
      inAmount[a.id] = 0;
      outAmount[a.id] = 0;
    });

    transactions.forEach(t => {
      if (outDegree[t.from] !== undefined) {
        outDegree[t.from]++;
        outAmount[t.from] += t.amount;
      }
      if (inDegree[t.to] !== undefined) {
        inDegree[t.to]++;
        inAmount[t.to] += t.amount;
      }
    });

    const patterns = [];
    const FAN_THRESHOLD = 3;

    accounts.forEach(a => {
      if (outDegree[a.id] >= FAN_THRESHOLD) {
        const outTxns = transactions.filter(t => t.from === a.id);
        patterns.push({
          type: 'fan-out',
          severity: outDegree[a.id] >= 5 ? 'critical' : 'high',
          nodes: [a.id, ...outTxns.map(t => t.to)],
          transactions: outTxns.map(t => t.id),
          totalAmount: outAmount[a.id],
          degree: outDegree[a.id],
          description: `Fan-out: ${a.holder} (${a.id}) sent funds to ${outDegree[a.id]} accounts (${NidhiData.formatCurrency(outAmount[a.id])})`
        });
      }
      if (inDegree[a.id] >= FAN_THRESHOLD) {
        const inTxns = transactions.filter(t => t.to === a.id);
        patterns.push({
          type: 'fan-in',
          severity: inDegree[a.id] >= 5 ? 'critical' : 'high',
          nodes: [a.id, ...inTxns.map(t => t.from)],
          transactions: inTxns.map(t => t.id),
          totalAmount: inAmount[a.id],
          degree: inDegree[a.id],
          description: `Fan-in: ${a.holder} (${a.id}) received funds from ${inDegree[a.id]} accounts (${NidhiData.formatCurrency(inAmount[a.id])})`
        });
      }
    });

    return patterns;
  }

  // ── VELOCITY SCORING (rapid movement) ─────────────────────
  function detectRapidMovement(accounts, transactions, windowMinutes = 30) {
    const patterns = [];
    const sortedTxns = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group outgoing txns by account
    const outgoing = {};
    sortedTxns.forEach(t => {
      if (!outgoing[t.from]) outgoing[t.from] = [];
      outgoing[t.from].push(t);
    });

    // Check for rapid sequential outgoing
    for (const accId of Object.keys(outgoing)) {
      const txns = outgoing[accId];
      if (txns.length < 2) continue;

      for (let i = 0; i < txns.length; i++) {
        const window = [txns[i]];
        for (let j = i + 1; j < txns.length; j++) {
          const diffMs = new Date(txns[j].date) - new Date(txns[i].date);
          const diffMin = diffMs / 60000;
          if (diffMin <= windowMinutes) {
            window.push(txns[j]);
          }
        }
        if (window.length >= 3) {
          const totalAmount = window.reduce((s, t) => s + t.amount, 0);
          const acc = NidhiData.getAccountById(accId);
          const timeSpan = Math.round((new Date(window[window.length - 1].date) - new Date(window[0].date)) / 60000);
          patterns.push({
            type: 'rapid-movement',
            severity: window.length >= 4 ? 'critical' : 'high',
            nodes: [accId, ...new Set(window.map(t => t.to))],
            transactions: window.map(t => t.id),
            totalAmount,
            timeWindow: timeSpan,
            description: `Rapid movement: ${acc ? acc.holder : accId} made ${window.length} transfers in ${timeSpan} min (${NidhiData.formatCurrency(totalAmount)})`
          });
          break; // Only flag the first rapid window per account
        }
      }
    }

    // Check for rapid pass-through (receive and send within window)
    accounts.forEach(a => {
      const incoming = sortedTxns.filter(t => t.to === a.id);
      const outgoing2 = sortedTxns.filter(t => t.from === a.id);

      incoming.forEach(inTxn => {
        outgoing2.forEach(outTxn => {
          const diff = (new Date(outTxn.date) - new Date(inTxn.date)) / 60000;
          if (diff > 0 && diff <= windowMinutes) {
            patterns.push({
              type: 'pass-through',
              severity: diff <= 10 ? 'critical' : 'high',
              nodes: [inTxn.from, a.id, outTxn.to],
              transactions: [inTxn.id, outTxn.id],
              totalAmount: Math.min(inTxn.amount, outTxn.amount),
              timeWindow: Math.round(diff),
              description: `Pass-through: ${a.holder} received and forwarded within ${Math.round(diff)} min (${NidhiData.formatCurrency(Math.min(inTxn.amount, outTxn.amount))})`
            });
          }
        });
      });
    });

    // Deduplicate
    const unique = [];
    const seen = new Set();
    patterns.forEach(p => {
      const key = p.type + ':' + p.transactions.sort().join(',');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });
    return unique;
  }

  // ── LAYERING DEPTH (BFS from source accounts) ────────────
  function calculateLayers(accounts, transactions) {
    const sources = accounts.filter(a => a.type === 'source');
    const layers = {};
    accounts.forEach(a => layers[a.id] = Infinity);

    const adj = {};
    accounts.forEach(a => adj[a.id] = []);
    transactions.forEach(t => {
      if (adj[t.from]) adj[t.from].push(t.to);
    });

    sources.forEach(s => {
      const queue = [{ node: s.id, depth: 0 }];
      const visited = new Set([s.id]);
      layers[s.id] = 0;

      while (queue.length > 0) {
        const { node, depth } = queue.shift();
        if (depth < layers[node]) layers[node] = depth;

        (adj[node] || []).forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            layers[neighbor] = Math.min(layers[neighbor], depth + 1);
            queue.push({ node: neighbor, depth: depth + 1 });
          }
        });
      }
    });

    // Replace Infinity with -1 (unreachable from sources)
    Object.keys(layers).forEach(k => {
      if (layers[k] === Infinity) layers[k] = -1;
    });

    return layers;
  }

  // ── MONEY TRAIL TRACER (BFS paths from a node) ────────────
  function traceTrails(startNode, accounts, transactions, direction = 'outgoing') {
    const adj = {};
    accounts.forEach(a => adj[a.id] = []);

    if (direction === 'outgoing') {
      transactions.forEach(t => {
        if (adj[t.from]) adj[t.from].push({ neighbor: t.to, txn: t });
      });
    } else {
      transactions.forEach(t => {
        if (adj[t.to]) adj[t.to].push({ neighbor: t.from, txn: t });
      });
    }

    const trails = [];
    const queue = [{ path: [startNode], txns: [], visited: new Set([startNode]) }];

    while (queue.length > 0) {
      const { path, txns, visited } = queue.shift();
      const current = path[path.length - 1];
      const neighbors = adj[current] || [];

      if (neighbors.length === 0 || (path.length > 1 && neighbors.every(n => visited.has(n.neighbor)))) {
        if (path.length > 1) {
          trails.push({ path: [...path], transactions: [...txns] });
        }
      }

      for (const edge of neighbors) {
        if (!visited.has(edge.neighbor) && path.length < 8) {
          const newVisited = new Set(visited);
          newVisited.add(edge.neighbor);
          queue.push({ path: [...path, edge.neighbor], txns: [...txns, edge.txn], visited: newVisited });
        }
      }
    }

    return trails;
  }

  // ── RUN ALL DETECTIONS ────────────────────────────────────
  function runAllDetections(caseFilter) {
    const accounts = NidhiData.getAccounts(caseFilter);
    const transactions = NidhiData.getTransactions(caseFilter);

    const cycles = detectCycles(accounts, transactions);
    const fans = detectFanPatterns(accounts, transactions);
    const rapid = detectRapidMovement(accounts, transactions);
    const layers = calculateLayers(accounts, transactions);

    return {
      cycles,
      fans,
      rapid,
      layers,
      all: [...cycles, ...fans, ...rapid],
      summary: {
        totalPatterns: cycles.length + fans.length + rapid.length,
        criticalCount: [...cycles, ...fans, ...rapid].filter(p => p.severity === 'critical').length,
        highCount: [...cycles, ...fans, ...rapid].filter(p => p.severity === 'high').length,
      }
    };
  }

  return { detectCycles, detectFanPatterns, detectRapidMovement, calculateLayers, traceTrails, runAllDetections };
})();
