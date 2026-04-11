// ============================================================
// NidhiNetra — Transaction & Account Data Model
// Now fetches from MongoDB via REST API with local fallback
// ============================================================

const NidhiData = (() => {
  const API_BASE = '/api';
  let _cases = [];
  let _accounts = [];
  let _transactions = [];
  let _isLoaded = false;
  let _usingAPI = false;

  // ── FALLBACK DATA (used if API is unavailable) ──────────
  const fallbackCases = [
    { caseId: "CASE-2024-001", name: "Operation Phantom Fund", type: "UPI Fraud", city: "Pune", status: "Active" },
    { caseId: "CASE-2024-002", name: "Operation Silk Route", type: "Bank Scam", city: "Chennai", status: "Active" },
    { caseId: "CASE-2024-003", name: "Operation Shadow Wire", type: "Hawala Network", city: "Mumbai", status: "Under Investigation" }
  ];

  const fallbackAccounts = [
    { accountId: "ACC001", id: "ACC001", holder: "Rajesh Malhotra", bank: "State Bank of India", ifsc: "SBIN0001234", accNo: "30281047562", phone: "+91-9876543210", email: "rajesh.m@email.com", ip: "103.45.67.89", city: "Pune", caseId: "CASE-2024-001", type: "source", risk: "high" },
    { accountId: "ACC002", id: "ACC002", holder: "Priya Sharma", bank: "HDFC Bank", ifsc: "HDFC0002345", accNo: "20174536281", phone: "+91-9123456780", email: "priya.s@email.com", ip: "103.45.67.89", city: "Pune", caseId: "CASE-2024-001", type: "mule", risk: "critical" },
    { accountId: "ACC003", id: "ACC003", holder: "Vikram Singh", bank: "ICICI Bank", ifsc: "ICIC0003456", accNo: "10293847561", phone: "+91-8765432190", email: "vikram.s@mail.com", ip: "182.73.12.45", city: "Delhi", caseId: "CASE-2024-001", type: "mule", risk: "high" },
    { accountId: "ACC004", id: "ACC004", holder: "Anjali Desai", bank: "Axis Bank", ifsc: "UTIB0004567", accNo: "91728364501", phone: "+91-7654321098", email: "anjali.d@webmail.com", ip: "49.36.89.112", city: "Mumbai", caseId: "CASE-2024-001", type: "mule", risk: "medium" },
    { accountId: "ACC005", id: "ACC005", holder: "Karan Patel", bank: "Kotak Mahindra", ifsc: "KKBK0005678", accNo: "40582736190", phone: "+91-6543210987", email: "karan.p@inbox.com", ip: "157.48.23.67", city: "Ahmedabad", caseId: "CASE-2024-001", type: "destination", risk: "high" },
    { accountId: "ACC006", id: "ACC006", holder: "Sneha Iyer", bank: "Punjab National Bank", ifsc: "PUNB0006789", accNo: "60817253940", phone: "+91-9988776655", email: "sneha.i@email.com", ip: "122.176.34.78", city: "Bangalore", caseId: "CASE-2024-001", type: "mule", risk: "medium" },
    { accountId: "ACC007", id: "ACC007", holder: "Rohan Mehta", bank: "Bank of Baroda", ifsc: "BARB0007890", accNo: "70249183650", phone: "+91-8877665544", email: "rohan.m@mail.com", ip: "106.51.78.92", city: "Pune", caseId: "CASE-2024-001", type: "destination", risk: "low" },
    { accountId: "ACC008", id: "ACC008", holder: "Deepak Kumar", bank: "Indian Bank", ifsc: "IDIB0008901", accNo: "80351926470", phone: "+91-9556443322", email: "deepak.k@webmail.com", ip: "59.92.45.167", city: "Chennai", caseId: "CASE-2024-002", type: "source", risk: "critical" },
    { accountId: "ACC009", id: "ACC009", holder: "Meera Nair", bank: "Canara Bank", ifsc: "CNRB0009012", accNo: "90482617350", phone: "+91-9445332211", email: "meera.n@email.com", ip: "117.239.56.89", city: "Chennai", caseId: "CASE-2024-002", type: "mule", risk: "high" },
    { accountId: "ACC010", id: "ACC010", holder: "Suresh Reddy", bank: "Union Bank", ifsc: "UBIN0010123", accNo: "11593748260", phone: "+91-8334221100", email: "suresh.r@inbox.com", ip: "223.186.78.34", city: "Hyderabad", caseId: "CASE-2024-002", type: "mule", risk: "high" },
    { accountId: "ACC011", id: "ACC011", holder: "Lakshmi Venkatesh", bank: "Federal Bank", ifsc: "FDRL0011234", accNo: "21604859170", phone: "+91-7223110099", email: "lakshmi.v@mail.com", ip: "59.92.45.167", city: "Coimbatore", caseId: "CASE-2024-002", type: "mule", risk: "medium" },
    { accountId: "ACC012", id: "ACC012", holder: "Arjun Ramamurthy", bank: "South Indian Bank", ifsc: "SIBL0012345", accNo: "31715960280", phone: "+91-6112009988", email: "arjun.r@webmail.com", ip: "136.232.12.56", city: "Madurai", caseId: "CASE-2024-002", type: "destination", risk: "high" },
    { accountId: "ACC013", id: "ACC013", holder: "Divya Sundaram", bank: "Karur Vysya Bank", ifsc: "KVBL0013456", accNo: "41826071390", phone: "+91-9876543210", email: "divya.s@email.com", ip: "49.204.34.78", city: "Salem", caseId: "CASE-2024-002", type: "destination", risk: "medium" },
    { accountId: "ACC014", id: "ACC014", holder: "Mohammed Iqbal", bank: "Yes Bank", ifsc: "YESB0014567", accNo: "51937182400", phone: "+91-9667788990", email: "m.iqbal@mail.com", ip: "103.45.67.89", city: "Mumbai", caseId: "CASE-2024-003", type: "source", risk: "critical" },
    { accountId: "ACC015", id: "ACC015", holder: "Fatima Sheikh", bank: "RBL Bank", ifsc: "RATN0015678", accNo: "62048293510", phone: "+91-8556677889", email: "fatima.s@webmail.com", ip: "182.73.12.45", city: "Mumbai", caseId: "CASE-2024-003", type: "mule", risk: "high" },
    { accountId: "ACC016", id: "ACC016", holder: "Amit Joshi", bank: "IndusInd Bank", ifsc: "INDB0016789", accNo: "72159304620", phone: "+91-7445566778", email: "amit.j@inbox.com", ip: "223.186.78.34", city: "Thane", caseId: "CASE-2024-003", type: "mule", risk: "high" },
    { accountId: "ACC017", id: "ACC017", holder: "Sunita Agarwal", bank: "Bandhan Bank", ifsc: "BDBL0017890", accNo: "82260415730", phone: "+91-6334455667", email: "sunita.a@email.com", ip: "117.239.56.89", city: "Kolkata", caseId: "CASE-2024-003", type: "mule", risk: "medium" },
    { accountId: "ACC018", id: "ACC018", holder: "Ravi Tiwari", bank: "Central Bank", ifsc: "CBIN0018901", accNo: "92371526840", phone: "+91-9988776655", email: "ravi.t@mail.com", ip: "106.51.78.92", city: "Lucknow", caseId: "CASE-2024-003", type: "destination", risk: "high" },
    { accountId: "ACC019", id: "ACC019", holder: "Kavitha Murugan", bank: "IOB", ifsc: "IOBA0019012", accNo: "13482637950", phone: "+91-8877665544", email: "kavitha.m@webmail.com", ip: "157.48.23.67", city: "Chennai", caseId: "CASE-2024-003", type: "destination", risk: "medium" },
    { accountId: "ACC020", id: "ACC020", holder: "Nikhil Deshmukh", bank: "Bank of Maharashtra", ifsc: "MAHB0020123", accNo: "23593748060", phone: "+91-7766554433", email: "nikhil.d@inbox.com", ip: "49.36.89.112", city: "Nagpur", caseId: "CASE-2024-003", type: "mule", risk: "low" }
  ];

  const fallbackTransactions = [
    { txnId: "TXN001", id: "TXN001", from: "ACC001", to: "ACC002", amount: 5000000, currency: "INR", date: "2024-03-15T09:23:00", method: "NEFT", note: "Invoice payment", caseId: "CASE-2024-001" },
    { txnId: "TXN002", id: "TXN002", from: "ACC002", to: "ACC003", amount: 2400000, currency: "INR", date: "2024-03-15T09:45:00", method: "RTGS", note: "Stock purchase", caseId: "CASE-2024-001" },
    { txnId: "TXN003", id: "TXN003", from: "ACC002", to: "ACC004", amount: 2500000, currency: "INR", date: "2024-03-15T10:02:00", method: "NEFT", note: "Property advance", caseId: "CASE-2024-001" },
    { txnId: "TXN004", id: "TXN004", from: "ACC003", to: "ACC005", amount: 1200000, currency: "INR", date: "2024-03-15T11:30:00", method: "UPI", note: "Consultancy fees", caseId: "CASE-2024-001" },
    { txnId: "TXN005", id: "TXN005", from: "ACC003", to: "ACC006", amount: 1100000, currency: "INR", date: "2024-03-15T11:45:00", method: "IMPS", note: "Material supply", caseId: "CASE-2024-001" },
    { txnId: "TXN006", id: "TXN006", from: "ACC004", to: "ACC005", amount: 1800000, currency: "INR", date: "2024-03-15T14:20:00", method: "NEFT", note: "Equipment lease", caseId: "CASE-2024-001" },
    { txnId: "TXN007", id: "TXN007", from: "ACC006", to: "ACC007", amount: 900000, currency: "INR", date: "2024-03-16T08:15:00", method: "RTGS", note: "Service charges", caseId: "CASE-2024-001" },
    { txnId: "TXN008", id: "TXN008", from: "ACC005", to: "ACC001", amount: 500000, currency: "INR", date: "2024-03-16T10:00:00", method: "UPI", note: "Refund", caseId: "CASE-2024-001" },
    { txnId: "TXN009", id: "TXN009", from: "ACC004", to: "ACC007", amount: 600000, currency: "INR", date: "2024-03-16T12:30:00", method: "NEFT", note: "Maintenance", caseId: "CASE-2024-001" },
    { txnId: "TXN010", id: "TXN010", from: "ACC008", to: "ACC009", amount: 8000000, currency: "INR", date: "2024-04-02T06:30:00", method: "RTGS", note: "Loan disbursement", caseId: "CASE-2024-002" },
    { txnId: "TXN011", id: "TXN011", from: "ACC009", to: "ACC010", amount: 3500000, currency: "INR", date: "2024-04-02T06:42:00", method: "NEFT", note: "Investment transfer", caseId: "CASE-2024-002" },
    { txnId: "TXN012", id: "TXN012", from: "ACC009", to: "ACC011", amount: 4200000, currency: "INR", date: "2024-04-02T06:48:00", method: "RTGS", note: "Business capital", caseId: "CASE-2024-002" },
    { txnId: "TXN013", id: "TXN013", from: "ACC010", to: "ACC012", amount: 1500000, currency: "INR", date: "2024-04-02T07:05:00", method: "IMPS", note: "Share purchase", caseId: "CASE-2024-002" },
    { txnId: "TXN014", id: "TXN014", from: "ACC010", to: "ACC013", amount: 1800000, currency: "INR", date: "2024-04-02T07:15:00", method: "NEFT", note: "Gold purchase", caseId: "CASE-2024-002" },
    { txnId: "TXN015", id: "TXN015", from: "ACC011", to: "ACC012", amount: 2000000, currency: "INR", date: "2024-04-02T07:30:00", method: "RTGS", note: "Property deposit", caseId: "CASE-2024-002" },
    { txnId: "TXN016", id: "TXN016", from: "ACC011", to: "ACC008", amount: 1500000, currency: "INR", date: "2024-04-02T08:00:00", method: "NEFT", note: "Loan repayment", caseId: "CASE-2024-002" },
    { txnId: "TXN017", id: "TXN017", from: "ACC012", to: "ACC013", amount: 800000, currency: "INR", date: "2024-04-02T09:20:00", method: "UPI", note: "Commission", caseId: "CASE-2024-002" },
    { txnId: "TXN018", id: "TXN018", from: "ACC013", to: "ACC009", amount: 600000, currency: "INR", date: "2024-04-02T10:45:00", method: "IMPS", note: "Rebate", caseId: "CASE-2024-002" },
    { txnId: "TXN019", id: "TXN019", from: "ACC014", to: "ACC015", amount: 12000000, currency: "INR", date: "2024-05-10T22:15:00", method: "RTGS", note: "Export payment", caseId: "CASE-2024-003" },
    { txnId: "TXN020", id: "TXN020", from: "ACC015", to: "ACC016", amount: 5000000, currency: "INR", date: "2024-05-10T22:28:00", method: "NEFT", note: "Cargo fees", caseId: "CASE-2024-003" },
    { txnId: "TXN021", id: "TXN021", from: "ACC015", to: "ACC017", amount: 6500000, currency: "INR", date: "2024-05-10T22:35:00", method: "RTGS", note: "Textile import", caseId: "CASE-2024-003" },
    { txnId: "TXN022", id: "TXN022", from: "ACC016", to: "ACC018", amount: 2500000, currency: "INR", date: "2024-05-10T23:10:00", method: "IMPS", note: "Warehouse rent", caseId: "CASE-2024-003" },
    { txnId: "TXN023", id: "TXN023", from: "ACC016", to: "ACC019", amount: 2200000, currency: "INR", date: "2024-05-10T23:25:00", method: "NEFT", note: "Transport charges", caseId: "CASE-2024-003" },
    { txnId: "TXN024", id: "TXN024", from: "ACC017", to: "ACC018", amount: 3000000, currency: "INR", date: "2024-05-11T00:05:00", method: "RTGS", note: "Labour contract", caseId: "CASE-2024-003" },
    { txnId: "TXN025", id: "TXN025", from: "ACC017", to: "ACC020", amount: 3200000, currency: "INR", date: "2024-05-11T00:18:00", method: "NEFT", note: "Raw materials", caseId: "CASE-2024-003" },
    { txnId: "TXN026", id: "TXN026", from: "ACC018", to: "ACC014", amount: 1000000, currency: "INR", date: "2024-05-11T02:30:00", method: "UPI", note: "Advance return", caseId: "CASE-2024-003" },
    { txnId: "TXN027", id: "TXN027", from: "ACC020", to: "ACC019", amount: 1500000, currency: "INR", date: "2024-05-11T03:00:00", method: "IMPS", note: "Commission", caseId: "CASE-2024-003" },
    { txnId: "TXN028", id: "TXN028", from: "ACC019", to: "ACC014", amount: 800000, currency: "INR", date: "2024-05-11T04:15:00", method: "NEFT", note: "Rebate", caseId: "CASE-2024-003" },
    { txnId: "TXN029", id: "TXN029", from: "ACC005", to: "ACC013", amount: 750000, currency: "INR", date: "2024-04-10T15:30:00", method: "NEFT", note: "Consulting fees", caseId: "CROSS" },
    { txnId: "TXN030", id: "TXN030", from: "ACC012", to: "ACC018", amount: 1200000, currency: "INR", date: "2024-05-15T17:45:00", method: "RTGS", note: "Business transfer", caseId: "CROSS" },
    { txnId: "TXN031", id: "TXN031", from: "ACC007", to: "ACC015", amount: 450000, currency: "INR", date: "2024-05-20T11:00:00", method: "IMPS", note: "Payment", caseId: "CROSS" },
    { txnId: "TXN032", id: "TXN032", from: "ACC018", to: "ACC002", amount: 900000, currency: "INR", date: "2024-05-22T20:30:00", method: "NEFT", note: "Settlement", caseId: "CROSS" },
    { txnId: "TXN033", id: "TXN033", from: "ACC002", to: "ACC006", amount: 300000, currency: "INR", date: "2024-03-15T09:50:00", method: "UPI", note: "Quick transfer 1", caseId: "CASE-2024-001" },
    { txnId: "TXN034", id: "TXN034", from: "ACC002", to: "ACC007", amount: 250000, currency: "INR", date: "2024-03-15T09:52:00", method: "UPI", note: "Quick transfer 2", caseId: "CASE-2024-001" },
    { txnId: "TXN035", id: "TXN035", from: "ACC002", to: "ACC003", amount: 200000, currency: "INR", date: "2024-03-15T09:54:00", method: "UPI", note: "Quick transfer 3", caseId: "CASE-2024-001" },
    { txnId: "TXN036", id: "TXN036", from: "ACC008", to: "ACC012", amount: 400000, currency: "INR", date: "2024-04-03T10:00:00", method: "NEFT", note: "Direct deposit", caseId: "CASE-2024-002" },
    { txnId: "TXN037", id: "TXN037", from: "ACC011", to: "ACC013", amount: 350000, currency: "INR", date: "2024-04-03T10:30:00", method: "UPI", note: "Split payment", caseId: "CASE-2024-002" },
    { txnId: "TXN038", id: "TXN038", from: "ACC014", to: "ACC020", amount: 800000, currency: "INR", date: "2024-05-12T14:00:00", method: "NEFT", note: "Misc transfer", caseId: "CASE-2024-003" },
    { txnId: "TXN039", id: "TXN039", from: "ACC020", to: "ACC018", amount: 600000, currency: "INR", date: "2024-05-12T14:30:00", method: "IMPS", note: "Forwarding", caseId: "CASE-2024-003" },
    { txnId: "TXN040", id: "TXN040", from: "ACC019", to: "ACC017", amount: 400000, currency: "INR", date: "2024-05-13T09:00:00", method: "NEFT", note: "Return flow", caseId: "CASE-2024-003" }
  ];

  // ── NORMALIZE: map MongoDB fields to original field names ─
  function normalizeAccount(a) {
    return {
      id: a.accountId || a.id,
      holder: a.holder,
      bank: a.bank,
      ifsc: a.ifsc,
      accNo: a.accNo,
      phone: a.phone,
      email: a.email,
      ip: a.ip,
      city: a.city,
      caseId: a.caseId,
      type: a.type,
      risk: a.risk
    };
  }

  function normalizeTransaction(t) {
    return {
      id: t.txnId || t.id,
      from: t.from,
      to: t.to,
      amount: t.amount,
      currency: t.currency || 'INR',
      date: t.date,
      method: t.method,
      note: t.note,
      caseId: t.caseId
    };
  }

  function normalizeCase(c) {
    return {
      id: c.caseId || c.id,
      name: c.name,
      type: c.type,
      city: c.city,
      status: c.status
    };
  }

  // ── LOAD DATA FROM API ──────────────────────────────────
  async function loadFromAPI() {
    try {
      console.log('📡 Fetching data from Neo4j API...');
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API request timeout (5s)')), 5000)
      );

      const fetchPromise = Promise.all([
        fetch(`${API_BASE}/cases`),
        fetch(`${API_BASE}/accounts?source=neo4j`),
        fetch(`${API_BASE}/transactions`)
      ]);

      const [casesRes, accountsRes, txnRes] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      if (!casesRes.ok || !accountsRes.ok || !txnRes.ok) {
        throw new Error(`API error`);
      }

      const casesData = await casesRes.json();
      const accountsData = await accountsRes.json();
      const txnData = await txnRes.json();

      _cases = casesData.map(normalizeCase);
      _accounts = accountsData.map(normalizeAccount);
      _transactions = txnData.map(normalizeTransaction);
      _usingAPI = true;
      _isLoaded = true;

      console.log('✅ Data loaded from Neo4j');
      console.log(`   📊 ${_cases.length} cases, ${_accounts.length} accounts, ${_transactions.length} transactions`);
      return true;
    } catch (err) {
      console.warn('⚠️ API unavailable, using fallback data:', err.message);
      _cases = fallbackCases.map(normalizeCase);
      _accounts = fallbackAccounts.map(normalizeAccount);
      _transactions = fallbackTransactions.map(normalizeTransaction);
      _usingAPI = false;
      _isLoaded = true;
      return false;
    }
  }

  // ── PUBLIC API (backward-compatible) ────────────────────
  function getCases() { return _cases; }

  function getAccounts(caseFilter) {
    if (!caseFilter || caseFilter === 'ALL') return _accounts;
    return _accounts.filter(a => a.caseId === caseFilter);
  }

  function getTransactions(caseFilter) {
    if (!caseFilter || caseFilter === 'ALL') return _transactions;
    if (caseFilter === 'CROSS') return _transactions.filter(t => t.caseId === 'CROSS');
    return _transactions.filter(t => t.caseId === caseFilter || t.caseId === 'CROSS');
  }

  function getAccountById(id) { return _accounts.find(a => a.id === id); }
  function getTransactionById(id) { return _transactions.find(t => t.id === id); }

  function formatCurrency(amount) {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
    return '₹' + amount;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function isUsingAPI() { return _usingAPI; }
  function isLoaded() { return _isLoaded; }

  return {
    loadFromAPI,
    getCases,
    getAccounts,
    getTransactions,
    getAccountById,
    getTransactionById,
    formatCurrency,
    formatDate,
    isUsingAPI,
    isLoaded
  };
})();
