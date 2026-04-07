// ============================================================
// NidhiNetra — Cross-Case Entity Resolution
// Links accounts across cases via shared identifiers
// ============================================================

const EntityResolver = (() => {

  // ── BUILD INVERTED INDEX ──────────────────────────────────
  function buildIndex(accounts) {
    const index = {
      ip: {},
      phone: {},
      email: {},
      city: {}
    };

    accounts.forEach(a => {
      // IP index
      if (a.ip) {
        if (!index.ip[a.ip]) index.ip[a.ip] = [];
        index.ip[a.ip].push(a.id);
      }
      // Phone index
      if (a.phone) {
        if (!index.phone[a.phone]) index.phone[a.phone] = [];
        index.phone[a.phone].push(a.id);
      }
      // Email index
      if (a.email) {
        if (!index.email[a.email]) index.email[a.email] = [];
        index.email[a.email].push(a.id);
      }
      // City index
      if (a.city) {
        if (!index.city[a.city]) index.city[a.city] = [];
        index.city[a.city].push(a.id);
      }
    });

    return index;
  }

  // ── FIND CROSS-CASE LINKS ────────────────────────────────
  function findCrossCaseLinks(accounts) {
    const index = buildIndex(accounts);
    const links = [];
    const seen = new Set();

    function addLink(acc1Id, acc2Id, matchType, matchValue) {
      const key = [acc1Id, acc2Id].sort().join(':') + ':' + matchType;
      if (seen.has(key)) return;
      seen.add(key);

      const a1 = accounts.find(a => a.id === acc1Id);
      const a2 = accounts.find(a => a.id === acc2Id);
      if (!a1 || !a2) return;
      if (a1.caseId === a2.caseId) return; // Only cross-case

      links.push({
        source: acc1Id,
        target: acc2Id,
        matchType,
        matchValue,
        sourceName: a1.holder,
        targetName: a2.holder,
        sourceCase: a1.caseId,
        targetCase: a2.caseId,
        severity: matchType === 'ip' ? 'critical' : matchType === 'phone' ? 'high' : 'medium',
        description: `${matchType.toUpperCase()} match: ${a1.holder} (${a1.caseId}) ↔ ${a2.holder} (${a2.caseId}) via ${matchValue}`
      });
    }

    // Check all identifier types for cross-case matches
    ['ip', 'phone', 'email'].forEach(type => {
      Object.entries(index[type]).forEach(([value, accIds]) => {
        if (accIds.length > 1) {
          for (let i = 0; i < accIds.length; i++) {
            for (let j = i + 1; j < accIds.length; j++) {
              addLink(accIds[i], accIds[j], type, value);
            }
          }
        }
      });
    });

    return links;
  }

  // ── GROUP INTO ENTITY CLUSTERS ────────────────────────────
  function buildEntityClusters(accounts) {
    const links = findCrossCaseLinks(accounts);
    const clusters = [];
    const visited = new Set();

    // Union-Find for clustering
    const parent = {};
    accounts.forEach(a => parent[a.id] = a.id);

    function find(x) {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    function union(x, y) {
      parent[find(x)] = find(y);
    }

    links.forEach(l => union(l.source, l.target));

    // Group by root
    const groups = {};
    accounts.forEach(a => {
      const root = find(a.id);
      if (!groups[root]) groups[root] = [];
      groups[root].push(a.id);
    });

    // Only keep clusters with cross-case members
    Object.entries(groups).forEach(([root, members]) => {
      if (members.length > 1) {
        const memberAccounts = members.map(id => accounts.find(a => a.id === id)).filter(Boolean);
        const cases = new Set(memberAccounts.map(a => a.caseId));
        if (cases.size > 1) {
          const relatedLinks = links.filter(l => members.includes(l.source) || members.includes(l.target));
          clusters.push({
            id: 'CLUSTER-' + root,
            members,
            cases: [...cases],
            links: relatedLinks,
            riskScore: relatedLinks.reduce((s, l) => s + (l.severity === 'critical' ? 3 : l.severity === 'high' ? 2 : 1), 0),
            description: `Entity cluster spanning ${cases.size} cases with ${members.length} linked accounts`
          });
        }
      }
    });

    return clusters.sort((a, b) => b.riskScore - a.riskScore);
  }

  // ── GET ENTITY RESOLUTION SUMMARY ─────────────────────────
  function getResolutionSummary(accounts) {
    const links = findCrossCaseLinks(accounts);
    const clusters = buildEntityClusters(accounts);

    return {
      links,
      clusters,
      summary: {
        totalLinks: links.length,
        ipMatches: links.filter(l => l.matchType === 'ip').length,
        phoneMatches: links.filter(l => l.matchType === 'phone').length,
        emailMatches: links.filter(l => l.matchType === 'email').length,
        totalClusters: clusters.length,
        criticalLinks: links.filter(l => l.severity === 'critical').length
      }
    };
  }

  return { buildIndex, findCrossCaseLinks, buildEntityClusters, getResolutionSummary };
})();
