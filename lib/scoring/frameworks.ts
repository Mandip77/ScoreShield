export interface FrameworkMapping {
  cisControl: string;
  cisDescription: string;
  nistFunction: string;
  nistCategory: string;
}

export const FRAMEWORK_MAPPINGS: Record<string, FrameworkMapping> = {
  "CIS 5.2": {
    cisControl: "CIS Control 5.2",
    cisDescription: "Use Unique Passwords",
    nistFunction: "PR.AC",
    nistCategory: "Identity Management, Authentication, and Access Control",
  },
  "CIS 5.3": {
    cisControl: "CIS Control 5.3",
    cisDescription: "Disable Dormant Accounts",
    nistFunction: "PR.AC",
    nistCategory: "Identity Management, Authentication, and Access Control",
  },
  "CIS 5.4": {
    cisControl: "CIS Control 5.4",
    cisDescription: "Restrict Administrator Privileges to Dedicated Accounts",
    nistFunction: "PR.AC",
    nistCategory: "Identity Management, Authentication, and Access Control",
  },
  "CIS 6.3": {
    cisControl: "CIS Control 6.3",
    cisDescription: "Require MFA for Externally-Exposed Applications",
    nistFunction: "PR.AC",
    nistCategory: "Identity Management, Authentication, and Access Control",
  },
  "CIS 6.5": {
    cisControl: "CIS Control 6.5",
    cisDescription: "Require MFA for Administrative Access",
    nistFunction: "PR.AC",
    nistCategory: "Identity Management, Authentication, and Access Control",
  },
  "CIS 3.3": {
    cisControl: "CIS Control 3.3",
    cisDescription: "Configure Data Access Control Lists",
    nistFunction: "PR.DS",
    nistCategory: "Data Security",
  },
  "CIS 3.6": {
    cisControl: "CIS Control 3.6",
    cisDescription: "Encrypt Data on End-User Devices",
    nistFunction: "PR.DS",
    nistCategory: "Data Security",
  },
  "CIS 8.2": {
    cisControl: "CIS Control 8.2",
    cisDescription: "Collect Audit Logs",
    nistFunction: "DE.CM",
    nistCategory: "Security Continuous Monitoring",
  },
  "CIS 8.11": {
    cisControl: "CIS Control 8.11",
    cisDescription: "Conduct Audit Log Reviews",
    nistFunction: "DE.CM",
    nistCategory: "Security Continuous Monitoring",
  },
  "CIS 12.6": {
    cisControl: "CIS Control 12.6",
    cisDescription: "Use of Secure Network Management and Communication Protocols",
    nistFunction: "PR.IP",
    nistCategory: "Information Protection Processes and Procedures",
  },
};

export const NIST_FUNCTIONS: Record<string, { name: string; description: string }> = {
  "ID": { name: "Identify", description: "Understand risks to systems, people, assets, data, and capabilities" },
  "PR.AC": { name: "Protect — Access Control", description: "Access to assets and associated facilities is limited to authorized users and processes" },
  "PR.DS": { name: "Protect — Data Security", description: "Information and records are managed consistent with the organization's risk strategy" },
  "PR.IP": { name: "Protect — Information Protection", description: "Security policies, processes, and procedures are maintained and used to manage protection of information systems" },
  "DE.CM": { name: "Detect — Continuous Monitoring", description: "The information system and assets are monitored to identify cybersecurity events" },
  "RS": { name: "Respond", description: "Activities are taken regarding a detected cybersecurity incident" },
};
