"""
Neo4j Cypher Queries for Pattern Detection
Advanced queries for fraud detection and criminal network analysis
"""

# Query 1: Detect Circular Transaction Patterns (Money Layering)
# Identifies cycles in transaction graph that could indicate money laundering
QUERY_CIRCULAR_PATHS = """
MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)-[t2:TRANSACTION]->(c:Account)-[t3:TRANSACTION]->(a)
WHERE t1.timestamp < t2.timestamp < t3.timestamp
RETURN 
    a.account_id as source_account,
    b.account_id as intermediate_account_1,
    c.account_id as intermediate_account_2,
    t1.amount as first_amount,
    t2.amount as second_amount,
    t3.amount as third_amount,
    t1.timestamp as first_timestamp,
    t2.timestamp as second_timestamp,
    t3.timestamp as third_timestamp,
    (t1.amount + t2.amount + t3.amount) / 3 as avg_amount
ORDER BY avg_amount DESC
LIMIT 20
"""

# Query 2: Detect Rapid Sequential Transactions (Structuring)
# Identifies accounts with multiple transactions in short time windows
QUERY_RAPID_TRANSACTIONS = """
MATCH (a:Account)-[t1:TRANSACTION]->(b:Account)
WITH a, count(t1) as outgoing_count
WHERE outgoing_count >= 2
MATCH (a)-[t:TRANSACTION]->(c:Account)
WITH a, outgoing_count, collect({
    recipient: c.account_id,
    amount: t.amount,
    timestamp: t.timestamp
}) as transactions
RETURN 
    a.account_id as account,
    outgoing_count as transaction_count,
    transactions,
    [t in transactions | t.amount] as amounts,
    [t in transactions | t.timestamp] as timestamps
ORDER BY transaction_count DESC
LIMIT 20
"""

# Query 3 (Bonus): High-Value Account Network
# Identifies accounts involved in high-value transactions and their network
QUERY_HIGH_VALUE_NETWORK = """
MATCH (a:Account)-[t:TRANSACTION]->(b:Account)
WHERE t.amount > 1000
WITH a, b, t.amount as amount, t.timestamp as timestamp
RETURN 
    a.account_id as sender,
    b.account_id as receiver,
    amount,
    timestamp
ORDER BY amount DESC
LIMIT 10
"""

# Query 4: Detect SAME IP NETWORKS (Criminal Networks)
# CRITICAL: Accounts with same IP are likely controlled by same criminal!
QUERY_SAME_IP_NETWORK = """
MATCH (a:Account)-[r:SAME_IP_ADDRESS]->(b:Account)
WITH a, b, r
OPTIONAL MATCH (a)-[t:TRANSACTION]->(b)
RETURN 
    a.account_id as account_1,
    b.account_id as account_2,
    a.ip_address as shared_ip,
    a.account_holder_name as account_1_holder,
    b.account_holder_name as account_2_holder,
    count(t) as direct_transactions,
    CASE WHEN count(t) > 0 THEN 'HIGHLY SUSPICIOUS' ELSE 'SUSPICIOUS' END as alert
ORDER BY count(t) DESC
"""

# Query 5: Complete Money Trail (Find all paths from source to destination)
# Shows how money moved through intermediaries
QUERY_MONEY_TRAIL = """
MATCH path = (source:Account {account_id: $source_account})-[:TRANSACTION*1..5]->(destination:Account {account_id: $destination_account})
WITH path, [node in nodes(path) | node.account_id] as account_chain,
     [rel in relationships(path) | rel.amount] as amounts,
     [rel in relationships(path) | rel.timestamp] as timestamps
RETURN 
    account_chain as money_path,
    amounts,
    timestamps,
    reduce(total = 0, amt in amounts | total + amt) as total_amount,
    length(path) as hops
LIMIT 10
"""

# Query 6: Aadhar/Phone/Email Links (Connected Criminal Groups)
QUERY_CONNECTED_ACCOUNTS_BY_AADHAR = """
MATCH (a:Account)-[r:SAME_AADHAR]-(b:Account)
RETURN 
    a.account_id as account_1,
    b.account_id as account_2,
    a.aadhar_number as shared_aadhar,
    a.account_holder_name as account_1_holder,
    b.account_holder_name as account_2_holder,
    'SAME_AADHAR' as link_type
UNION ALL
MATCH (a:Account)-[r:SAME_PHONE]-(b:Account)
RETURN 
    a.account_id as account_1,
    b.account_id as account_2,
    a.phone_number as shared_aadhar,
    a.account_holder_name as account_1_holder,
    b.account_holder_name as account_2_holder,
    'SAME_PHONE' as link_type
UNION ALL
MATCH (a:Account)-[r:SAME_EMAIL]-(b:Account)
RETURN 
    a.account_id as account_1,
    b.account_id as account_2,
    a.email as shared_aadhar,
    a.account_holder_name as account_1_holder,
    b.account_holder_name as account_2_holder,
    'SAME_EMAIL' as link_type
"""

# Query 7: Spider Map / Network Graph (All connections for an account)
QUERY_ACCOUNT_NETWORK = """
MATCH (center:Account {account_id: $account_id})
OPTIONAL MATCH (center)-[t1:TRANSACTION]->(outgoing:Account)
OPTIONAL MATCH (incoming:Account)-[t2:TRANSACTION]->(center)
OPTIONAL MATCH (center)-[ip:SAME_IP_ADDRESS]-(related:Account)
RETURN 
    center.account_id as center_account,
    center.account_holder_name as account_holder,
    center.ip_address as ip_address,
    collect({account: outgoing.account_id, amount: t1.amount, type: 'SENT_TO'}) as outgoing,
    collect({account: incoming.account_id, amount: t2.amount, type: 'RECEIVED_FROM'}) as incoming,
    collect({account: related.account_id, type: 'SAME_IP'}) as same_ip_accounts
"""

class CypherQueries:
    """Collection of Cypher queries for pattern detection"""
    
    @staticmethod
    def get_circular_patterns(session, limit=20):
        """
        Query 1: Detect circular transaction patterns (money layering)
        
        Returns accounts involved in circular money flows that could indicate
        attempts to obscure the origin of funds (money laundering)
        """
        result = session.run(QUERY_CIRCULAR_PATHS)
        return result.data()
    
    @staticmethod
    def get_rapid_transactions(session, limit=20):
        """
        Query 2: Detect rapid sequential transactions (structuring)
        
        Returns accounts with multiple rapid transactions, which could indicate
        structuring (breaking large amounts into smaller ones to avoid detection)
        """
        result = session.run(QUERY_RAPID_TRANSACTIONS)
        return result.data()
    
    @staticmethod
    def get_high_value_network(session):
        """
        Query 3: Analyze high-value transaction networks
        
        Returns accounts involved in high-value transactions and their connections
        """
        result = session.run(QUERY_HIGH_VALUE_NETWORK)
        return result.data()
    
    @staticmethod
    def get_same_ip_network(session):
        """
        Query 4: CRITICAL - Detect Same IP Networks
        
        Accounts with the same IP address are HIGHLY LIKELY to be controlled by the same criminal.
        This is one of the strongest indicators for identifying criminal networks.
        """
        result = session.run(QUERY_SAME_IP_NETWORK)
        return result.data()
    
    @staticmethod
    def get_money_trail(session, source_account, destination_account):
        """
        Query 5: Find complete money trail between two accounts
        
        Shows all possible paths money took through intermediaries.
        This creates the "spider map" showing how money moved.
        """
        result = session.run(QUERY_MONEY_TRAIL, source_account=source_account, destination_account=destination_account)
        return result.data()
    
    @staticmethod
    def get_connected_accounts(session):
        """
        Query 6: Find accounts connected by Aadhar/Phone/Email
        
        Indicates accounts possibly controlled by the same person or criminal group.
        """
        result = session.run(QUERY_CONNECTED_ACCOUNTS_BY_AADHAR)
        return result.data()
    
    @staticmethod
    def get_account_network_spider_map(session, account_id):
        """
        Query 7: Generate Spider Map for an account
        
        Shows all incoming transactions, outgoing transactions, and related accounts
        with same IP/Aadhar/Phone/Email. This is the visual representation for investigators.
        """
        result = session.run(QUERY_ACCOUNT_NETWORK, account_id=account_id)
        return result.single()
