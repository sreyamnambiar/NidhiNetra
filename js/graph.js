// ============================================================
// NidhiNetra — D3.js Force-Directed Spider Map
// Interactive graph visualization with animated fund flows
// ============================================================

const SpiderMap = (() => {
  let svg, g, simulation;
  let nodeElements, linkElements, linkLabels, particleGroup;
  let width, height;
  let currentNodes = [], currentLinks = [], currentEntityLinks = [];
  let selectedNode = null;
  let highlightedNodes = new Set();
  let highlightedLinks = new Set();
  let layers = {};
  let onNodeSelect = null;
  let showParticles = true;
  let particleTimer = null;

  const COLORS = {
    source: '#ff6b35',
    mule: '#ffd166',
    destination: '#06d6a0',
    low: '#06d6a0',
    medium: '#ffd166',
    high: '#ff6b35',
    critical: '#ef476f',
    link: '#334466',
    linkHighlight: '#00d4ff',
    entityLink: '#a855f7',
    selected: '#00d4ff',
    cycle: '#ef476f',
    fanout: '#ff6b35',
    fanin: '#ffd166',
    rapid: '#f72585',
    cross: '#a855f7',
    layer0: '#00d4ff',
    layer1: '#7b68ee',
    layer2: '#c77dff',
    layer3: '#ef476f',
    layer4: '#ff6b35'
  };

  function init(containerId, nodeSelectCallback) {
    onNodeSelect = nodeSelectCallback;
    const container = document.getElementById(containerId);
    if (!container) return;

    width = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select('#' + containerId)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Defs for gradients, markers, filters
    const defs = svg.append('defs');

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow
    const glowStrong = defs.append('filter').attr('id', 'glow-strong');
    glowStrong.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
    const feMerge2 = glowStrong.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers for different states
    ['normal', 'highlight', 'cycle', 'entity'].forEach(type => {
      const color = type === 'normal' ? COLORS.link :
                    type === 'highlight' ? COLORS.linkHighlight :
                    type === 'cycle' ? COLORS.cycle :
                    COLORS.entityLink;
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Background grid
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    g = svg.append('g');
    particleGroup = g.append('g').attr('class', 'particles');

    // Initialize simulation
    simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(160))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04));

    // Resize handler
    window.addEventListener('resize', () => {
      const container = document.getElementById(containerId);
      if (container) {
        width = container.clientWidth;
        height = container.clientHeight;
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.1).restart();
      }
    });
  }

  function getNodeColor(node) {
    if (selectedNode && selectedNode.id === node.id) return COLORS.selected;
    if (highlightedNodes.has(node.id)) return COLORS.linkHighlight;
    const layer = layers[node.id];
    if (layer !== undefined && layer >= 0) {
      return COLORS['layer' + Math.min(layer, 4)] || COLORS.layer4;
    }
    return COLORS[node.risk] || COLORS.medium;
  }

  function getNodeRadius(node) {
    const txns = currentLinks.filter(l =>
      (l.source.id || l.source) === node.id || (l.target.id || l.target) === node.id
    );
    const base = 18;
    return base + Math.min(txns.length * 2, 14);
  }

  function getLinkWidth(link) {
    const amount = link.amount || 0;
    if (amount >= 5000000) return 4;
    if (amount >= 1000000) return 3;
    if (amount >= 500000) return 2;
    return 1.5;
  }

  function getLinkColor(link) {
    const txnId = link.txnId || link.id;
    if (highlightedLinks.has(txnId)) return COLORS.linkHighlight;
    if (link.caseId === 'CROSS') return COLORS.cross;
    return COLORS.link;
  }

  function update(accounts, transactions, entityLinks, layerData) {
    layers = layerData || {};
    currentEntityLinks = entityLinks || [];

    // Build nodes
    currentNodes = accounts.map(a => {
      const existing = currentNodes.find(n => n.id === a.id);
      return {
        ...a,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 300,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 300,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0
      };
    });

    // Build links from transactions
    currentLinks = transactions.map(t => ({
      source: t.from,
      target: t.to,
      amount: t.amount,
      txnId: t.id,
      id: t.id,
      method: t.method,
      date: t.date,
      caseId: t.caseId,
      note: t.note
    }));

    // Add entity resolution links
    const entityEdges = currentEntityLinks.map(el => ({
      source: el.source,
      target: el.target,
      isEntity: true,
      matchType: el.matchType,
      matchValue: el.matchValue,
      id: 'ENT-' + el.source + '-' + el.target
    }));

    render(currentNodes, [...currentLinks, ...entityEdges]);
  }

  function render(nodes, links) {
    // Clear existing
    g.selectAll('.link-group').remove();
    g.selectAll('.node-group').remove();
    g.selectAll('.link-label').remove();

    // Links
    const linkGroup = g.selectAll('.link-group')
      .data(links)
      .join('g')
      .attr('class', 'link-group');

    linkElements = linkGroup.append('line')
      .attr('class', d => d.isEntity ? 'entity-link' : 'link')
      .attr('stroke', d => d.isEntity ? COLORS.entityLink : getLinkColor(d))
      .attr('stroke-width', d => d.isEntity ? 1.5 : getLinkWidth(d))
      .attr('stroke-dasharray', d => d.isEntity ? '6,4' : 'none')
      .attr('stroke-opacity', d => d.isEntity ? 0.6 : 0.65)
      .attr('marker-end', d => d.isEntity ? 'url(#arrow-entity)' : 'url(#arrow-normal)');

    // Link hover areas (wider for easier interaction)
    linkGroup.append('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 16)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        if (d.isEntity) {
          showTooltip(event, `🔗 ${d.matchType.toUpperCase()}: ${d.matchValue}`);
        } else {
          showTooltip(event, `${NidhiData.formatCurrency(d.amount)} | ${d.method} | ${NidhiData.formatDate(d.date)}`);
        }
      })
      .on('mouseout', hideTooltip);

    // Link amount labels
    linkLabels = g.selectAll('.link-label')
      .data(links.filter(l => !l.isEntity))
      .join('text')
      .attr('class', 'link-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -8)
      .attr('font-size', '9px')
      .attr('fill', '#7a8ba8')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => NidhiData.formatCurrency(d.amount));

    // Nodes
    const nodeGroup = g.selectAll('.node-group')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      );

    // Node outer ring (risk indicator)
    nodeGroup.append('circle')
      .attr('class', 'node-ring')
      .attr('r', d => getNodeRadius(d) + 4)
      .attr('fill', 'none')
      .attr('stroke', d => getNodeColor(d))
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.3)
      .attr('filter', 'url(#glow)');

    // Node circle
    nodeGroup.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => {
        const color = getNodeColor(d);
        return color;
      })
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => getNodeColor(d))
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#glow)');

    // Node icon
    nodeGroup.append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', 1)
      .attr('font-size', '14px')
      .text(d => d.type === 'source' ? '🏦' : d.type === 'destination' ? '🎯' : '💰');

    // Node label
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d) + 18)
      .attr('font-size', '12px')
      .attr('fill', '#ffffff')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => {
        const holder = d.holder || d.accountId || d.id || 'Account';
        const name = String(holder).split ? String(holder).split(' ')[0] : String(holder);
        return name;
      });

    // Layer badge
    nodeGroup.append('text')
      .attr('class', 'layer-badge')
      .attr('text-anchor', 'middle')
      .attr('dy', d => -getNodeRadius(d) - 8)
      .attr('font-size', '9px')
      .attr('fill', d => COLORS['layer' + Math.min(layers[d.id] || 0, 4)])
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '700')
      .text(d => layers[d.id] !== undefined && layers[d.id] >= 0 ? `L${layers[d.id]}` : '');

    // Node interactions
    nodeGroup
      .on('click', (event, d) => {
        event.stopPropagation();
        selectNode(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('.node-circle')
          .transition().duration(200)
          .attr('r', getNodeRadius(d) + 3)
          .attr('fill-opacity', 0.3);
        d3.select(this).select('.node-ring')
          .transition().duration(200)
          .attr('r', getNodeRadius(d) + 7)
          .attr('stroke-opacity', 0.6);
        const holder = d.holder || d.accountId || d.id || 'Account';
        const bank = d.bank || 'Unknown Bank';
        const risk = (d.risk || 'unknown').toUpperCase();
        showTooltip(event, `${holder}\n${bank} | ${d.id}\nRisk: ${risk}`);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('.node-circle')
          .transition().duration(200)
          .attr('r', getNodeRadius(d))
          .attr('fill-opacity', 0.15);
        d3.select(this).select('.node-ring')
          .transition().duration(200)
          .attr('r', getNodeRadius(d) + 4)
          .attr('stroke-opacity', 0.3);
        hideTooltip();
      });

    // Background click to deselect
    svg.on('click', () => {
      clearSelection();
    });

    // Update simulation
    simulation.nodes(nodes).on('tick', ticked);
    simulation.force('link').links(links.filter(l => {
      const sourceExists = nodes.find(n => n.id === (l.source.id || l.source));
      const targetExists = nodes.find(n => n.id === (l.target.id || l.target));
      return sourceExists && targetExists;
    }));
    simulation.alpha(0.8).restart();

    // Start particles
    if (showParticles) startParticles();
  }

  function ticked() {
    linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    g.selectAll('.link-group line:nth-child(2)')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    linkLabels
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    g.selectAll('.node-group')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);
  }

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // ── PARTICLE ANIMATION (fund flow) ────────────────────────
  function startParticles() {
    if (particleTimer) particleTimer.stop();

    particleTimer = d3.interval(() => {
      const transactionLinks = currentLinks.filter(l => !l.isEntity && l.source.x);

      if (transactionLinks.length === 0) return;

      const link = transactionLinks[Math.floor(Math.random() * transactionLinks.length)];

      if (!link.source.x || !link.target.x) return;

      const particle = particleGroup.append('circle')
        .attr('r', 3)
        .attr('fill', getLinkColor(link))
        .attr('filter', 'url(#glow)')
        .attr('cx', link.source.x)
        .attr('cy', link.source.y)
        .attr('opacity', 0.9);

      particle.transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr('cx', link.target.x)
        .attr('cy', link.target.y)
        .attr('r', 1.5)
        .attr('opacity', 0)
        .remove();
    }, 200);
  }

  function stopParticles() {
    if (particleTimer) particleTimer.stop();
    particleGroup.selectAll('*').remove();
  }

  // ── TOOLTIP ───────────────────────────────────────────────
  function showTooltip(event, text) {
    let tooltip = document.getElementById('graph-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'graph-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 14) + 'px';
    tooltip.style.top = (event.pageY - 14) + 'px';
  }

  function hideTooltip() {
    const tooltip = document.getElementById('graph-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  // ── NODE SELECTION & TRAIL HIGHLIGHTING ───────────────────
  function selectNode(node) {
    selectedNode = node;
    highlightedNodes.clear();
    highlightedLinks.clear();

    // Trace outgoing trails
    const accounts = NidhiData.getAccounts('ALL');
    const transactions = NidhiData.getTransactions('ALL');
    const outTrails = PatternEngine.traceTrails(node.id, accounts, transactions, 'outgoing');
    const inTrails = PatternEngine.traceTrails(node.id, accounts, transactions, 'incoming');

    highlightedNodes.add(node.id);
    [...outTrails, ...inTrails].forEach(trail => {
      trail.path.forEach(n => highlightedNodes.add(n));
      trail.transactions.forEach(t => highlightedLinks.add(t.id));
    });

    updateHighlights();

    if (onNodeSelect) {
      onNodeSelect(node, outTrails, inTrails);
    }
  }

  function clearSelection() {
    selectedNode = null;
    highlightedNodes.clear();
    highlightedLinks.clear();
    updateHighlights();
    if (onNodeSelect) onNodeSelect(null, [], []);
  }

  function updateHighlights() {
    const hasSelection = highlightedNodes.size > 0;

    g.selectAll('.node-group').each(function(d) {
      const group = d3.select(this);
      const isHighlighted = highlightedNodes.has(d.id);
      const isSelected = selectedNode && selectedNode.id === d.id;

      group.select('.node-circle')
        .transition().duration(300)
        .attr('stroke', isSelected ? COLORS.selected : isHighlighted ? COLORS.linkHighlight : getNodeColor(d))
        .attr('fill-opacity', hasSelection ? (isHighlighted ? 0.3 : 0.05) : 0.15)
        .attr('stroke-opacity', hasSelection ? (isHighlighted ? 1 : 0.2) : 1)
        .attr('stroke-width', isSelected ? 4 : isHighlighted ? 3 : 2.5);

      group.select('.node-ring')
        .transition().duration(300)
        .attr('stroke', isSelected ? COLORS.selected : getNodeColor(d))
        .attr('stroke-opacity', hasSelection ? (isHighlighted ? 0.6 : 0.05) : 0.3);

      group.select('.node-label')
        .transition().duration(300)
        .attr('fill-opacity', hasSelection ? (isHighlighted ? 1 : 0.15) : 1);

      group.select('.node-icon')
        .transition().duration(300)
        .attr('opacity', hasSelection ? (isHighlighted ? 1 : 0.15) : 1);
    });

    linkElements
      .transition().duration(300)
      .attr('stroke', d => {
        if (d.isEntity) return COLORS.entityLink;
        if (highlightedLinks.has(d.txnId || d.id)) return COLORS.linkHighlight;
        return getLinkColor(d);
      })
      .attr('stroke-opacity', d => {
        if (!hasSelection) return d.isEntity ? 0.6 : 0.65;
        return highlightedLinks.has(d.txnId || d.id) ? 1 : 0.08;
      })
      .attr('stroke-width', d => {
        if (highlightedLinks.has(d.txnId || d.id)) return getLinkWidth(d) + 1;
        return d.isEntity ? 1.5 : getLinkWidth(d);
      })
      .attr('marker-end', d => {
        if (d.isEntity) return 'url(#arrow-entity)';
        if (highlightedLinks.has(d.txnId || d.id)) return 'url(#arrow-highlight)';
        return 'url(#arrow-normal)';
      });

    linkLabels
      .transition().duration(300)
      .attr('fill-opacity', d => {
        if (!hasSelection) return 0.7;
        return highlightedLinks.has(d.id) ? 1 : 0.05;
      });
  }

  // ── HIGHLIGHT PATTERN ─────────────────────────────────────
  function highlightPattern(pattern) {
    highlightedNodes.clear();
    highlightedLinks.clear();

    if (pattern && pattern.nodes) {
      pattern.nodes.forEach(n => highlightedNodes.add(n));
    }
    if (pattern && pattern.transactions) {
      pattern.transactions.forEach(t => highlightedLinks.add(t));
    }

    updateHighlights();
  }

  function clearHighlights() {
    highlightedNodes.clear();
    highlightedLinks.clear();
    updateHighlights();
  }

  // ── FIT VIEW ──────────────────────────────────────────────
  function fitView() {
    if (currentNodes.length === 0) return;

    const xExtent = d3.extent(currentNodes, d => d.x);
    const yExtent = d3.extent(currentNodes, d => d.y);
    const dx = xExtent[1] - xExtent[0] + 120;
    const dy = yExtent[1] - yExtent[0] + 120;
    const cx = (xExtent[0] + xExtent[1]) / 2;
    const cy = (yExtent[0] + yExtent[1]) / 2;
    const scale = Math.min(0.85, 0.9 / Math.max(dx / width, dy / height));

    svg.transition().duration(750).call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-cx, -cy)
    );
  }

  return {
    init, update, selectNode, clearSelection,
    highlightPattern, clearHighlights, fitView,
    startParticles, stopParticles
  };
})();
