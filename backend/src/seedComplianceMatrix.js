const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requirements = [
  { serialNo: 1, requirement: "SEBI registration mandatory before providing research services", frequency: "Before commencement", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹25,000 first instance" },
  { serialNo: 2, requirement: "Eligibility and fit & proper criteria compliance", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "General Regulatory Non-Compliance - ₹5,000" },
  { serialNo: 3, requirement: "Minimum qualification requirements for RA / Principal Officer / Associated Persons", frequency: "At appointment and ongoing", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 4, requirement: "Mandatory NISM certifications", frequency: "Before acting as RA", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 5, requirement: "Certification renewal before expiry", frequency: "Before certification expiry", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 6, requirement: "Maintain prescribed net worth / deposit", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹1,00,000 minimum deposit" },
  { serialNo: 7, requirement: "Designation of Principal Officer", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "General Regulatory Non-Compliance - ₹5,000 per violation" },
  { serialNo: 8, requirement: "Appointment of Compliance Officer", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "Non-Appointment of Compliance Officer - ₹20,000" },
  { serialNo: 9, requirement: "Material changes to be informed to SEBI", frequency: "Immediate / ongoing", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 first instance" },
  { serialNo: 10, requirement: "Use 'Research Analyst' in communication", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "Code of Conduct Violation - ₹5,000" },
  { serialNo: 11, requirement: "Part-time RA disclosure", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "Code of Conduct Violation - ₹5,000" },
  { serialNo: 12, requirement: "Part-time RA client limit <=75", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 13, requirement: "RAASB enlistment", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "General Regulatory Non-Compliance - ₹5,000" },
  { serialNo: 14, requirement: "Written internal policies and controls", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 from second violation onwards" },
  { serialNo: 15, requirement: "Research independence from business activities", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 16, requirement: "Conflict management guidelines", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "Code of Conduct Violation - ₹5,000" },
  { serialNo: 17, requirement: "SEBI fee framework compliance", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 from second violation onwards" },
  { serialNo: 18, requirement: "Terms and conditions disclosure", frequency: "Before onboarding", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹1,000 per client" },
  { serialNo: 19, requirement: "Client consent mandatory", frequency: "Before onboarding", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "Code of Conduct Violation - ₹5,000" },
  { serialNo: 20, requirement: "Trading restriction before/after recommendation", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "Code of Conduct Violation - ₹5,000" },
  { serialNo: 21, requirement: "No contrary trading", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 22, requirement: "IPO-related acquisition restriction", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "General Regulatory Non-Compliance - ₹5,000" },
  { serialNo: 23, requirement: "Segregation of research activities", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 24, requirement: "IPO/FPO publication restrictions", frequency: "As applicable", severityLevel: "HIGH", frequencyType: "AS_APPLICABLE", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 25, requirement: "No research during lock-up periods", frequency: "As applicable", severityLevel: "HIGH", frequencyType: "AS_APPLICABLE", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 26, requirement: "No participation in IB sales pitches", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 27, requirement: "No communication with clients in IB presence", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 28, requirement: "Research not influenced by trading/sales", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 29, requirement: "No positive review promise for compensation", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 30, requirement: "Reports must reflect genuine views", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 31, requirement: "Separation from sales/trading staff", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 32, requirement: "Mandatory disclosures in reports", frequency: "Every report", severityLevel: "HIGH", frequencyType: "EVERY_REPORT", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 33, requirement: "Prescribed report contents", frequency: "Every report", severityLevel: "HIGH", frequencyType: "EVERY_REPORT", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 34, requirement: "Registration & financial interest disclosures", frequency: "Every report", severityLevel: "HIGH", frequencyType: "EVERY_REPORT", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 35, requirement: "Review third party reports", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 36, requirement: "Conflict disclosures", frequency: "Every report", severityLevel: "HIGH", frequencyType: "EVERY_REPORT", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 37, requirement: "Website with prescribed details", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per month" },
  { serialNo: 38, requirement: "Investor Charter display", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per month" },
  { serialNo: 39, requirement: "Complaint data update", frequency: "Monthly by 7th", severityLevel: "HIGH", frequencyType: "MONTHLY", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 40, requirement: "Complaint/escalation links on website", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹2,000 per month" },
  { serialNo: 41, requirement: "Grievance escalation matrix", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "₹100 per complaint" },
  { serialNo: 42, requirement: "Maintain client interaction and KYC records", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 from second violation onwards" },
  { serialNo: 43, requirement: "Record preservation", frequency: "Minimum 5 years", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 from second violation onwards" },
  { serialNo: 44, requirement: "SCORES & ODR compliance", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹100 per complaint" },
  { serialNo: 45, requirement: "No distribution services by RA", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 46, requirement: "Family member segregation", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 47, requirement: "No dual research/distribution service", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 48, requirement: "PAN collection for segregation", frequency: "On onboarding", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 from second violation onwards" },
  { serialNo: 49, requirement: "Annual dependent family declaration", frequency: "Annually", severityLevel: "MODERATE", frequencyType: "ANNUAL", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 50, requirement: "Maintain communication records", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 from second violation onwards" },
  { serialNo: 51, requirement: "AI usage disclosure", frequency: "Continuous compliance", severityLevel: "LOW", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per violation" },
  { serialNo: 52, requirement: "Half-yearly SaaS advisory compliance", frequency: "Half-yearly", severityLevel: "HIGH", frequencyType: "HALF_YEARLY", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 53, requirement: "SEBI advertisement code compliance", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹5,000 per advertisement" },
  { serialNo: 54, requirement: "SHe-Box Compliance", frequency: "As applicable", severityLevel: "MODERATE", frequencyType: "AS_APPLICABLE", penaltyAmount: "₹5,000 per violation" },
  { serialNo: 55, requirement: "Segregation between IA and RA activities", frequency: "Continuous compliance", severityLevel: "HIGH", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 per client" },
  { serialNo: 56, requirement: "Indirect benefit disclosure", frequency: "Continuous compliance", severityLevel: "MODERATE", frequencyType: "CONTINUOUS", penaltyAmount: "₹10,000 from second violation onwards" },
  { serialNo: 57, requirement: "Annual compliance audit", frequency: "Annually", severityLevel: "HIGH", frequencyType: "ANNUAL", penaltyAmount: "₹25,000 per violation" },
  { serialNo: 58, requirement: "Audit completion timeline", frequency: "Within 6 months from FY end", severityLevel: "HIGH", frequencyType: "ANNUAL", penaltyAmount: "₹25,000 per violation" },
  { serialNo: 59, requirement: "ATR submission", frequency: "Within 1 month of audit report", severityLevel: "HIGH", frequencyType: "ANNUAL", penaltyAmount: "₹100 per day after due date" }
];

async function main() {
  console.log("Cleaning old compliance requirements...");
  
  // We first delete existing Audits because they references ComplianceRequirement
  // To avoid breaking relationships, we clean up the rules.
  // We can delete audits and rules together so that we start with a clean state.
  await prisma.complianceAudit.deleteMany({});
  await prisma.complianceRequirement.deleteMany({});
  
  console.log("Seeding new compliance matrix...");
  for (const req of requirements) {
    await prisma.complianceRequirement.create({
      data: {
        serialNo: req.serialNo,
        requirement: req.requirement,
        frequency: req.frequency,
        frequencyType: req.frequencyType,
        severityLevel: req.severityLevel,
        penaltyAmount: req.penaltyAmount,
        isActive: true
      }
    });
  }
  console.log(`Seeded ${requirements.length} compliance requirements!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
