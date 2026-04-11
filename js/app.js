// ============================================================
// NidhiNetra — Main Application Controller
// State management, UI wiring, trail export
// ============================================================

const NidhiApp = (() => {
  let currentCase = 'ALL';
  let detectionResults = null;
  let entityResults = null;
  let activeTab = 'details';

  // ── INITIALIZE ────────────────────────────────────────────
  async function init() {
    console.log('🚀 NidhiApp initializing...');
    
    try {
      // Load data from MongoDB API (falls back to local data if unavailable)
      console.log('📡 Loading data...');
      await NidhiData.loadFromAPI();
      console.log('✅ Data loaded');

      // Show data source indicator
      const bottomRight = document.querySelector('.bottom-right');
      if (bottomRight) {
        const sourceTag = document.createElement('span');
        sourceTag.style.cssText = NidhiData.isUsingAPI()
          ? 'color:#06d6a0;font-weight:600;'
          : 'color:#ffd166;font-weight:600;';
        sourceTag.textContent = NidhiData.isUsingAPI() ? '● MongoDB Connected' : '● Local Data';
        bottomRight.insertBefore(sourceTag, bottomRight.firstChild);
      }

      // Init graph
      console.log('🎨 Initializing graph...');
      SpiderMap.init('graph-container', onNodeSelected);
      console.log('✅ Graph initialized');

      // Run initial analysis
      console.log('📊 Running analysis...');
      runAnalysis();
      console.log('✅ Analysis complete');

      // Wire up UI events
      console.log('🔌 Wiring events...');
      wireEvents();
      console.log('✅ Events wired');

      // Hide loading with fallback timeout
      setTimeout(() => {
        console.log('✨ Hiding loader');
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.classList.add('hidden');
          setTimeout(() => {
            if (loader.parentNode) loader.remove();
          }, 500);
        }
      }, 500);
    } catch (err) {
      console.error('❌ Init error:', err);
      // Force loading screen to disappear after 3 seconds even if error
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.classList.add('hidden');
          setTimeout(() => {
            if (loader.parentNode) loader.remove();
          }, 500);
        }
      }, 3000);
    }
  }

  // ── RUN ANALYSIS ──────────────────────────────────────────
  function runAnalysis() {
    const accounts = NidhiData.getAccounts(currentCase);
    const transactions = NidhiData.getTransactions(currentCase);

    // Run pattern detection
    detectionResults = PatternEngine.runAllDetections(currentCase);

    // Run entity resolution
    entityResults = EntityResolver.getResolutionSummary(NidhiData.getAccounts('ALL'));

    // Apply filters
    const filters = getFilterValues();
    FilterEngine.setFilters(filters);
    const filtered = FilterEngine.applyFilters(accounts, transactions);

    // Get entity links for the visible accounts
    const visibleIds = new Set(filtered.accounts.map(a => a.id));
    const entityLinks = entityResults.links.filter(l =>
      visibleIds.has(l.source) && visibleIds.has(l.target)
    );

    // Update graph
    SpiderMap.update(
      filtered.accounts,
      filtered.transactions,
      entityLinks,
      detectionResults.layers
    );

    // Update stats
    updateStats(filtered, detectionResults, entityResults);

    // Update alerts panel
    updateAlertsPanel(detectionResults);

    // Update entity panel
    updateEntityPanel(entityResults);

    // Update bottom bar
    updateBottomBar(filtered, detectionResults);

    // Fit view after a delay
    setTimeout(() => SpiderMap.fitView(), 1500);
  }

  // ── GET FILTER VALUES ─────────────────────────────────────
  function getFilterValues() {
    return {
      caseId: currentCase,
      searchText: document.getElementById('filter-search')?.value || '',
      ip: document.getElementById('filter-ip')?.value || '',
      phone: document.getElementById('filter-phone')?.value || '',
      email: document.getElementById('filter-email')?.value || '',
      city: document.getElementById('filter-city')?.value || '',
      minAmount: document.getElementById('filter-min-amount')?.value || '',
      maxAmount: document.getElementById('filter-max-amount')?.value || '',
      riskLevel: document.getElementById('filter-risk')?.value || 'all',
      accountType: document.getElementById('filter-type')?.value || 'all',
    };
  }

  // ── WIRE EVENTS ───────────────────────────────────────────
  function wireEvents() {
    // Case selector buttons
    document.querySelectorAll('.case-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCase = btn.dataset.case;
        runAnalysis();
      });
    });

    // Filter apply
    document.getElementById('btn-apply-filter')?.addEventListener('click', () => {
      runAnalysis();
    });

    // Filter clear
    document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
      document.querySelectorAll('.filter-input').forEach(i => i.value = '');
      document.querySelectorAll('.filter-select').forEach(s => s.selectedIndex = 0);
      runAnalysis();
    });

    // Filter inputs — apply on Enter
    document.querySelectorAll('.filter-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runAnalysis();
      });
    });

    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
        document.getElementById('panel-' + activeTab)?.classList.add('active');
      });
    });

    // Graph controls
    document.getElementById('btn-fit-view')?.addEventListener('click', () => SpiderMap.fitView());
    document.getElementById('btn-toggle-particles')?.addEventListener('click', function() {
      if (this.classList.contains('active')) {
        SpiderMap.stopParticles();
        this.classList.remove('active');
      } else {
        SpiderMap.startParticles();
        this.classList.add('active');
      }
    });

    // Export
    document.getElementById('btn-export')?.addEventListener('click', exportTrails);

    // Run detection button
    document.getElementById('btn-detect')?.addEventListener('click', () => {
      runAnalysis();
      // Switch to alerts tab
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('[data-tab="alerts"]')?.classList.add('active');
      document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
      document.getElementById('panel-alerts')?.classList.add('active');
    });
  }

  // ── NODE SELECTED CALLBACK ────────────────────────────────
  function onNodeSelected(node, outTrails, inTrails) {
    const detailPanel = document.getElementById('panel-details');
    if (!detailPanel) return;

    if (!node) {
      detailPanel.innerHTML = `
        <div class="panel-empty">
          <div class="icon">🔍</div>
          <div class="text">Click any node on the<br>spider map to inspect</div>
        </div>`;
      return;
    }

    const acc = node;
    const totalOut = outTrails.reduce((s, t) => s + t.transactions.reduce((ss, tx) => ss + tx.amount, 0), 0);
    const totalIn = inTrails.reduce((s, t) => s + t.transactions.reduce((ss, tx) => ss + tx.amount, 0), 0);

    let html = `<div class="account-detail animate-in">`;

    // Header
    html += `
      <div class="account-header">
        <div class="account-avatar ${acc.type}">${acc.type === 'source' ? '🏦' : acc.type === 'destination' ? '🎯' : '💰'}</div>
        <div>
          <div class="account-name">${acc.holder}</div>
          <div class="account-id">${acc.id} · ${acc.bank}</div>
          <span class="risk-badge ${acc.risk}">${acc.risk}</span>
        </div>
      </div>`;

    // Details grid
    html += `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-key">Account No</div><div class="detail-val">${acc.accNo}</div></div>
        <div class="detail-item"><div class="detail-key">IFSC</div><div class="detail-val">${acc.ifsc}</div></div>
        <div class="detail-item"><div class="detail-key">Phone</div><div class="detail-val">${acc.phone}</div></div>
        <div class="detail-item"><div class="detail-key">Email</div><div class="detail-val">${acc.email}</div></div>
        <div class="detail-item"><div class="detail-key">IP Address</div><div class="detail-val">${acc.ip}</div></div>
        <div class="detail-item"><div class="detail-key">City</div><div class="detail-val">${acc.city}</div></div>
        <div class="detail-item"><div class="detail-key">Case</div><div class="detail-val">${acc.caseId}</div></div>
        <div class="detail-item"><div class="detail-key">Layer</div><div class="detail-val">L${detectionResults?.layers?.[acc.id] ?? '?'}</div></div>
      </div>`;

    // Money flow summary
    html += `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-key">Total Outflow</div><div class="detail-val" style="color:var(--accent-red)">${NidhiData.formatCurrency(totalOut)}</div></div>
        <div class="detail-item"><div class="detail-key">Total Inflow</div><div class="detail-val" style="color:var(--accent-green)">${NidhiData.formatCurrency(totalIn)}</div></div>
      </div>`;

    // Outgoing trails
    if (outTrails.length > 0) {
      html += `<div class="section-title">Outgoing Trails <span class="count">${outTrails.length}</span></div>`;
      html += `<div class="trail-list">`;
      outTrails.forEach(trail => {
        const amount = trail.transactions.reduce((s, t) => s + t.amount, 0);
        html += `<div class="trail-item">
          <div class="trail-path">${trail.path.map(n => `<span class="trail-node">${n}</span>`).join('<span class="trail-arrow">→</span>')}</div>
          <div class="trail-amount">${NidhiData.formatCurrency(amount)} · ${trail.transactions.length} hops</div>
        </div>`;
      });
      html += `</div>`;
    }

    // Incoming trails
    if (inTrails.length > 0) {
      html += `<div class="section-title" style="margin-top:12px">Incoming Trails <span class="count">${inTrails.length}</span></div>`;
      html += `<div class="trail-list">`;
      inTrails.forEach(trail => {
        const amount = trail.transactions.reduce((s, t) => s + t.amount, 0);
        html += `<div class="trail-item">
          <div class="trail-path">${trail.path.map(n => `<span class="trail-node">${n}</span>`).join('<span class="trail-arrow">←</span>')}</div>
          <div class="trail-amount">${NidhiData.formatCurrency(amount)} · ${trail.transactions.length} hops</div>
        </div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
    detailPanel.innerHTML = html;

    // Switch to details tab
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="details"]')?.classList.add('active');
    document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
    detailPanel.classList.add('active');
  }

  // ── UPDATE STATS ──────────────────────────────────────────
  function updateStats(filtered, detection, entities) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setVal('stat-accounts', filtered.accounts.length);
    setVal('stat-transactions', filtered.transactions.length);
    setVal('stat-alerts', detection.summary.totalPatterns);
    setVal('stat-critical', detection.summary.criticalCount);
    setVal('stat-entities', entities.summary.totalLinks);
    setVal('stat-amount', NidhiData.formatCurrency(
      filtered.transactions.reduce((s, t) => s + t.amount, 0)
    ));
  }

  // ── UPDATE ALERTS PANEL ───────────────────────────────────
  function updateAlertsPanel(detection) {
    const panel = document.getElementById('panel-alerts');
    if (!panel) return;

    if (detection.all.length === 0) {
      panel.innerHTML = `<div class="no-data">No patterns detected</div>`;
      return;
    }

    let html = '';

    // Sort by severity
    const sorted = [...detection.all].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });

    html += `<div class="section-title">Detected Patterns <span class="count">${sorted.length}</span></div>`;
    html += `<div class="alert-list">`;

    sorted.forEach((pattern, i) => {
      const icon = pattern.type === 'cycle' ? '🔄' :
                   pattern.type === 'fan-out' ? '🔀' :
                   pattern.type === 'fan-in' ? '🔁' :
                   pattern.type === 'rapid-movement' ? '⚡' :
                   pattern.type === 'pass-through' ? '💨' : '⚠️';

      html += `
        <div class="alert-item ${pattern.severity}" data-pattern-index="${i}" onclick="NidhiApp.highlightAlert(${i})">
          <div class="alert-icon">${icon}</div>
          <div>
            <div class="alert-type ${pattern.type}">${pattern.type.replace('-', ' ')}</div>
            <div class="alert-text">${pattern.description}</div>
          </div>
        </div>`;
    });

    html += `</div>`;
    panel.innerHTML = html;
  }

  // ── UPDATE ENTITY PANEL ───────────────────────────────────
  function updateEntityPanel(entities) {
    const panel = document.getElementById('panel-entities');
    if (!panel) return;

    let html = '';

    // Clusters
    if (entities.clusters.length > 0) {
      html += `<div class="section-title">Entity Clusters <span class="count">${entities.clusters.length}</span></div>`;
      entities.clusters.forEach(cluster => {
        html += `<div class="cluster-card">
          <div class="cluster-header">
            <div class="cluster-title">${cluster.id}</div>
            <div class="cluster-risk">Risk: ${cluster.riskScore}</div>
          </div>
          <div class="cluster-cases">${cluster.cases.map(c => `<span class="case-tag">${c}</span>`).join('')}</div>
          <div class="cluster-members">${cluster.members.map(m => {
            const acc = NidhiData.getAccountById(m);
            return `<span class="member-tag">${acc ? acc.holder.split(' ')[0] : m}</span>`;
          }).join('')}</div>
        </div>`;
      });
    }

    // Individual links
    if (entities.links.length > 0) {
      html += `<div class="section-title" style="margin-top:12px">Cross-Case Links <span class="count">${entities.links.length}</span></div>`;
      html += `<div class="entity-list">`;
      entities.links.forEach(link => {
        html += `
          <div class="entity-item" onclick="NidhiApp.highlightEntity('${link.source}','${link.target}')">
            <div class="entity-match-type">${link.matchType} match</div>
            <div class="entity-accounts">
              <span>${link.sourceName}</span>
              <span class="entity-arrow">↔</span>
              <span>${link.targetName}</span>
            </div>
            <div class="entity-value">${link.matchValue} · ${link.sourceCase} ↔ ${link.targetCase}</div>
          </div>`;
      });
      html += `</div>`;
    }

    if (!html) {
      html = `<div class="no-data">No cross-case links found</div>`;
    }

    panel.innerHTML = html;
  }

  // ── UPDATE BOTTOM BAR ─────────────────────────────────────
  function updateBottomBar(filtered, detection) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setVal('bottom-accounts', `${filtered.accounts.length} Accounts`);
    setVal('bottom-transactions', `${filtered.transactions.length} Transactions`);
    setVal('bottom-alerts', `${detection.summary.totalPatterns} Alerts`);
    setVal('bottom-case', currentCase === 'ALL' ? 'All Cases' : currentCase);
  }

  // ── HIGHLIGHT ALERT ───────────────────────────────────────
  function highlightAlert(index) {
    const sorted = [...detectionResults.all].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });
    const pattern = sorted[index];
    if (pattern) {
      SpiderMap.highlightPattern(pattern);
    }
  }

  // ── HIGHLIGHT ENTITY ──────────────────────────────────────
  function highlightEntity(source, target) {
    SpiderMap.highlightPattern({
      nodes: [source, target],
      transactions: []
    });
  }

  // ── EXPORT TRAILS ─────────────────────────────────────────
  function exportTrails() {
    const accounts = NidhiData.getAccounts(currentCase);
    const transactions = NidhiData.getTransactions(currentCase);
    const sources = accounts.filter(a => a.type === 'source');

    const exportData = {
      case: currentCase,
      exportDate: new Date().toISOString(),
      summary: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        patterns: detectionResults?.summary || {},
        entities: entityResults?.summary || {}
      },
      accounts: accounts.map(a => ({
        id: a.id, holder: a.holder, bank: a.bank, accNo: a.accNo,
        phone: a.phone, email: a.email, ip: a.ip, city: a.city,
        caseId: a.caseId, type: a.type, risk: a.risk,
        layer: detectionResults?.layers?.[a.id] ?? -1
      })),
      transactions: transactions.map(t => ({
        id: t.id, from: t.from, to: t.to, amount: t.amount,
        date: t.date, method: t.method, caseId: t.caseId
      })),
      moneyTrails: sources.map(s => ({
        source: s.id,
        holder: s.holder,
        trails: PatternEngine.traceTrails(s.id, accounts, transactions, 'outgoing').map(trail => ({
          path: trail.path,
          hops: trail.path.length - 1,
          totalAmount: trail.transactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: trail.transactions.map(t => ({
            id: t.id, from: t.from, to: t.to,
            amount: t.amount, date: t.date
          }))
        }))
      })),
      patterns: detectionResults?.all || [],
      crossCaseLinks: entityResults?.links || []
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NidhiNetra_Trail_${currentCase}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { init, runAnalysis, highlightAlert, highlightEntity, exportTrails };
})();

// ── BOOT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', NidhiApp.init);
