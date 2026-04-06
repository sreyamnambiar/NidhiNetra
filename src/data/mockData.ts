export interface NodeData {
  id: string; // Account ID or Name
  type: 'Account' | 'Card';
  ip?: string;
  phone?: string;
  location?: string;
  riskScore: number;
}

export interface LinkData {
  source: string;
  target: string;
  amount: number;
  timestamp: string; // ISO String
}

export const mockNodes: NodeData[] = [
  // Normal accounts
  { id: 'A001', type: 'Account', ip: '192.168.1.1', phone: '555-0101', location: 'New York, USA', riskScore: 0 },
  { id: 'A002', type: 'Account', ip: '192.168.1.2', phone: '555-0102', location: 'London, UK', riskScore: 0 },
  { id: 'A003', type: 'Account', ip: '192.168.1.3', phone: '555-0103', location: 'Toronto, Canada', riskScore: 0 },
  { id: 'A004', type: 'Account', ip: '192.168.1.4', phone: '555-0104', location: 'San Francisco, USA', riskScore: 0 },
  { id: 'A005', type: 'Account', ip: '192.168.1.5', phone: '555-0105', location: 'Paris, France', riskScore: 0 },
  { id: 'A006', type: 'Account', ip: '192.168.1.6', phone: '555-0106', location: 'Berlin, Germany', riskScore: 0 },
  { id: 'A007', type: 'Account', ip: '192.168.1.7', phone: '555-0107', location: 'Tokyo, Japan', riskScore: 0 },
  { id: 'A008', type: 'Account', ip: '192.168.1.8', phone: '555-0108', location: 'Sydney, Australia', riskScore: 0 },

  // Suspicious - Split Source (S100 and targets sharing similar IPs can be a signal)
  { id: 'S100', type: 'Account', ip: '10.0.0.99', phone: '555-0999', location: 'Nicosia, Cyprus', riskScore: 0 },
  { id: 'S101', type: 'Account', ip: '10.0.0.101', phone: '555-0999', location: 'Limassol, Cyprus', riskScore: 0 }, 
  { id: 'S102', type: 'Account', ip: '10.0.0.102', phone: '555-0992', location: 'Moscow, Russia', riskScore: 0 },
  { id: 'S103', type: 'Account', ip: '10.0.0.103', phone: '555-0993', location: 'Dubai, UAE', riskScore: 0 },

  // Suspicious - Rapid Transfer Ring
  { id: 'R200', type: 'Account', ip: '172.16.0.50', phone: '555-0200', location: 'Panama City, Panama', riskScore: 0 },
  { id: 'R201', type: 'Account', ip: '172.16.0.51', phone: '555-0201', location: 'George Town, Cayman Islands', riskScore: 0 },
  { id: 'R202', type: 'Account', ip: '172.16.0.52', phone: '555-0202', location: 'Nassau, Bahamas', riskScore: 0 },

  // High Value Node
  { id: 'H300', type: 'Account', ip: '11.22.33.44', phone: '555-0300', location: 'Zurich, Switzerland', riskScore: 0 },
  { id: 'H301', type: 'Account', ip: '11.22.33.45', phone: '555-0301', location: 'Geneva, Switzerland', riskScore: 0 },
  { id: 'H302', type: 'Account', ip: '11.22.33.46', phone: '555-0302', location: 'Luxembourg', riskScore: 0 },

  // Complex Layering Web
  { id: 'L101', type: 'Account', ip: '23.45.67.89', phone: '555-1101', location: 'Hong Kong', riskScore: 0 },
  { id: 'L102', type: 'Account', ip: '23.45.67.90', phone: '555-1102', location: 'Singapore', riskScore: 0 },
  { id: 'L103', type: 'Account', ip: '23.45.67.91', phone: '555-1103', location: 'Macau', riskScore: 0 },
  { id: 'L104', type: 'Account', ip: '23.45.67.92', phone: '555-1104', location: 'British Virgin Islands', riskScore: 0 },
];

export const mockLinks: LinkData[] = [
  // Normal Link Network
  { source: 'A001', target: 'A002', amount: 500, timestamp: '2023-10-01T10:00:00Z' },
  { source: 'A002', target: 'A003', amount: 200, timestamp: '2023-10-01T14:30:00Z' },
  { source: 'A003', target: 'A004', amount: 1200, timestamp: '2023-10-01T15:45:00Z' },
  { source: 'A005', target: 'A006', amount: 350, timestamp: '2023-10-01T09:15:00Z' },
  { source: 'A006', target: 'A001', amount: 800, timestamp: '2023-10-01T11:00:00Z' },
  { source: 'A007', target: 'A008', amount: 950, timestamp: '2023-10-01T12:00:00Z' },
  { source: 'A008', target: 'A005', amount: 400, timestamp: '2023-10-01T13:20:00Z' },

  // High Amount
  { source: 'H300', target: 'H301', amount: 45000, timestamp: '2023-10-01T15:00:00Z' },
  { source: 'H301', target: 'H302', amount: 44000, timestamp: '2023-10-02T09:00:00Z' },

  // Splitting Behavior
  { source: 'S100', target: 'S101', amount: 9000, timestamp: '2023-10-02T10:00:00Z' },
  { source: 'S100', target: 'S102', amount: 9000, timestamp: '2023-10-02T10:01:00Z' },
  { source: 'S100', target: 'S103', amount: 9000, timestamp: '2023-10-02T10:02:00Z' },

  // Mixed behavior linking normal to split
  { source: 'A004', target: 'S100', amount: 28000, timestamp: '2023-10-02T09:50:00Z' },

  // Rapid Transfer (Layering Ring)
  { source: 'R200', target: 'R201', amount: 5000, timestamp: '2023-10-03T11:00:00Z' },
  { source: 'R201', target: 'R202', amount: 4900, timestamp: '2023-10-03T11:01:30Z' },
  { source: 'R202', target: 'R200', amount: 4800, timestamp: '2023-10-03T11:02:50Z' },

  // Complex Layering Web
  { source: 'L101', target: 'L102', amount: 15000, timestamp: '2023-10-04T08:00:00Z' },
  { source: 'L102', target: 'L103', amount: 14500, timestamp: '2023-10-04T08:05:00Z' },
  { source: 'L103', target: 'L104', amount: 14000, timestamp: '2023-10-04T08:10:00Z' },
  { source: 'L104', target: 'L101', amount: 13500, timestamp: '2023-10-04T08:15:00Z' },

  // Bridge between networks
  { source: 'H302', target: 'L101', amount: 20000, timestamp: '2023-10-04T07:30:00Z' }
];
