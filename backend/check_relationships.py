from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
import json

load_dotenv()
driver = GraphDatabase.driver(os.getenv('NEO4J_URI'), auth=(os.getenv('NEO4J_USERNAME'), os.getenv('NEO4J_PASSWORD')))

with driver.session() as session:
    # Check all relationship types
    result = session.run('MATCH (a:Account)-[r]-(b:Account) RETURN distinct type(r) as rel_type, count(r) as count')
    
    print("=" * 60)
    print("RELATIONSHIP TYPES IN NEO4J DATABASE")
    print("=" * 60)
    
    rel_counts = {}
    for row in result:
        rel_type = row['rel_type']
        count = row['count']
        rel_counts[rel_type] = count
        print(f"\n{rel_type}: {count} relationships")
    
    print("\n" + "=" * 60)
    
    # Check specific SAME_IP relationships
    if 'SAME_IP_ADDRESS' in rel_counts:
        print("\n✅ SAME_IP_ADDRESS relationships FOUND!")
        result = session.run('''
            MATCH (a:Account)-[r:SAME_IP_ADDRESS]-(b:Account)
            RETURN a.account_id, b.account_id, a.ip_address
        ''')
        print("\nAccounts with SAME IP:")
        for row in result:
            print(f"  {row[0]} <-> {row[1]} (IP: {row[2]})")
    else:
        print("\n❌ SAME_IP_ADDRESS relationships NOT FOUND")
    
    # Check specific SAME_AADHAR relationships
    if 'SAME_AADHAR' in rel_counts:
        print("\n✅ SAME_AADHAR relationships FOUND!")
    else:
        print("\n❌ SAME_AADHAR relationships NOT FOUND")
    
    # Show account properties
    print("\n" + "=" * 60)
    print("SAMPLE ACCOUNT DATA")
    print("=" * 60)
    result = session.run('''
        MATCH (a:Account) 
        RETURN a.account_id, a.account_holder_name, a.ip_address, a.aadhar_number
        LIMIT 3
    ''')
    for row in result:
        print(f"\n{row[0]} ({row[1]})")
        print(f"  IP: {row[2]}")
        print(f"  Aadhar: {row[3]}")
