# Bank Layering Detection System

A full-stack application for analyzing financial transactions and detecting money laundering patterns using Neo4j graph database.

## Project Structure

```
bank_layering/
├── backend/              # Person 1: Backend - Graph DB (Neo4j + FastAPI)
│   ├── main.py          # FastAPI REST API endpoints
│   ├── ingest.py        # CSV data ingestion script
│   ├── cypher_queries.py # Pattern detection queries
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variables template
├── data/                 # Sample transaction data
│   └── sample_transactions.csv
└── frontend/            # Person 2: Frontend - Visualizations
```

## Person 1: Backend Setup

### Prerequisites
- Python 3.8+
- Neo4j AuraDB free tier account (https://neo4j.com/cloud/aura-free/)

### 1. Neo4j AuraDB Setup
1. Go to https://neo4j.com/cloud/aura-free/
2. Create a free account
3. Create a new database instance
4. Copy your connection URI and credentials

### 2. Environment Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with your Neo4j credentials
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Ingest Data
```bash
python ingest.py
```

This will:
- Create Account nodes in Neo4j
- Create TRANSACTION relationships with amount/timestamp properties
- Load sample transaction data from CSV

### 5. Start FastAPI Server
```bash
python main.py
# Server runs at http://localhost:8000
```

## API Endpoints

### Health & Stats
- `GET /` - API information
- `GET /health` - Health check
- `GET /api/stats` - Database statistics
- `GET /api/accounts` - List all accounts

### Pattern Detection Endpoints
- `GET /api/patterns/circular` - **Query 1**: Detect circular transaction patterns (money layering)
- `GET /api/patterns/rapid` - **Query 2**: Detect rapid sequential transactions (structuring)
- `GET /api/patterns/high-value` - Bonus: High-value transaction networks
- `GET /api/account/{account_id}` - Account details and connections

## Pattern Detection Queries

### Query 1: Circular Transaction Patterns
Detects cycles in transaction flows that indicate money laundering through circular transfers.

```cypher
MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)-[t2:TRANSACTION]->(c:Account)-[t3:TRANSACTION]->(a)
WHERE t1.timestamp < t2.timestamp < t3.timestamp
```

### Query 2: Rapid Sequential Transactions
Identifies structuring attempts through multiple rapid transactions.

```cypher
MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)
WITH a, count(t1) as outgoing_count
WHERE outgoing_count >= 2
```

## Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Get statistics
curl http://localhost:8000/api/stats

# Detect circular patterns
curl http://localhost:8000/api/patterns/circular

# Detect rapid transactions
curl http://localhost:8000/api/patterns/rapid

# Get account details
curl http://localhost:8000/api/account/ACC001
```

## Database Schema

### Nodes
- **Account**: Represents a bank account
  - Properties: `account_id` (unique), `created_at`

### Relationships
- **TRANSACTION**: Money transfer from one account to another
  - Properties: `amount`, `timestamp`, `type` (transfer/deposit/withdrawal)

## Features Implemented (Person 1)

✓ Neo4j AuraDB integration  
✓ Account node creation  
✓ Transaction edge creation with amount/timestamp  
✓ CSV data ingestion script  
✓ Pattern detection Query 1: Circular transactions  
✓ Pattern detection Query 2: Rapid transactions  
✓ FastAPI REST API with endpoints  
✓ Health checks and statistics  

## Next Steps (Person 2: Frontend)

- Create Vite + React frontend
- Integrate with Neo4j Bloom or custom visualization
- Build UI for pattern visualization
- Add data visualization charts
