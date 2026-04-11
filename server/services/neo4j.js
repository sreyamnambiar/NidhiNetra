// ============================================================
// Neo4j Service
// Handles Neo4j graph database connections and queries
// ============================================================
const neo4j = require('neo4j-driver');
require('dotenv').config();

let driver = null;
let connected = false;

// Initialize Neo4j driver
function initDriver() {
  if (!driver) {
    try {
      driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
        { 
          maxConnectionLifetime: 3 * 60 * 60 * 1000,
          connectionAcquisitionTimeout: 5000,
          maxConnectionPoolSize: 10
        }
      );
      console.log('🔌 Neo4j driver initialized');
      
      // Test connection in background (non-blocking)
      setImmediate(async () => {
        try {
          const session = driver.session();
          const result = await session.run('RETURN 1');
          await session.close();
          connected = true;
          console.log('✅ Neo4j connection verified');
        } catch (err) {
          console.warn('⚠️  Neo4j connection test failed:', err.message);
          connected = false;
        }
      });
    } catch (err) {
      console.error('❌ Neo4j driver init failed:', err.message);
      connected = false;
    }
  }
  return driver;
}

// Get Neo4j driver instance
function getDriver() {
  if (!driver) {
    initDriver();
  }
  return driver;
}

// Helper: Run query with timeout
async function runQueryWithTimeout(queryFn, timeoutMs = 3000) {
  return Promise.race([
    queryFn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Neo4j query timeout')), timeoutMs)
    )
  ]);
}

// Query: Get all accounts from Neo4j
async function getAccountsFromNeo4j(caseId = null) {
  const session = getDriver().session();
  try {
    console.log('🔍 Querying Neo4j for accounts...');
    const result = await runQueryWithTimeout(async () => {
      return await session.run('MATCH (a:Account) RETURN a LIMIT 100;');
    }, 3000);

    const accounts = result.records.map(record => {
      const props = record.get('a').properties;
      const accId = props.accountId || props.id || 'NEO4J_ACC';
      return {
        id: accId,
        accountId: accId,
        holder: props.holder || props.name || accId || 'Unknown Holder',
        bank: props.bank || 'Neo4j Bank',
        ifsc: props.ifsc || 'NEOIFSC00',
        accNo: props.accNo || props.accountNumber || props.account_number || 'N/A',
        phone: props.phone || props.contact || 'N/A',
        email: props.email || 'N/A',
        ip: props.ip || props.ipAddress || 'N/A',
        city: props.city || props.location || 'Unknown',
        caseId: props.caseId || props.case || 'NEO4J',
        type: props.type || 'mule',
        risk: props.risk || props.riskLevel || 'medium',
        source: 'neo4j'
      };
    });
    
    console.log(`✅ Neo4j returned ${accounts.length} accounts`);
    accounts.forEach(a => console.log(`   - ${a.accountId}: ${a.holder} (${a.bank})`));
    return accounts;
  } catch (err) {
    console.warn('⚠️ Neo4j getAccountsFromNeo4j warning:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

// Query: Get circular transaction patterns (money laundering indicator)
async function getCircularPatterns() {
  const session = getDriver().session();
  try {
    const result = await runQueryWithTimeout(async () => {
      return await session.run(`
        MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)-[t2:TRANSACTION]->(c:Account)-[t3:TRANSACTION]->(a)
        WHERE t1.timestamp < t2.timestamp < t3.timestamp
        RETURN a.accountId AS source, b.accountId AS middle, c.accountId AS dest, 
               t1.amount AS amount1, t2.amount AS amount2, t3.amount AS amount3
        LIMIT 20;
      `);
    }, 3000);

    return result.records.map(record => ({
      source: record.get('source'),
      middle: record.get('middle'),
      destination: record.get('dest'),
      flow: [
        { from: record.get('source'), to: record.get('middle'), amount: record.get('amount1') },
        { from: record.get('middle'), to: record.get('dest'), amount: record.get('amount2') },
        { from: record.get('dest'), to: record.get('source'), amount: record.get('amount3') }
      ]
    }));
  } catch (err) {
    console.warn('Neo4j getCircularPatterns warning:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

// Query: Get rapid sequential transactions (structuring indicator)
async function getRapidTransactions() {
  const session = getDriver().session();
  try {
    const result = await runQueryWithTimeout(async () => {
      return await session.run(`
        MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)-[t2:TRANSACTION]->(c:Account)
        WHERE t1.timestamp < t2.timestamp
        RETURN a.accountId AS source, [b.accountId, c.accountId] AS targets, 
               [t1.amount, t2.amount] AS amounts
        LIMIT 20;
      `);
    }, 3000);

    return result.records.map(record => ({
      source: record.get('source'),
      targets: record.get('targets'),
      amounts: record.get('amounts'),
      pattern: 'rapid-sequential'
    }));
  } catch (err) {
    console.warn('Neo4j getRapidTransactions warning:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

// Query: Get high-value transaction networks
async function getHighValueNetworks(threshold = 1000000) {
  const session = getDriver().session();
  try {
    const result = await runQueryWithTimeout(async () => {
      return await session.run(`
        MATCH (a:Account)-[t:TRANSACTION]->(b:Account)
        WHERE t.amount > $threshold
        RETURN a.accountId AS from, b.accountId AS to, t.amount AS amount
        ORDER BY t.amount DESC
        LIMIT 30;
      `, { threshold });
    }, 3000);

    return result.records.map(record => ({
      from: record.get('from'),
      to: record.get('to'),
      amount: record.get('amount').toNumber(),
      pattern: 'high-value'
    }));
  } catch (err) {
    console.warn('Neo4j getHighValueNetworks warning:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

// Query: Get account connections and relationships
async function getAccountRelationships(accountId) {
  const session = getDriver().session();
  try {
    const result = await runQueryWithTimeout(async () => {
      return await session.run(`
        MATCH (a:Account {accountId: $accountId})
        OPTIONAL MATCH (a)-[out:TRANSACTION]->(b)
        OPTIONAL MATCH (c)-[in:TRANSACTION]->(a)
        RETURN a, collect({account: b, transaction: out}) AS outgoing, 
               collect({account: c, transaction: in}) AS incoming
        LIMIT 1;
      `, { accountId });
    }, 3000);

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const account = record.get('a').properties;
    const outgoing = record.get('outgoing')
      .filter(item => item.account !== null)
      .map(item => ({
        to: item.account.properties,
        amount: item.transaction.properties.amount
      }));

    const incoming = record.get('incoming')
      .filter(item => item.account !== null)
      .map(item => ({
        from: item.account.properties,
        amount: item.transaction.properties.amount
      }));

    return { account, outgoing, incoming };
  } catch (err) {
    console.warn('Neo4j getAccountRelationships warning:', err.message);
    return null;
  } finally {
    await session.close();
  }
}

// Seed Neo4j with mock data from frontend
async function seedDatabase() {
  const session = driver.session({ defaultAccessMode: 'WRITE' });
  
  try {
    // Mock data from frontend (exactly as in js/data.js)
    const mockAccounts = [
      { accountId: "ACC001", holder: "Rajesh Malhotra", bank: "State Bank of India", ifsc: "SBIN0001234", accNo: "30281047562", phone: "+91-9876543210", email: "rajesh.m@email.com", ip: "103.45.67.89", city: "Pune", caseId: "CASE-2024-001", type: "source", risk: "high" },
      { accountId: "ACC002", holder: "Priya Sharma", bank: "HDFC Bank", ifsc: "HDFC0002345", accNo: "20174536281", phone: "+91-9123456780", email: "priya.s@email.com", ip: "103.45.67.89", city: "Pune", caseId: "CASE-2024-001", type: "mule", risk: "critical" },
      { accountId: "ACC003", holder: "Vikram Singh", bank: "ICICI Bank", ifsc: "ICIC0003456", accNo: "10293847561", phone: "+91-8765432190", email: "vikram.s@mail.com", ip: "182.73.12.45", city: "Delhi", caseId: "CASE-2024-001", type: "mule", risk: "high" },
      { accountId: "ACC004", holder: "Anjali Desai", bank: "Axis Bank", ifsc: "UTIB0004567", accNo: "91728364501", phone: "+91-7654321098", email: "anjali.d@webmail.com", ip: "49.36.89.112", city: "Mumbai", caseId: "CASE-2024-001", type: "mule", risk: "medium" },
      { accountId: "ACC005", holder: "Karan Patel", bank: "Kotak Mahindra", ifsc: "KKBK0005678", accNo: "40582736190", phone: "+91-6543210987", email: "karan.p@inbox.com", ip: "157.48.23.67", city: "Ahmedabad", caseId: "CASE-2024-001", type: "destination", risk: "high" },
      { accountId: "ACC006", holder: "Sneha Iyer", bank: "Punjab National Bank", ifsc: "PUNB0006789", accNo: "60817253940", phone: "+91-9988776655", email: "sneha.i@email.com", ip: "122.176.34.78", city: "Bangalore", caseId: "CASE-2024-001", type: "mule", risk: "medium" },
      { accountId: "ACC007", holder: "Rohan Mehta", bank: "Bank of Baroda", ifsc: "BARB0007890", accNo: "70249183650", phone: "+91-8877665544", email: "rohan.m@mail.com", ip: "106.51.78.92", city: "Pune", caseId: "CASE-2024-001", type: "destination", risk: "low" },
      { accountId: "ACC008", holder: "Deepak Kumar", bank: "Indian Bank", ifsc: "IDIB0008901", accNo: "80351926470", phone: "+91-9556443322", email: "deepak.k@webmail.com", ip: "59.92.45.167", city: "Chennai", caseId: "CASE-2024-002", type: "source", risk: "critical" },
      { accountId: "ACC009", holder: "Meera Nair", bank: "Canara Bank", ifsc: "CNRB0009012", accNo: "90482617350", phone: "+91-9445332211", email: "meera.n@email.com", ip: "117.239.56.89", city: "Chennai", caseId: "CASE-2024-002", type: "mule", risk: "high" },
      { accountId: "ACC010", holder: "Suresh Reddy", bank: "Union Bank", ifsc: "UBIN0010123", accNo: "11593748260", phone: "+91-8334221100", email: "suresh.r@inbox.com", ip: "223.186.78.34", city: "Hyderabad", caseId: "CASE-2024-002", type: "mule", risk: "high" },
      { accountId: "ACC011", holder: "Lakshmi Venkatesh", bank: "Federal Bank", ifsc: "FDRL0011234", accNo: "21604859170", phone: "+91-7223110099", email: "lakshmi.v@mail.com", ip: "59.92.45.167", city: "Coimbatore", caseId: "CASE-2024-002", type: "mule", risk: "medium" },
      { accountId: "ACC012", holder: "Arjun Ramamurthy", bank: "South Indian Bank", ifsc: "SIBL0012345", accNo: "31715960280", phone: "+91-6112009988", email: "arjun.r@webmail.com", ip: "136.232.12.56", city: "Madurai", caseId: "CASE-2024-002", type: "destination", risk: "high" },
      { accountId: "ACC013", holder: "Divya Sundaram", bank: "Karur Vysya Bank", ifsc: "KVBL0013456", accNo: "41826071390", phone: "+91-9876543210", email: "divya.s@email.com", ip: "49.204.34.78", city: "Salem", caseId: "CASE-2024-002", type: "destination", risk: "medium" },
      { accountId: "ACC014", holder: "Mohammed Iqbal", bank: "Yes Bank", ifsc: "YESB0014567", accNo: "51937182400", phone: "+91-9667788990", email: "m.iqbal@mail.com", ip: "103.45.67.89", city: "Mumbai", caseId: "CASE-2024-003", type: "source", risk: "critical" },
      { accountId: "ACC015", holder: "Fatima Sheikh", bank: "RBL Bank", ifsc: "RATN0015678", accNo: "62048293510", phone: "+91-8556677889", email: "fatima.s@webmail.com", ip: "182.73.12.45", city: "Mumbai", caseId: "CASE-2024-003", type: "mule", risk: "high" },
      { accountId: "ACC016", holder: "Amit Joshi", bank: "IndusInd Bank", ifsc: "INDB0016789", accNo: "72159304620", phone: "+91-7445566778", email: "amit.j@inbox.com", ip: "223.186.78.34", city: "Thane", caseId: "CASE-2024-003", type: "mule", risk: "high" },
      { accountId: "ACC017", holder: "Sunita Agarwal", bank: "Bandhan Bank", ifsc: "BDBL0017890", accNo: "82260415730", phone: "+91-6334455667", email: "sunita.a@email.com", ip: "117.239.56.89", city: "Kolkata", caseId: "CASE-2024-003", type: "mule", risk: "medium" },
      { accountId: "ACC018", holder: "Ravi Tiwari", bank: "Central Bank", ifsc: "CBIN0018901", accNo: "92371526840", phone: "+91-9988776655", email: "ravi.t@mail.com", ip: "106.51.78.92", city: "Lucknow", caseId: "CASE-2024-003", type: "destination", risk: "high" },
      { accountId: "ACC019", holder: "Kavitha Murugan", bank: "IOB", ifsc: "IOBA0019012", accNo: "13482637950", phone: "+91-8877665544", email: "kavitha.m@webmail.com", ip: "157.48.23.67", city: "Chennai", caseId: "CASE-2024-003", type: "destination", risk: "medium" },
      { accountId: "ACC020", holder: "Nikhil Deshmukh", bank: "Bank of Maharashtra", ifsc: "MAHB0020123", accNo: "23593748060", phone: "+91-7766554433", email: "nikhil.d@inbox.com", ip: "49.36.89.112", city: "Nagpur", caseId: "CASE-2024-003", type: "mule", risk: "low" }
    ];

    const mockTransactions = [
      { txnId: "TXN001", from: "ACC001", to: "ACC002", amount: 5000000, date: "2024-03-15T09:23:00", method: "NEFT", note: "Invoice payment" },
      { txnId: "TXN002", from: "ACC002", to: "ACC003", amount: 2400000, date: "2024-03-15T09:45:00", method: "RTGS", note: "Stock purchase" },
      { txnId: "TXN003", from: "ACC002", to: "ACC004", amount: 2500000, date: "2024-03-15T10:02:00", method: "NEFT", note: "Property advance" },
      { txnId: "TXN004", from: "ACC003", to: "ACC005", amount: 1200000, date: "2024-03-15T11:30:00", method: "UPI", note: "Consultancy fees" },
      { txnId: "TXN005", from: "ACC003", to: "ACC006", amount: 1100000, date: "2024-03-15T11:45:00", method: "IMPS", note: "Material supply" },
      { txnId: "TXN006", from: "ACC004", to: "ACC005", amount: 1800000, date: "2024-03-15T14:20:00", method: "NEFT", note: "Equipment lease" },
      { txnId: "TXN007", from: "ACC006", to: "ACC007", amount: 900000, date: "2024-03-16T08:15:00", method: "RTGS", note: "Service charges" },
      { txnId: "TXN008", from: "ACC005", to: "ACC001", amount: 500000, date: "2024-03-16T10:00:00", method: "UPI", note: "Refund" },
      { txnId: "TXN009", from: "ACC004", to: "ACC007", amount: 600000, date: "2024-03-16T12:30:00", method: "NEFT", note: "Maintenance" },
      { txnId: "TXN010", from: "ACC008", to: "ACC009", amount: 8000000, date: "2024-04-02T06:30:00", method: "RTGS", note: "Loan disbursement" },
      { txnId: "TXN011", from: "ACC009", to: "ACC010", amount: 3500000, date: "2024-04-02T06:42:00", method: "NEFT", note: "Investment transfer" },
      { txnId: "TXN012", from: "ACC009", to: "ACC011", amount: 4200000, date: "2024-04-02T06:48:00", method: "RTGS", note: "Business capital" },
      { txnId: "TXN013", from: "ACC010", to: "ACC012", amount: 1500000, date: "2024-04-02T07:05:00", method: "IMPS", note: "Share purchase" },
      { txnId: "TXN014", from: "ACC010", to: "ACC013", amount: 1800000, date: "2024-04-02T07:15:00", method: "NEFT", note: "Gold purchase" },
      { txnId: "TXN015", from: "ACC011", to: "ACC012", amount: 2000000, date: "2024-04-02T07:30:00", method: "RTGS", note: "Property deposit" },
      { txnId: "TXN016", from: "ACC011", to: "ACC008", amount: 1500000, date: "2024-04-02T08:00:00", method: "NEFT", note: "Loan repayment" },
      { txnId: "TXN017", from: "ACC012", to: "ACC013", amount: 800000, date: "2024-04-02T09:20:00", method: "UPI", note: "Commission" },
      { txnId: "TXN018", from: "ACC013", to: "ACC009", amount: 600000, date: "2024-04-02T10:45:00", method: "IMPS", note: "Rebate" },
      { txnId: "TXN019", from: "ACC014", to: "ACC015", amount: 12000000, date: "2024-05-10T22:15:00", method: "RTGS", note: "Export payment" },
      { txnId: "TXN020", from: "ACC015", to: "ACC016", amount: 5000000, date: "2024-05-10T22:28:00", method: "NEFT", note: "Cargo fees" },
      { txnId: "TXN021", from: "ACC015", to: "ACC017", amount: 6500000, date: "2024-05-10T22:35:00", method: "RTGS", note: "Textile import" },
      { txnId: "TXN022", from: "ACC016", to: "ACC018", amount: 2500000, date: "2024-05-10T23:10:00", method: "IMPS", note: "Warehouse rent" },
      { txnId: "TXN023", from: "ACC016", to: "ACC019", amount: 2200000, date: "2024-05-10T23:25:00", method: "NEFT", note: "Transport charges" },
      { txnId: "TXN024", from: "ACC017", to: "ACC018", amount: 3000000, date: "2024-05-11T00:05:00", method: "RTGS", note: "Labour contract" },
      { txnId: "TXN025", from: "ACC017", to: "ACC020", amount: 3200000, date: "2024-05-11T00:18:00", method: "NEFT", note: "Raw materials" },
      { txnId: "TXN026", from: "ACC018", to: "ACC014", amount: 1000000, date: "2024-05-11T02:30:00", method: "UPI", note: "Advance return" },
      { txnId: "TXN027", from: "ACC020", to: "ACC019", amount: 1500000, date: "2024-05-11T03:00:00", method: "IMPS", note: "Commission" },
      { txnId: "TXN028", from: "ACC019", to: "ACC014", amount: 800000, date: "2024-05-11T04:15:00", method: "NEFT", note: "Rebate" },
      { txnId: "TXN029", from: "ACC005", to: "ACC013", amount: 750000, date: "2024-04-10T15:30:00", method: "NEFT", note: "Consulting fees" },
      { txnId: "TXN030", from: "ACC012", to: "ACC018", amount: 1200000, date: "2024-05-15T17:45:00", method: "RTGS", note: "Business transfer" },
      { txnId: "TXN031", from: "ACC007", to: "ACC015", amount: 450000, date: "2024-05-20T11:00:00", method: "IMPS", note: "Payment" },
      { txnId: "TXN032", from: "ACC018", to: "ACC002", amount: 900000, date: "2024-05-22T20:30:00", method: "NEFT", note: "Settlement" },
      { txnId: "TXN033", from: "ACC002", to: "ACC006", amount: 300000, date: "2024-03-15T09:50:00", method: "UPI", note: "Quick transfer 1" },
      { txnId: "TXN034", from: "ACC002", to: "ACC007", amount: 250000, date: "2024-03-15T09:52:00", method: "UPI", note: "Quick transfer 2" },
      { txnId: "TXN035", from: "ACC002", to: "ACC003", amount: 200000, date: "2024-03-15T09:54:00", method: "UPI", note: "Quick transfer 3" },
      { txnId: "TXN036", from: "ACC008", to: "ACC012", amount: 400000, date: "2024-04-03T10:00:00", method: "NEFT", note: "Direct deposit" },
      { txnId: "TXN037", from: "ACC011", to: "ACC013", amount: 350000, date: "2024-04-03T10:30:00", method: "UPI", note: "Split payment" },
      { txnId: "TXN038", from: "ACC014", to: "ACC020", amount: 800000, date: "2024-05-12T14:00:00", method: "NEFT", note: "Misc transfer" },
      { txnId: "TXN039", from: "ACC020", to: "ACC018", amount: 600000, date: "2024-05-12T14:30:00", method: "IMPS", note: "Forwarding" },
      { txnId: "TXN040", from: "ACC019", to: "ACC017", amount: 400000, date: "2024-05-13T09:00:00", method: "NEFT", note: "Return flow" }
    ];

    // Clear existing data
    console.log('🗑️  Clearing Neo4j database...');
    await session.run('MATCH (n) DETACH DELETE n');

    // Create accounts
    console.log('📦 Creating Account nodes...');
    let accountCount = 0;
    for (const account of mockAccounts) {
      await session.run(
        `CREATE (a:Account {
          accountId: $accountId,
          holder: $holder,
          bank: $bank,
          ifsc: $ifsc,
          accNo: $accNo,
          phone: $phone,
          email: $email,
          ip: $ip,
          city: $city,
          caseId: $caseId,
          type: $type,
          risk: $risk
        })`,
        account
      );
      accountCount++;
    }
    console.log(`✅ ${accountCount} accounts created`);

    // Create transactions
    console.log('📦 Creating Transaction relationships...');
    let txnCount = 0;
    for (const txn of mockTransactions) {
      await session.run(
        `MATCH (from:Account {accountId: $from})
         MATCH (to:Account {accountId: $to})
         CREATE (from)-[t:TRANSACTION {
           txnId: $txnId,
           amount: $amount,
           date: $date,
           method: $method,
           note: $note
         }]->(to)`,
        txn
      );
      txnCount++;
    }
    console.log(`✅ ${txnCount} transactions created`);
    
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await session.close();
  }
}

// Close driver connection
async function closeDriver() {
  if (driver) {
    try {
      await driver.close();
    } catch (err) {
      console.error('Error closing Neo4j driver:', err.message);
    }
    driver = null;
    connected = false;
  }
}

module.exports = {
  initDriver,
  getDriver,
  getAccountsFromNeo4j,
  getCircularPatterns,
  getRapidTransactions,
  getHighValueNetworks,
  getAccountRelationships,
  closeDriver,
  seedDatabase,
  isConnected: () => connected
};
