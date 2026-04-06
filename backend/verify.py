"""
Simple verification script to show what's in Neo4j
"""
import requests
import json

print("\n" + "="*60)
print("BANK LAYERING DETECTION SYSTEM - VERIFICATION")
print("="*60)

# Test 1: API Health
print("\n1. API SERVER STATUS")
print("-" * 60)
try:
    r = requests.get('http://localhost:8000/health')
    print("✓ API is responding")
    print(f"  Status: {r.json()['status']}")
    print(f"  Neo4j: {r.json()['neo4j']}")
except Exception as e:
    print(f"✗ API not responding: {e}")
    exit(1)

# Test 2: Database Stats
print("\n2. DATABASE STATISTICS")
print("-" * 60)
r = requests.get('http://localhost:8000/api/stats')
stats = r.json()
print(f"✓ Total Accounts in Neo4j: {stats['accounts']}")
print(f"✓ Total Transactions in Neo4j: {stats['transactions']}")

# Test 3: All Accounts
print("\n3. ACCOUNTS LOADED IN NEO4J")
print("-" * 60)
r = requests.get('http://localhost:8000/api/accounts')
accounts = r.json()['accounts']
print(f"✓ Found {len(accounts)} accounts:")
for acc in accounts:
    print(f"   - {acc}")

# Test 4: Account Details (ACC001)
print("\n4. EXAMPLE: ACCOUNT ACC001 DETAILS")
print("-" * 60)
r = requests.get('http://localhost:8000/api/account/ACC001')
detail = r.json()
print(f"Account ID: {detail['account_id']}")
print(f"Sent money to: {detail['recipient_accounts']}")
print(f"Received money from: {detail['sender_accounts']}")
print(f"Outgoing transactions: {detail['outgoing_transactions']}")
print(f"Incoming transactions: {detail['incoming_transactions']}")

# Test 5: Pattern Detection - Rapid Transactions
print("\n5. PATTERN DETECTION - RAPID TRANSACTIONS (Query 2)")
print("-" * 60)
r = requests.get('http://localhost:8000/api/patterns/rapid')
patterns = r.json()
print(f"✓ Found {patterns['count']} suspicious rapid transaction patterns:")
if patterns['count'] > 0:
    for p in patterns['data']:
        print(f"\n  Account: {p['account']}")
        print(f"  Made {p['transaction_count']} rapid transactions to:")
        for txn in p['transactions']:
            print(f"    → {txn['recipient']}: ${txn['amount']} on {txn['timestamp']}")

# Test 6: Pattern Detection - Circular
print("\n6. PATTERN DETECTION - CIRCULAR PATTERNS (Query 1)")
print("-" * 60)
r = requests.get('http://localhost:8000/api/patterns/circular')
patterns = r.json()
print(f"✓ Found {patterns['count']} circular transaction patterns")
if patterns['count'] == 0:
    print("  (No layering patterns detected in sample data)")

print("\n" + "="*60)
print("✓ ALL SYSTEMS WORKING - NEO4J IS LOADED AND RUNNING")
print("="*60 + "\n")
