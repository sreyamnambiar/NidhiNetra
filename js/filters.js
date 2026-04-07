// ============================================================
// NidhiNetra — Filter Engine
// Live filtering of graph nodes and edges
// ============================================================

const FilterEngine = (() => {
  let activeFilters = {};

  function setFilters(filters) {
    activeFilters = { ...filters };
  }

  function getFilters() {
    return { ...activeFilters };
  }

  function clearFilters() {
    activeFilters = {};
  }

  function applyFilters(accounts, transactions) {
    let filteredAccounts = [...accounts];
    let filteredTransactions = [...transactions];

    // Case filter
    if (activeFilters.caseId && activeFilters.caseId !== 'ALL') {
      filteredAccounts = filteredAccounts.filter(a => a.caseId === activeFilters.caseId);
      const accIds = new Set(filteredAccounts.map(a => a.id));
      filteredTransactions = filteredTransactions.filter(t =>
        (t.caseId === activeFilters.caseId || t.caseId === 'CROSS') &&
        accIds.has(t.from) && accIds.has(t.to)
      );
    }

    // Search text (name, account number)
    if (activeFilters.searchText) {
      const q = activeFilters.searchText.toLowerCase();
      filteredAccounts = filteredAccounts.filter(a =>
        a.holder.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.accNo.includes(q) ||
        a.bank.toLowerCase().includes(q)
      );
    }

    // IP filter
    if (activeFilters.ip) {
      const q = activeFilters.ip.toLowerCase();
      filteredAccounts = filteredAccounts.filter(a => a.ip.toLowerCase().includes(q));
    }

    // Phone filter
    if (activeFilters.phone) {
      const q = activeFilters.phone;
      filteredAccounts = filteredAccounts.filter(a => a.phone.includes(q));
    }

    // Email filter
    if (activeFilters.email) {
      const q = activeFilters.email.toLowerCase();
      filteredAccounts = filteredAccounts.filter(a => a.email.toLowerCase().includes(q));
    }

    // City filter
    if (activeFilters.city) {
      const q = activeFilters.city.toLowerCase();
      filteredAccounts = filteredAccounts.filter(a => a.city.toLowerCase().includes(q));
    }

    // Amount range
    if (activeFilters.minAmount || activeFilters.maxAmount) {
      const min = activeFilters.minAmount ? parseInt(activeFilters.minAmount) : 0;
      const max = activeFilters.maxAmount ? parseInt(activeFilters.maxAmount) : Infinity;
      filteredTransactions = filteredTransactions.filter(t => t.amount >= min && t.amount <= max);
    }

    // Risk level
    if (activeFilters.riskLevel && activeFilters.riskLevel !== 'all') {
      filteredAccounts = filteredAccounts.filter(a => a.risk === activeFilters.riskLevel);
    }

    // Account type
    if (activeFilters.accountType && activeFilters.accountType !== 'all') {
      filteredAccounts = filteredAccounts.filter(a => a.type === activeFilters.accountType);
    }

    // Pattern type highlight
    if (activeFilters.patternType && activeFilters.patternType !== 'all') {
      // This doesn't filter accounts but will be used to highlight
    }

    // Ensure transactions only reference visible accounts
    const visibleIds = new Set(filteredAccounts.map(a => a.id));
    filteredTransactions = filteredTransactions.filter(t =>
      visibleIds.has(t.from) && visibleIds.has(t.to)
    );

    return { accounts: filteredAccounts, transactions: filteredTransactions };
  }

  function getFilterStats(original, filtered) {
    return {
      accountsShown: filtered.accounts.length,
      accountsTotal: original.accounts.length,
      transactionsShown: filtered.transactions.length,
      transactionsTotal: original.transactions.length,
      totalAmount: filtered.transactions.reduce((s, t) => s + t.amount, 0)
    };
  }

  return { setFilters, getFilters, clearFilters, applyFilters, getFilterStats };
})();
