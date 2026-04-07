# NidhiNetra — Intelligent Financial Trail Detection System

> *From scattered transactions to connected truth.*

![Red Shield Hackathon 2026](https://img.shields.io/badge/Red%20Shield%20Hackathon-2026-red?style=flat-square)
![Category](https://img.shields.io/badge/Category-Software-blue?style=flat-square)
![Team](https://img.shields.io/badge/Team-CyberCiphers-purple?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## What is NidhiNetra?

NidhiNetra is a graph-based financial intelligence system that converts raw bank transactions into a live, interactive network of accounts and fund flows. It enables law enforcement investigators to trace complex money laundering trails — including multi-hop chains, circular transfers, and fan-out splitting — through visual spider maps.

Traditional tools see transactions as isolated rows in a spreadsheet. NidhiNetra sees the entire network — and flags the hidden patterns within it.

---

## The Problem

Money laundering hides in the **Layering** stage — where criminals move money across multiple accounts, cities, and banks to bury the origin. Existing systems fail to:

- Track full multi-hop transaction paths across institutions
- Detect hidden links between accounts in different cases
- Visualise how money actually flows through a network

A ₹1 crore transfer routed through 5 accounts across Chennai, Mumbai, Pune, Hyderabad, and Bengaluru looks like 5 unrelated normal payments. NidhiNetra connects them into one trail — in under 3 seconds.

---

## Key Features

### 1. Graph-Based Layer Extraction
Reconstructs full multi-hop transaction chains (A → B → C → D → E) instead of showing isolated rows. Built on Neo4j — accounts as nodes, transactions as directed weighted edges.

### 2. Cross-Case Entity Resolution
Links accounts **across completely separate investigations** when they share an identifier — same IP address, phone number, email, or device fingerprint. The hidden network becomes visible automatically.

### 3. Cycle & Flow Pattern Detection
Automatically detects:
- **Circular transactions** — money leaving and returning to the same account
- **Fan-out splitting** — one source distributing to many mule accounts simultaneously
- **Velocity flagging** — funds entering and exiting an account within minutes

### 4. Incremental Near-Real-Time Updates
Only affected nodes and paths are recomputed on each new transaction. The graph stays live without a full reprocess — investigators see the trail grow as data arrives.

### 5. Court-Ready Explainable Trails
Produces structured `source → intermediary → destination` export reports with timestamps and amounts — formatted for direct use in chargesheets and legal proceedings.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Graph database | Neo4j AuraDB | Native graph traversal, multi-hop Cypher queries |
| Backend API | Python 3.11 + FastAPI | Async ingestion, REST + GraphQL endpoints |
| Pattern detection | Python + NetworkX | Cycle detection, fan-in/fan-out, velocity scoring |
| Entity resolution | Elasticsearch (Bonsai.io) | Inverted index on shared identifiers across cases |
| Frontend | React 18 + Vite | Component-based investigator dashboard |
| Graph visualisation | Sigma.js + Graphology | Interactive spider maps with zoom, filter, click |
| Charts | Recharts | Timeline and volume analytics |
| Deployment — backend | Render.com | Free tier, auto-deploy from GitHub |
| Deployment — frontend | Vercel | Instant deploy, CDN-hosted |
| Auth | JWT (RBAC) | Investigator / supervisor / admin roles |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Data Sources                      │
│  Bank APIs  │  Case Files (CSV)  │  Manual Entry     │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│         Ingestion & Normalisation Layer              │
│    FastAPI — schema validation, dedup, enrichment    │
└───────────────┬──────────────────────┬───────────────┘
                ↓                      ↓
┌───────────────────────┐  ┌───────────────────────────┐
│   Graph Engine        │↔ │  Pattern Detection Engine  │
│   Neo4j               │  │  Cycle, fan-in/out,        │
│   Accounts = nodes    │  │  velocity scoring          │
│   Transactions = edges│  │                            │
└───────────────────────┘  └───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│           Cross-Case Entity Resolution               │
│   Links accounts via shared IP, phone, email,        │
│   device fingerprint across separate case IDs        │
└───────────────────────────────┬──────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────┐
│           REST + GraphQL API (FastAPI)               │
│   Trail export · Alert webhooks · Search · RBAC      │
└──────────────┬───────────────────────────┬───────────┘
               ↓                           ↓
┌──────────────────────┐     ┌─────────────────────────┐
│  Investigator        │     │  Alerts & Reports        │
│  Dashboard           │     │  Module                  │
│  React + Sigma.js    │     │  PDF export · Audit log  │
│  Spider maps         │     │  Email alerts            │
└──────────────────────┘     └─────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Neo4j AuraDB](https://neo4j.com/cloud/aura/) account

### 1. Clone the repository

```bash
git clone https://github.com/sreyamnambiar/NidhiNetra.git
cd NidhiNetra
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `/backend`:

```env
NEO4J_URI=neo4j+s://<your-aura-instance>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<your-password>
SECRET_KEY=<your-jwt-secret>
```

Run the backend:

```bash
uvicorn main:app --reload
```

API will be available at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 3. Load sample data

```bash
python scripts/seed_data.py
```

This loads 80 synthetic transactions across 15 accounts — including a planted circular chain and a cross-case shared-phone identity link.

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard will open at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/graph` | Returns full node-edge graph for rendering |
| `GET` | `/patterns` | Returns detected suspicious patterns |
| `GET` | `/trail/{account_id}` | Returns full money trail from a given account |
| `GET` | `/cross-case/{identifier}` | Links accounts sharing an IP, phone, or email |
| `POST` | `/ingest` | Upload a CSV of transactions |
| `GET` | `/export/{case_id}` | Download court-ready PDF trail report |

---

## Pattern Detection Logic

### Cycle detection
```cypher
MATCH path = (a:Account)-[:SENT*2..]->(a)
WHERE ALL(r IN relationships(path) WHERE r.timestamp > timestamp() - 86400000)
RETURN path
```

### Fan-out detection
```cypher
MATCH (a:Account)-[:SENT]->(b:Account)
WITH a, COUNT(DISTINCT b) as outDegree
WHERE outDegree >= 5
RETURN a, outDegree ORDER BY outDegree DESC
```

### Velocity flagging
```cypher
MATCH (a:Account)<-[:SENT]-(x)-[:SENT]->(a)
WITH a, MIN(r1.timestamp) as inTime, MAX(r2.timestamp) as outTime
WHERE (outTime - inTime) < 1800000   // 30 minutes in ms
RETURN a
```

---

## Project Structure

```
NidhiNetra/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── routers/
│   │   ├── graph.py            # Graph query endpoints
│   │   ├── patterns.py         # Pattern detection endpoints
│   │   └── ingest.py           # Data ingestion endpoints
│   ├── services/
│   │   ├── neo4j_service.py    # Neo4j connection + Cypher queries
│   │   ├── pattern_engine.py   # Cycle, fan-out, velocity detection
│   │   └── entity_resolver.py  # Cross-case identity linking
│   ├── scripts/
│   │   └── seed_data.py        # Sample transaction data loader
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SpiderMap.jsx   # Sigma.js graph renderer
│   │   │   ├── FilterPanel.jsx # Date, amount, identifier filters
│   │   │   ├── NodeDetail.jsx  # Account detail side panel
│   │   │   └── AlertBadge.jsx  # Flagged pattern indicators
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Main investigator view
│   │   │   └── CaseView.jsx    # Single case deep-dive
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── data/
│   └── sample_transactions.csv # Synthetic demo dataset
└── README.md
```

---

## The Team — CyberCiphers

| Name | Role |
|---|---|
| Sreya M Nambiar | Backend & Graph Database |
| Dhanalakshmi K | Pattern Detection & Data |
| Sonali Sahu | Frontend & Spider Map UI |
| Tamil Iniya P| Integration, Deployment & Pitch |

---

## Feasibility

| Factor | Status | Notes |
|---|---|---|
| Data | Available | Bank transaction logs, IP records, public AML datasets |
| Technology | Mature | Python, Neo4j, NetworkX — all production-grade open source |
| Detection methods | Validated | Graph-based anomaly detection, rule-based pattern analysis |
| Cost | Free tier | Neo4j AuraDB free, Render.com free, Vercel free |
| Legal & ethical | Compliant | Designed for lawful investigation, RBAC, audit logging built-in |

---

## Use Cases

- State Cybercrime Cell investigations into UPI and banking fraud
- Financial Intelligence Unit (FIU-IND) multi-case analysis
- Bank internal compliance teams monitoring large transaction networks
- ED / CBI investigations involving layered fund movement

---

## References

1. FATF (2019). *Guidance on Risk-Based Approach to Money Laundering.* — Global AML framework authority.
2. Sparrow, M. K. (2000). *The Regulatory Craft: Controlling Risks, Solving Problems, and Managing Compliance.*
3. Weber, M., & Sari, V. L. (2020). *Anti-Money Laundering in the Banking Sector.* — Transaction monitoring and detection techniques.
4. Hagberg, A., Swart, P., & Schult, D. (2008). *Exploring Network Structure using NetworkX.* — Foundation for graph-based analysis.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built at Red Shield Hackathon 2026 · Team CyberCiphers*
