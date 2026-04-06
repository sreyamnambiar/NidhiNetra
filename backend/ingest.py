"""
Neo4j Data Ingestion Script
Reads CSV transaction data and loads into Neo4j AuraDB
"""
import pandas as pd
from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

class Neo4jIngestion:
    def __init__(self):
        """Initialize Neo4j driver"""
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        # Neo4j Aura uses default database, no need to specify
        self.database = None
        
        self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
    
    def close(self):
        """Close Neo4j driver connection"""
        if self.driver:
            self.driver.close()
    
    def create_indexes(self):
        """Create indexes for performance"""
        with self.driver.session() as session:
            # Create unique constraints on account IDs
            session.run("CREATE CONSTRAINT account_id_unique IF NOT EXISTS FOR (a:Account) REQUIRE a.account_id IS UNIQUE")
            print("✓ Created constraint on Account.account_id")
    
    def clear_database(self):
        """Clear existing data from database"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            print("✓ Cleared existing data")
    
    def ingest_from_csv(self, csv_path):
        """
        Load transaction data from CSV into Neo4j
        Creates Account nodes with investigative attributes and Transaction edges
        Links accounts by Aadhar, IP, phone, email to identify connected networks
        """
        # Read CSV
        df = pd.read_csv(csv_path)
        print(f"✓ Loaded {len(df)} transactions from CSV")
        
        # Create Account nodes with investigative attributes
        with self.driver.session() as session:
            # Track unique accounts to avoid duplicates
            accounts_seen = set()
            
            for idx, row in df.iterrows():
                account_id = row['account_id']
                
                # Skip if already processed
                if account_id not in accounts_seen:
                    accounts_seen.add(account_id)
                    
                    # Create account node with all investigative attributes
                    session.run(
                        """
                        MERGE (a:Account {account_id: $account_id})
                        ON CREATE SET 
                            a.account_holder_name = $account_holder_name,
                            a.aadhar_number = $aadhar_number,
                            a.phone_number = $phone_number,
                            a.ip_address = $ip_address,
                            a.email = $email,
                            a.created_at = $timestamp
                        """,
                        account_id=account_id,
                        account_holder_name=row['account_holder_name'],
                        aadhar_number=row['aadhar_number'],
                        phone_number=row['phone_number'],
                        ip_address=row['ip_address'],
                        email=row['email'],
                        timestamp=datetime.now().isoformat()
                    )
            
            # Create transaction relationships
            for idx, row in df.iterrows():
                account_id = row['account_id']
                amount = float(row['amount'])
                timestamp = row['timestamp']
                transaction_type = row['transaction_type']
                recipient_account_id = row['recipient_account_id']
                
                # For transfers, create recipient account if not exists
                if pd.notna(recipient_account_id):
                    recipient_id = str(recipient_account_id)
                    if recipient_id not in accounts_seen:
                        accounts_seen.add(recipient_id)
                        # Find recipient details from same dataframe
                        recipient_rows = df[df['account_id'] == recipient_id]
                        if len(recipient_rows) > 0:
                            rec_row = recipient_rows.iloc[0]
                            session.run(
                                """
                                MERGE (b:Account {account_id: $account_id})
                                ON CREATE SET 
                                    b.account_holder_name = $account_holder_name,
                                    b.aadhar_number = $aadhar_number,
                                    b.phone_number = $phone_number,
                                    b.ip_address = $ip_address,
                                    b.email = $email,
                                    b.created_at = $timestamp
                                """,
                                account_id=recipient_id,
                                account_holder_name=rec_row['account_holder_name'],
                                aadhar_number=rec_row['aadhar_number'],
                                phone_number=rec_row['phone_number'],
                                ip_address=rec_row['ip_address'],
                                email=rec_row['email'],
                                timestamp=datetime.now().isoformat()
                            )
                    
                    # Create transaction edge
                    session.run(
                        """
                        MATCH (a:Account {account_id: $source_account})
                        MATCH (b:Account {account_id: $recipient_account})
                        CREATE (a)-[t:TRANSACTION {
                            amount: $amount,
                            timestamp: $timestamp,
                            type: $transaction_type
                        }]->(b)
                        """,
                        source_account=account_id,
                        recipient_account=recipient_id,
                        amount=amount,
                        timestamp=timestamp,
                        transaction_type=transaction_type
                    )
            
            # Create links between accounts with SAME IP (indicates same criminal)
            session.run(
                """
                MATCH (a:Account), (b:Account)
                WHERE a.ip_address = b.ip_address AND a.account_id < b.account_id
                MERGE (a)-[r:SAME_IP_ADDRESS]->(b)
                """
            )
            
            # Create links between accounts with SAME Aadhar
            session.run(
                """
                MATCH (a:Account), (b:Account)
                WHERE a.aadhar_number = b.aadhar_number AND a.account_id < b.account_id
                MERGE (a)-[r:SAME_AADHAR]->(b)
                """
            )
            
            # Create links between accounts with SAME phone number
            session.run(
                """
                MATCH (a:Account), (b:Account)
                WHERE a.phone_number = b.phone_number AND a.account_id < b.account_id
                MERGE (a)-[r:SAME_PHONE]->(b)
                """
            )
            
            # Create links between accounts with SAME email
            session.run(
                """
                MATCH (a:Account), (b:Account)
                WHERE a.email = b.email AND a.account_id < b.account_id
                MERGE (a)-[r:SAME_EMAIL]->(b)
                """
            )
            
            print("✓ Created links between accounts with same IP, Aadhar, phone, email")
        
        print(f"✓ Ingested {len(df)} transactions into Neo4j")
    
    def verify_data(self):
        """Verify data was loaded correctly"""
        with self.driver.session() as session:
            account_count = session.run("MATCH (a:Account) RETURN count(a) as count").single()["count"]
            transaction_count = session.run("MATCH (a)-[t:TRANSACTION]->(b) RETURN count(t) as count").single()["count"]
            
            print(f"✓ Verification: {account_count} accounts, {transaction_count} transactions")

def main():
    """Main ingestion workflow"""
    print("=" * 50)
    print("Neo4j Transaction Data Ingestion")
    print("=" * 50)
    
    ingest = Neo4jIngestion()
    
    try:
        print("\n1. Creating indexes...")
        ingest.create_indexes()
        
        print("\n2. Clearing existing data...")
        ingest.clear_database()
        
        print("\n3. Ingesting CSV data...")
        csv_path = "../data/sample_transactions.csv"
        ingest.ingest_from_csv(csv_path)
        
        print("\n4. Verifying data...")
        ingest.verify_data()
        
        print("\n✓ Ingestion complete!")
        
    except Exception as e:
        print(f"✗ Error during ingestion: {e}")
    finally:
        ingest.close()

if __name__ == "__main__":
    main()
