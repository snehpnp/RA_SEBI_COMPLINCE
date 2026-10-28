export interface SebiPenaltyRule {
  srNo: number;
  requirement: string;
  frequency: string;
  penalty: string;
  category: 'REGISTRATION' | 'GOVERNANCE' | 'CODE_OF_CONDUCT' | 'DISCLOSURES' | 'RECORDS_AUDIT' | 'CLIENT_OPS' | 'REPORTING';
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'STATUTORY';
}

export const SEBI_PENALTIES_MASTER: SebiPenaltyRule[] = [
  {
    srNo: 1,
    requirement: "SEBI registration mandatory before providing research services",
    frequency: "Before commencement",
    penalty: "Illegal Operation / Cancellation of Registration & Adjudication",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 2,
    requirement: "Eligibility and fit & proper criteria compliance",
    frequency: "Continuous compliance",
    penalty: "Fit & Proper Disqualification / Suspension",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 3,
    requirement: "Minimum qualification requirements for RA / Principal Officer / Associated Persons",
    frequency: "At appointment and ongoing",
    penalty: "Disqualification / Suspension of Services",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 5,
    requirement: "Mandatory NISM certifications",
    frequency: "Before acting as RA",
    penalty: "Ineligibility to provide recommendations",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 6,
    requirement: "Certification renewal before expiry",
    frequency: "Before certification expiry",
    penalty: "De-registration / Invalidation of recommendations",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 7,
    requirement: "Maintain prescribed net worth / deposit",
    frequency: "Continuous compliance",
    penalty: "Suspension of Certificate of Registration",
    category: "GOVERNANCE",
    severity: "HIGH"
  },
  {
    srNo: 8,
    requirement: "Designation of Principal Officer",
    frequency: "Continuous compliance",
    penalty: "General Regulatory Non-Compliance – ₹5,000 per violation",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 9,
    requirement: "Appointment of Compliance Officer",
    frequency: "Continuous compliance",
    penalty: "Non-Appointment of Compliance Officer – ₹20,000",
    category: "GOVERNANCE",
    severity: "HIGH"
  },
  {
    srNo: 10,
    requirement: "Material changes to be informed to SEBI",
    frequency: "Immediate / ongoing",
    penalty: "₹5,000 first instance",
    category: "REPORTING",
    severity: "LOW"
  },
  {
    srNo: 11,
    requirement: "Use 'Research Analyst' in communication",
    frequency: "Continuous compliance",
    penalty: "Code of Conduct Violation – ₹5,000",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 12,
    requirement: "Part-time RA disclosure",
    frequency: "Continuous compliance",
    penalty: "Code of Conduct Violation – ₹5,000",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 13,
    requirement: "Part-time RA client limit ≤75",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CLIENT_OPS",
    severity: "MEDIUM"
  },
  {
    srNo: 14,
    requirement: "RAASB enlistment",
    frequency: "Continuous compliance",
    penalty: "General Regulatory Non-Compliance – ₹5,000",
    category: "REGISTRATION",
    severity: "LOW"
  },
  {
    srNo: 15,
    requirement: "Written internal policies and controls",
    frequency: "Continuous compliance",
    penalty: "₹5,000 from second violation onwards",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 16,
    requirement: "Research independence from business activities",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 17,
    requirement: "Conflict management guidelines",
    frequency: "Continuous compliance",
    penalty: "Code of Conduct Violation – ₹5,000",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 18,
    requirement: "SEBI fee framework compliance",
    frequency: "Continuous compliance",
    penalty: "₹10,000 from second violation onwards",
    category: "CLIENT_OPS",
    severity: "MEDIUM"
  },
  {
    srNo: 19,
    requirement: "Terms and conditions disclosure",
    frequency: "Before onboarding",
    penalty: "₹1,000 per client",
    category: "DISCLOSURES",
    severity: "LOW"
  },
  {
    srNo: 20,
    requirement: "Client consent mandatory",
    frequency: "Before onboarding",
    penalty: "Code of Conduct Violation – ₹5,000",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 21,
    requirement: "Trading restriction before/after recommendation",
    frequency: "Continuous compliance",
    penalty: "Code of Conduct Violation – ₹5,000",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 22,
    requirement: "No contrary trading",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 23,
    requirement: "IPO-related acquisition restriction",
    frequency: "Continuous compliance",
    penalty: "General Regulatory Non-Compliance – ₹5,000",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 24,
    requirement: "Segregation of research activities",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 25,
    requirement: "IPO/FPO publication restrictions",
    frequency: "As applicable",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 26,
    requirement: "No research during lock-up periods",
    frequency: "As applicable",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 27,
    requirement: "No participation in IB sales pitches",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 28,
    requirement: "No communication with clients in IB presence",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 29,
    requirement: "Research not influenced by trading/sales",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 30,
    requirement: "Research reports require documentary support",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "RECORDS_AUDIT",
    severity: "MEDIUM"
  },
  {
    srNo: 31,
    requirement: "No positive review promise for compensation",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 32,
    requirement: "Reports must reflect genuine views",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 33,
    requirement: "Separation from sales/trading staff",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 34,
    requirement: "Mandatory disclosures in reports",
    frequency: "Every report",
    penalty: "₹10,000 per violation",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 35,
    requirement: "Prescribed report contents",
    frequency: "Every report",
    penalty: "₹10,000 per violation",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 36,
    requirement: "Registration & financial interest disclosures",
    frequency: "Every report",
    penalty: "₹10,000 per violation",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 37,
    requirement: "Review third-party reports",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 38,
    requirement: "Conflict disclosures",
    frequency: "Every report",
    penalty: "₹10,000 per violation",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 39,
    requirement: "Website with prescribed details",
    frequency: "Continuous compliance",
    penalty: "₹5,000 per month",
    category: "DISCLOSURES",
    severity: "LOW"
  },
  {
    srNo: 40,
    requirement: "Investor Charter display",
    frequency: "Continuous compliance",
    penalty: "₹5,000 per month",
    category: "DISCLOSURES",
    severity: "LOW"
  },
  {
    srNo: 41,
    requirement: "Complaint data update",
    frequency: "Monthly by 7th",
    penalty: "₹5,000 per violation",
    category: "REPORTING",
    severity: "LOW"
  },
  {
    srNo: 42,
    requirement: "Complaint/escalation links on website",
    frequency: "Continuous compliance",
    penalty: "₹5,000 per month",
    category: "DISCLOSURES",
    severity: "LOW"
  },
  {
    srNo: 43,
    requirement: "Grievance escalation matrix",
    frequency: "Continuous compliance",
    penalty: "₹100 per complaint",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 44,
    requirement: "Maintain client interaction and KYC records",
    frequency: "Continuous compliance",
    penalty: "₹5,000 from second violation onwards",
    category: "RECORDS_AUDIT",
    severity: "LOW"
  },
  {
    srNo: 45,
    requirement: "Record preservation",
    frequency: "Minimum 5 years",
    penalty: "₹5,000 from second violation onwards",
    category: "RECORDS_AUDIT",
    severity: "LOW"
  },
  {
    srNo: 46,
    requirement: "Annual compliance audit",
    frequency: "Annually",
    penalty: "₹25,000 per violation",
    category: "RECORDS_AUDIT",
    severity: "HIGH"
  },
  {
    srNo: 47,
    requirement: "Audit completion timeline",
    frequency: "Within 6 months from FY end",
    penalty: "₹25,000 per violation",
    category: "RECORDS_AUDIT",
    severity: "HIGH"
  },
  {
    srNo: 48,
    requirement: "ATR submission",
    frequency: "Within 1 month of audit report",
    penalty: "₹100 per day after due date",
    category: "REPORTING",
    severity: "MEDIUM"
  },
  {
    srNo: 49,
    requirement: "Complaint resolution",
    frequency: "Within 21 days",
    penalty: "₹100 per complaint",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 50,
    requirement: "SCORES & ODR compliance",
    frequency: "Continuous compliance",
    penalty: "₹100 per complaint",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 51,
    requirement: "No distribution services by RA",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 52,
    requirement: "Family member segregation",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 53,
    requirement: "No dual research/distribution service",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 54,
    requirement: "PAN collection for segregation",
    frequency: "At onboarding",
    penalty: "₹5,000 from second violation onwards",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 55,
    requirement: "Annual dependent family declaration",
    frequency: "Annually",
    penalty: "₹5,000 per violation",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 56,
    requirement: "Annual auditor certificate",
    frequency: "Annually",
    penalty: "₹25,000 per violation",
    category: "RECORDS_AUDIT",
    severity: "HIGH"
  },
  {
    srNo: 57,
    requirement: "KYC for fee-paying clients",
    frequency: "Before onboarding",
    penalty: "₹5,000 from second violation onwards",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 58,
    requirement: "Maintain communication records",
    frequency: "Continuous compliance",
    penalty: "₹5,000 from second violation onwards",
    category: "RECORDS_AUDIT",
    severity: "LOW"
  },
  {
    srNo: 59,
    requirement: "AI usage disclosure",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 60,
    requirement: "Half-yearly SaaS advisory compliance",
    frequency: "Half-yearly",
    penalty: "₹5,000 per violation",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 61,
    requirement: "Cybersecurity & CSCRF compliance",
    frequency: "Continuous compliance",
    penalty: "₹5,000 from second violation onwards",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 62,
    requirement: "SEBI advertisement code compliance",
    frequency: "Continuous compliance",
    penalty: "₹5,000 per advertisement",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 63,
    requirement: "Advertisement approval",
    frequency: "Before advertisement",
    penalty: "₹5,000 per advertisement",
    category: "CODE_OF_CONDUCT",
    severity: "LOW"
  },
  {
    srNo: 64,
    requirement: "No unauthenticated news circulation",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 65,
    requirement: "Outsourcing framework compliance",
    frequency: "As applicable",
    penalty: "₹5,000 per violation",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 66,
    requirement: "TRAI DLT / PE-TM compliance",
    frequency: "Continuous compliance",
    penalty: "₹5,000 per violation",
    category: "CLIENT_OPS",
    severity: "LOW"
  },
  {
    srNo: 67,
    requirement: "SHe-Box compliance",
    frequency: "As applicable",
    penalty: "₹5,000 per violation",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 68,
    requirement: "Segregation between IA and RA activities",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per client",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 69,
    requirement: "Model portfolio guideline compliance",
    frequency: "Continuous compliance",
    penalty: "₹10,000 first instance",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 70,
    requirement: "Research services backed by reports",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CODE_OF_CONDUCT",
    severity: "MEDIUM"
  },
  {
    srNo: 71,
    requirement: "Indirect benefit disclosure",
    frequency: "Continuous compliance",
    penalty: "₹10,000 from second violation onwards",
    category: "DISCLOSURES",
    severity: "MEDIUM"
  },
  {
    srNo: 72,
    requirement: "Prior approval for change in control",
    frequency: "Before change in control",
    penalty: "₹25,000 per violation",
    category: "REGISTRATION",
    severity: "HIGH"
  },
  {
    srNo: 73,
    requirement: "Periodic reporting submission",
    frequency: "As per prescribed timelines",
    penalty: "₹100 per day after due date",
    category: "REPORTING",
    severity: "MEDIUM"
  },
  {
    srNo: 74,
    requirement: "Inspection data submission",
    frequency: "As requested",
    penalty: "Notice and further action",
    category: "REPORTING",
    severity: "HIGH"
  },
  {
    srNo: 75,
    requirement: "PMLA / AML compliance",
    frequency: "Continuous compliance",
    penalty: "₹5,000 from second violation onwards",
    category: "GOVERNANCE",
    severity: "LOW"
  },
  {
    srNo: 76,
    requirement: "Investor protection mechanisms",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "CLIENT_OPS",
    severity: "MEDIUM"
  },
  {
    srNo: 77,
    requirement: "Compensation regulation compliance",
    frequency: "Continuous compliance",
    penalty: "₹10,000 per violation",
    category: "GOVERNANCE",
    severity: "MEDIUM"
  },
  {
    srNo: 78,
    requirement: "MITC preparation and sharing",
    frequency: "Before onboarding",
    penalty: "₹1,000 per client",
    category: "CLIENT_OPS",
    severity: "LOW"
  }
];
