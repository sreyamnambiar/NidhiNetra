"""
Criminal records data - past criminal activity for fraud accounts
"""

CRIMINAL_RECORDS = {
    "FRAUD_001": {
        "name": "Vikram Patel",
        "aadhar": "111111111111",
        "phone_number": "9999999999",
        "photo_url": "https://via.placeholder.com/200/FF0000/FFFFFF?text=Vikram+Patel&font_size=25",
        "past_convictions": [
            "Money Laundering (3 years imprisonment, released 2023)",
            "International Wire Fraud (5 years imprisonment, ongoing)"
        ],
        "criminal_history": [
            "Known member of Dark Web Banking Cartel",
            "Operates in multiple jurisdictions",
            "Uses cryptocurrency mixing and structuring",
            "Last captured on Interpol Red Notice in 2022"
        ],
        "aliases": ["V. Patel", "Vikram P.", "Dark Wolf"],
        "status": "WANTED - Interpol Red Notice",
        "risk_level": "CRITICAL"
    },
    "FRAUD_002": {
        "name": "Hassan Khan",
        "aadhar": "555555555555",
        "phone_number": "8888888888",
        "photo_url": "https://via.placeholder.com/200/FF0000/FFFFFF?text=Hassan+Khan&font_size=30",
        "past_convictions": [
            "Drug Trafficking (8 years imprisonment, ongoing)"
        ],
        "criminal_history": [
            "Head of International Drug Trafficking Syndicate",
            "Involved in terrorist financing networks",
            "Uses trade-based money laundering",
            "Hawala network operator",
            "Bulk cash smuggling operations"
        ],
        "aliases": ["H. Khan", "Hassan K.", "The Broker", "East Wind"],
        "status": "WANTED - Interpol Red Notice + FBI Most Wanted",
        "risk_level": "CRITICAL"
    },
    "FRAUD_003": {
        "name": "Sergei Volkov",
        "aadhar": "101010101010",
        "phone_number": "7777777777",
        "photo_url": "https://via.placeholder.com/200/FF0000/FFFFFF?text=Sergei+Volkov&font_size=25",
        "past_convictions": [
            "Sanctions Evasion (10 years imprisonment, ongoing)",
            "Cybercrime (6 years imprisonment, ongoing)"
        ],
        "criminal_history": [
            "Connected to Russian Mafia operations",
            "Runs cybercrime syndicate",
            "Sanctions evasion network operator",
            "Uses shell companies and trade financing fraud",
            "Advanced cryptocurrency money laundering"
        ],
        "aliases": ["S. Volkov", "Sergei V.", "The Phantom", "Code Master"],
        "status": "WANTED - Interpol Red Notice + OFAC Sanctions",
        "risk_level": "CRITICAL"
    }
}
