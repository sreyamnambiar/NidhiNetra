// ============================================================
// NidhiNetra Admin Dashboard — Investigator Controls
// Pattern detection, alerts, reporting, audit logging
// ============================================================

const NidhiAdmin = (() => {
  let casesData = [];
  let accountsData = [];
  let transactionsData = [];
  let auditLog = [];

  // ── INITIALIZE ────────────────────────────────────────────
  async function init() {
    console.log('🔐 Admin Dashboard initializing...');
    
    try {
      // Load data
      console.log('📡 Loading case data...');
      const casesRes = await fetch('/api/cases');
      const accountsRes = await fetch('/api/accounts?source=neo4j');
      const txnRes = await fetch('/api/transactions');

      casesData = await casesRes.json();
      accountsData = await accountsRes.json();
      transactionsData = await txnRes.json();

      console.log('✅ Data loaded');

      // Populate dashboard
      populateDashboard();
      wireEvents();
      
      // Log activity
      logAudit('🚀 Admin Dashboard initialized', 'System');

      // Hide loader
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.classList.add('hidden');
          setTimeout(() => { if (loader.parentNode) loader.remove(); }, 300);
        }
      }, 500);
    } catch (err) {
      console.error('❌ Init error:', err);
      logAudit('❌ Initialization failed: ' + err.message, 'System');
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.classList.add('hidden');
          setTimeout(() => { if (loader.parentNode) loader.remove(); }, 300);
        }
      }, 3000);
    }
  }

  // ── POPULATE DASHBOARD ──────────────────────────────────
  function populateDashboard() {
    // Metrics
    document.getElementById('metric-accounts').textContent = accountsData.length;
    
    const totalVolume = transactionsData.reduce((sum, t) => sum + (t.amount || 0), 0);
    document.getElementById('metric-volume').textContent = formatCurrency(totalVolume);
    
    const highRiskCount = accountsData.filter(a => a.risk === 'critical').length;
    document.getElementById('metric-alerts').textContent = highRiskCount;
    
    document.getElementById('metric-entities').textContent = casesData.length;

    // Cases list
    const casesList = document.getElementById('cases-list');
    casesList.innerHTML = casesData.map(c => `
      <div class="case-item">
        <strong>${c.name}</strong>
        <div class="case-item-meta">Type: ${c.type} | Status: ${c.status}</div>
      </div>
    `).join('');

    // High-risk accounts
    const highRiskAccts = accountsData.filter(a => a.risk === 'critical' || a.risk === 'high').slice(0, 5);
    const riskList = document.getElementById('high-risk-accounts');
    riskList.innerHTML = highRiskAccts.length > 0 
      ? highRiskAccts.map(a => `
        <div class="account-item">
          <strong>${a.holder}</strong>
          <div class="account-item-meta">
            ${a.accountId} • ${a.bank} • Risk: <span style="color:#ef476f">${a.risk}</span>
          </div>
        </div>
      `).join('')
      : '<p class="placeholder">No critical accounts</p>';

    // Cases select
    const caseSelect = document.getElementById('case-select');
    casesData.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id || c.caseId;
      opt.textContent = c.name;
      caseSelect.appendChild(opt);
    });
  }

  // ── WIRE EVENTS ─────────────────────────────────────────
  function wireEvents() {
    // Tab navigation
    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = el.dataset.tab;
        switchTab(tab);
        logAudit(`📄 Viewed ${tab} tab`, 'Navigation');
      });
    });

    // Pattern detection buttons
    document.getElementById('btn-circular')?.addEventListener('click', detectCircular);
    document.getElementById('btn-rapid')?.addEventListener('click', detectRapid);
    document.getElementById('btn-highvalue')?.addEventListener('click', detectHighValue);

    // Export buttons
    document.getElementById('btn-export-report')?.addEventListener('click', exportReport);
    document.getElementById('btn-export-graph')?.addEventListener('click', exportGraph);
    document.getElementById('btn-export-alerts')?.addEventListener('click', exportAlerts);
    document.getElementById('btn-export-accounts')?.addEventListener('click', exportAccounts);

    // Audit log
    document.getElementById('btn-clear-log')?.addEventListener('click', clearLog);
    document.getElementById('audit-search')?.addEventListener('input', filterAuditLog);
  }

  // ── TAB SWITCHING ───────────────────────────────────────
  function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName)?.classList.add('active');
    
    document.querySelectorAll('[data-tab]').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  }

  // ── PATTERN DETECTION ───────────────────────────────────
  async function detectCircular() {
    const resultsDiv = document.getElementById('circular-results');
    const statusBadge = document.getElementById('circular-status');
    
    statusBadge.textContent = 'Analyzing...';
    statusBadge.style.color = '#ffd166';
    
    try {
      // Simulated circular pattern detection
      const patterns = [];
      
      // Simple heuristic: find 3+ accounts that form a cycle
      for (let i = 0; i < transactionsData.length; i++) {
        for (let j = i + 1; j < transactionsData.length; j++) {
          if (transactionsData[i].to === transactionsData[j].from &&
              transactionsData[i].from === transactionsData[j].to) {
            patterns.push({
              path: `${transactionsData[i].from} → ${transactionsData[i].to} → ${transactionsData[i].from}`,
              amount: transactionsData[i].amount + transactionsData[j].amount,
              count: 2
            });
          }
        }
      }

      if (patterns.length > 0) {
        resultsDiv.innerHTML = patterns.slice(0, 5).map(p => `
          <div class="pattern-item">
            <strong>🔄 Circular Flow: ${p.path}</strong>
            <div style="font-size:11px; color:#7a8ba8; margin-top:4px;">
              Total: ${formatCurrency(p.amount)} | Hops: ${p.count}
            </div>
          </div>
        `).join('');
        statusBadge.textContent = `Found ${patterns.length}`;
        statusBadge.style.color = '#ef476f';
        logAudit(`🔄 Detected ${patterns.length} circular patterns`, 'Pattern Detection');
      } else {
        resultsDiv.innerHTML = '<p class="placeholder">No circular patterns found</p>';
        statusBadge.textContent = 'None found';
      }
    } catch (err) {
      resultsDiv.innerHTML = `<p class="placeholder" style="color:#ef476f;">Error: ${err.message}</p>`;
      statusBadge.textContent = 'Error';
    }
  }

  async function detectRapid() {
    const resultsDiv = document.getElementById('rapid-results');
    const statusBadge = document.getElementById('rapid-status');
    
    statusBadge.textContent = 'Analyzing...';
    statusBadge.style.color = '#ffd166';
    
    try {
      // Find accounts with 3+ transactions close in time (within 5 min)
      const rapidAccounts = {};
      
      transactionsData.forEach(t => {
        if (!rapidAccounts[t.from]) rapidAccounts[t.from] = [];
        rapidAccounts[t.from].push(new Date(t.date).getTime());
      });

      const patterns = [];
      Object.entries(rapidAccounts).forEach(([acc, times]) => {
        if (times.length >= 3) {
          const sorted = times.sort((a, b) => a - b);
          for (let i = 0; i < sorted.length - 2; i++) {
            if (sorted[i + 2] - sorted[i] < 5 * 60 * 1000) { // 5 minutes
              patterns.push({
                account: acc,
                count: 3,
                amount: transactionsData.filter(t => t.from === acc).reduce((s, t) => s + t.amount, 0)
              });
              break;
            }
          }
        }
      });

      if (patterns.length > 0) {
        resultsDiv.innerHTML = patterns.slice(0, 5).map(p => {
          const accData = accountsData.find(a => a.accountId === p.account);
          return `
            <div class="pattern-item">
              <strong>⚡ Rapid Activity: ${accData?.holder || p.account}</strong>
              <div style="font-size:11px; color:#7a8ba8; margin-top:4px;">
                ${p.count} txns | Total: ${formatCurrency(p.amount)}
              </div>
            </div>
          `;
        }).join('');
        statusBadge.textContent = `Found ${patterns.length}`;
        statusBadge.style.color = '#f72585';
        logAudit(`⚡ Detected ${patterns.length} rapid transactions`, 'Pattern Detection');
      } else {
        resultsDiv.innerHTML = '<p class="placeholder">No rapid patterns found</p>';
        statusBadge.textContent = 'None found';
      }
    } catch (err) {
      resultsDiv.innerHTML = `<p class="placeholder" style="color:#ef476f;">Error: ${err.message}</p>`;
    }
  }

  async function detectHighValue() {
    const resultsDiv = document.getElementById('highvalue-results');
    const statusBadge = document.getElementById('highvalue-status');
    
    statusBadge.textContent = 'Analyzing...';
    statusBadge.style.color = '#ffd166';
    
    try {
      // Find high-value transactions (> ₹1 Crore)
      const highValue = transactionsData.filter(t => t.amount >= 10000000);

      if (highValue.length > 0) {
        resultsDiv.innerHTML = highValue.slice(0, 5).map(t => {
          const from = accountsData.find(a => a.accountId === t.from);
          const to = accountsData.find(a => a.accountId === t.to);
          return `
            <div class="pattern-item">
              <strong>💎 ${formatCurrency(t.amount)}</strong>
              <div style="font-size:11px; color:#7a8ba8; margin-top:4px;">
                ${from?.holder} → ${to?.holder}
              </div>
            </div>
          `;
        }).join('');
        statusBadge.textContent = `Found ${highValue.length}`;
        statusBadge.style.color = '#ffd166';
        logAudit(`💎 Detected ${highValue.length} high-value networks`, 'Pattern Detection');
      } else {
        resultsDiv.innerHTML = '<p class="placeholder">No high-value transactions</p>';
        statusBadge.textContent = 'None found';
      }
    } catch (err) {
      resultsDiv.innerHTML = `<p class="placeholder" style="color:#ef476f;">Error: ${err.message}</p>`;
    }
  }

  // ── EXPORT FUNCTIONS ────────────────────────────────────
  function exportReport() {
    const caseId = document.getElementById('case-select')?.value;
    if (!caseId) {
      alert('Please select a case');
      return;
    }

    const caseData = casesData.find(c => c.id === caseId || c.caseId === caseId);
    const caseAccounts = accountsData.filter(a => a.caseId === caseId);
    const caseTxns = transactionsData.filter(t => t.caseId === caseId);

    let report = `INVESTIGATION REPORT - ${caseData?.name}\n`;
    report += `${new Date().toISOString()}\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Case Type: ${caseData?.type}\nStatus: ${caseData?.status}\nCity: ${caseData?.city}\n\n`;
    report += `ACCOUNTS (${caseAccounts.length}):\n`;
    caseAccounts.forEach(a => {
      report += `- ${a.holder} (${a.accountId})\n  Bank: ${a.bank}, Risk: ${a.risk}\n`;
    });
    report += `\nTRANSACTIONS (${caseTxns.length}):\n`;
    const volume = caseTxns.reduce((s, t) => s + t.amount, 0);
    report += `Total Volume: ${formatCurrency(volume)}\n`;

    downloadFile(report, `report_${caseId}.txt`);
    logAudit(`📄 Exported report for ${caseData?.name}`, 'Export');
  }

  function exportGraph() {
    const graphData = {
      accounts: accountsData,
      transactions: transactionsData,
      exportDate: new Date().toISOString()
    };
    downloadFile(JSON.stringify(graphData, null, 2), 'graph_data.json');
    logAudit('📊 Exported graph data', 'Export');
  }

  function exportAlerts() {
    let csv = 'Alert Type,Severity,Account,Date\n';
    accountsData.filter(a => a.risk === 'critical' || a.risk === 'high').forEach(a => {
      csv += `High Risk Account,${a.risk},${a.holder} (${a.accountId}),${new Date().toISOString()}\n`;
    });
    downloadFile(csv, 'alerts.csv');
    logAudit('⚠️ Exported alerts', 'Export');
  }

  function exportAccounts() {
    let csv = 'Account ID,Holder,Bank,Phone,Email,City,Type,Risk,Case\n';
    accountsData.forEach(a => {
      csv += `${a.accountId},"${a.holder}","${a.bank}","${a.phone}","${a.email}","${a.city}","${a.type}","${a.risk}","${a.caseId}"\n`;
    });
    downloadFile(csv, 'accounts.csv');
    logAudit('👥 Exported account listing', 'Export');
  }

  // ── AUDIT LOGGING ───────────────────────────────────────
  function logAudit(action, category) {
    const timestamp = new Date().toLocaleString('en-IN');
    auditLog.unshift({ action, category, timestamp });
    console.log(`📋 [${timestamp}] ${action}`);
    updateAuditDisplay();
  }

  function updateAuditDisplay() {
    const auditDiv = document.getElementById('audit-log');
    auditDiv.innerHTML = auditLog.slice(0, 50).map(entry => `
      <div class="audit-entry">
        <div class="audit-time">${entry.timestamp}</div>
        <div class="audit-action">${entry.action}</div>
        <div class="audit-details">Category: ${entry.category}</div>
      </div>
    `).join('');
  }

  function filterAuditLog() {
    const searchTerm = document.getElementById('audit-search')?.value.toLowerCase() || '';
    const auditDiv = document.getElementById('audit-log');
    const filtered = auditLog.filter(e => 
      e.action.toLowerCase().includes(searchTerm) || 
      e.category.toLowerCase().includes(searchTerm)
    );
    auditDiv.innerHTML = filtered.slice(0, 50).map(entry => `
      <div class="audit-entry">
        <div class="audit-time">${entry.timestamp}</div>
        <div class="audit-action">${entry.action}</div>
        <div class="audit-details">Category: ${entry.category}</div>
      </div>
    `).join('');
  }

  function clearLog() {
    if (confirm('Clear audit log?')) {
      auditLog = [];
      document.getElementById('audit-log').innerHTML = '';
      logAudit('🗑️ Audit log cleared', 'System');
    }
  }

  // ── UTILITIES ───────────────────────────────────────────
  function formatCurrency(amount) {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
    return '₹' + amount;
  }

  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  return { init };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', NidhiAdmin.init);
