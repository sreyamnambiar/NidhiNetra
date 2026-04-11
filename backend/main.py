"""
FastAPI REST API for Financial Transaction Pattern Detection
Exposes Neo4j graph patterns and analysis endpoints
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
from cypher_queries import CypherQueries
from criminal_records import CRIMINAL_RECORDS

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Bank Layering Detection API",
    description="RESTful API for detecting financial transaction patterns and money laundering indicators",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change to specific domains in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Neo4j driver
driver = None

class TransactionPattern(BaseModel):
    """Response model for transaction patterns"""
    pattern_type: str
    accounts_involved: list
    details: dict

class PatternResponse(BaseModel):
    """Response model for pattern detection results"""
    success: bool
    pattern_type: str
    count: int
    data: list

@app.on_event("startup")
async def startup():
    """Initialize Neo4j connection on startup"""
    global driver
    try:
        uri = os.getenv("NEO4J_URI")
        username = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")
        
        driver = GraphDatabase.driver(uri, auth=(username, password))
        # Verify connection
        driver.verify_connectivity()
        print("✓ Connected to Neo4j")
    except Exception as e:
        print(f"✗ Failed to connect to Neo4j: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    """Close Neo4j connection on shutdown"""
    if driver:
        driver.close()
        print("✓ Disconnected from Neo4j")

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "Bank Layering Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "circular_patterns": "/api/patterns/circular",
            "rapid_transactions": "/api/patterns/rapid",
            "high_value_network": "/api/patterns/high-value",
            "accounts": "/api/accounts",
            "stats": "/api/stats"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        with driver.session() as session:
            session.run("RETURN 1")
        return {"status": "healthy", "neo4j": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {e}")

@app.get("/api/stats")
async def get_stats():
    """Get overall statistics about the graph"""
    try:
        with driver.session() as session:
            account_count = session.run("MATCH (a:Account) RETURN count(a) as count").single()["count"]
            transaction_count = session.run("MATCH (a)-[t:TRANSACTION]->(b) RETURN count(t) as count").single()["count"]
            
            return {
                "accounts": account_count,
                "transactions": transaction_count,
                "status": "ok"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/accounts-with-details")
async def get_accounts_with_details():
    """Get all accounts with their details (names, IP, Aadhar, etc.) and risk scores"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (a:Account) 
                RETURN 
                    a.account_id as account_id,
                    a.account_holder_name as name,
                    a.ip_address as ip,
                    a.phone_number as phone,
                    a.aadhar_number as aadhar,
                    a.email as email,
                    a.location as location
                ORDER BY a.account_id
            """)
            accounts = result.data()
            
            # Add risk scores and criminal info
            for account in accounts:
                risk_score = 0
                is_criminal = account['account_id'] in CRIMINAL_RECORDS
                
                if is_criminal:
                    risk_score = 100  # Critical - known criminal
                else:
                    # Check for suspicious patterns
                    same_ip_result = session.run("""
                        MATCH (a:Account {account_id: $account_id})-[:SAME_IP_ADDRESS]-(b:Account)
                        RETURN count(b) as count
                    """, account_id=account['account_id']).single()
                    
                    if same_ip_result and same_ip_result['count'] > 0:
                        risk_score += 30  # Suspicious - same IP as other accounts
                    
                    # Check for circular patterns
                    circular_result = session.run("""
                        MATCH (a:Account {account_id: $account_id})-[:TRANSACTION]->(b:Account)-[:TRANSACTION]->(c:Account)-[:TRANSACTION]->(a)
                        RETURN count(*) as count
                    """, account_id=account['account_id']).single()
                    
                    if circular_result and circular_result['count'] > 0:
                        risk_score += 40  # Suspicious - involved in circular patterns
                    
                    # Check for high-value transfers
                    high_value_result = session.run("""
                        MATCH (a:Account {account_id: $account_id})-[t:TRANSACTION]-(b:Account)
                        WHERE t.amount > 30000
                        RETURN count(t) as count
                    """, account_id=account['account_id']).single()
                    
                    if high_value_result and high_value_result['count'] > 0:
                        risk_score += 15  # Medium - high-value transfers
                
                # Cap risk score at 100
                account['risk_score'] = min(risk_score, 100)
                account['is_criminal'] = is_criminal
            
            return {
                "count": len(accounts),
                "accounts": accounts
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/patterns/circular", response_model=PatternResponse)
async def detect_circular_patterns():
    """
    Query 1: Detect Circular Transaction Patterns (Money Layering)
    
    Identifies cycles in transaction graph where money flows in circles,
    potentially indicating money laundering attempts.
    
    Returns accounts involved in circular patterns and transaction amounts.
    """
    try:
        with driver.session() as session:
            patterns = CypherQueries.get_circular_patterns(session)
            
            return PatternResponse(
                success=True,
                pattern_type="circular_transaction_patterns",
                count=len(patterns),
                data=patterns
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/patterns/rapid", response_model=PatternResponse)
async def detect_rapid_transactions():
    """
    Query 2: Detect Rapid Sequential Transactions (Structuring)
    
    Identifies accounts with multiple rapid transactions, which could indicate
    structuring attempts (breaking large amounts into smaller ones).
    
    Returns account details and transaction sequences.
    """
    try:
        with driver.session() as session:
            patterns = CypherQueries.get_rapid_transactions(session)
            
            return PatternResponse(
                success=True,
                pattern_type="rapid_sequential_transactions",
                count=len(patterns),
                data=patterns
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/patterns/high-value")
async def detect_high_value_network():
    """
    Bonus Query: Detect High-Value Transaction Networks
    
    Identifies accounts involved in high-value transactions (>1000).
    
    Returns transaction networks for high-value transfers.
    """
    try:
        with driver.session() as session:
            patterns = CypherQueries.get_high_value_network(session)
            
            return PatternResponse(
                success=True,
                pattern_type="high_value_network",
                count=len(patterns),
                data=patterns
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/account/{account_id}")
async def get_account_details(account_id: str):
    """Get details about a specific account"""
    try:
        with driver.session() as session:
            # Get account info and transactions
            result = session.run(
                """
                MATCH (a:Account {account_id: $account_id})
                OPTIONAL MATCH (a)-[t:TRANSACTION]->(b)
                OPTIONAL MATCH (c)-[t2:TRANSACTION]->(a)
                RETURN 
                    a.account_id as account_id,
                    count(DISTINCT t) as outgoing_transactions,
                    count(DISTINCT t2) as incoming_transactions,
                    collect(DISTINCT b.account_id) as recipients,
                    collect(DISTINCT c.account_id) as senders
                """,
                account_id=account_id
            ).single()
            
            if result is None:
                raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
            
            return {
                "account_id": result["account_id"],
                "outgoing_transactions": result["outgoing_transactions"],
                "incoming_transactions": result["incoming_transactions"],
                "recipient_accounts": result["recipients"],
                "sender_accounts": result["senders"]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/criminals/same-ip-network")
async def get_same_ip_network():
    """
    **CRITICAL ALERT ENDPOINT**
    
    Identifies accounts controlled by the SAME criminal.
    Accounts with same IP address are highly likely to be operated by same person/group.
    """
    try:
        with driver.session() as session:
            patterns = CypherQueries.get_same_ip_network(session)
            return {
                "alert_type": "SAME_IP_NETWORK",
                "severity": "CRITICAL" if len(patterns) > 0 else "LOW",
                "count": len(patterns),
                "message": f"Found {len(patterns)} accounts with same IP addresses - likely same criminal",
                "data": patterns
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/criminals/connected-accounts")
async def get_connected_accounts():
    """
    Find accounts connected by:
    - Same Aadhar number
    - Same phone number  
    - Same email
    
    Indicates accounts likely controlled by same person/criminal group.
    """
    try:
        with driver.session() as session:
            patterns = CypherQueries.get_connected_accounts(session)
            return {
                "alert_type": "CONNECTED_ACCOUNTS",
                "count": len(patterns),
                "message": f"Found {len(patterns)} account connections (Aadhar/Phone/Email)",
                "data": patterns
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/money-trail/{source_account}/{destination_account}")
async def get_money_trail(source_account: str, destination_account: str):
    """
    **SPIDER MAP ENDPOINT**
    
    Find the complete money trail (all paths) between two accounts.
    Shows how money moved through intermediaries.
    
    Example: /api/money-trail/ACC001/ACC009
    Shows all ways money traveled from ACC001 to ACC009
    """
    try:
        with driver.session() as session:
            paths = CypherQueries.get_money_trail(session, source_account, destination_account)
            if not paths:
                return {
                    "source": source_account,
                    "destination": destination_account,
                    "message": "No transaction path found between these accounts",
                    "paths": []
                }
            
            return {
                "source": source_account,
                "destination": destination_account,
                "total_paths": len(paths),
                "message": f"Found {len(paths)} money trail(s) from {source_account} to {destination_account}",
                "paths": paths
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/account/{account_id}/spider-map")
async def get_account_spider_map(account_id: str):
    """
    **SPIDER MAP / NETWORK VISUALIZATION**
    
    Complete network map for an account showing:
    - All outgoing transactions (money sent)
    - All incoming transactions (money received)
    - All related accounts (same IP/Aadhar/Phone/Email)
    
    This is the VISUAL representation for investigators to see the criminal network.
    """
    try:
        with driver.session() as session:
            result = CypherQueries.get_account_network_spider_map(session, account_id)
            
            if result is None:
                raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
            
            return {
                "account_id": account_id,
                "account_holder": result.get("account_holder"),
                "ip_address": result.get("ip_address"),
                "outgoing_transactions": result.get("outgoing"),
                "incoming_transactions": result.get("incoming"),
                "same_ip_accounts": result.get("same_ip_accounts"),
                "message": "Complete network map for account - use to visualize criminal connections"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/criminal-record/{account_id}")
async def get_criminal_record(account_id: str):
    """
    Get criminal history and past convictions for an account
    Shows mugshot, charges, convictions, and risk level
    """
    try:
        # Check if this is a known criminal account
        if account_id in CRIMINAL_RECORDS:
            record = CRIMINAL_RECORDS[account_id]
            return {
                "account_id": account_id,
                "has_record": True,
                "criminal_details": record
            }
        else:
            # Check if it's a fraud-related account
            with driver.session() as session:
                result = session.run("""
                    MATCH (a:Account {account_id: $account_id})
                    RETURN a.account_holder_name as name
                """, account_id=account_id).single()
                
                if result:
                    return {
                        "account_id": account_id,
                        "has_record": False,
                        "message": f"No criminal record found for {result['name']}"
                    }
                else:
                    raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

