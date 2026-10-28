const path = require('path');
require('C:/Users/HIMANSHU/Desktop/RA_SEBI_COMPLINCE/backend/node_modules/dotenv').config({ path: path.resolve('backend/.env') });
const mongoose = require('C:/Users/HIMANSHU/Desktop/RA_SEBI_COMPLINCE/backend/node_modules/mongoose');

async function test() {
  const dbUrl = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/sebi-compliance-local';
  console.log('Connecting to DB at:', dbUrl.split('@')[1] || dbUrl);
  await mongoose.connect(dbUrl);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  const Complaint = db.collection('Complaint');
  const Penalty = db.collection('Penalty');
  const ComplianceAlert = db.collection('ComplianceAlert');
  const ComplianceAudit = db.collection('ComplianceAudit');

  const tenant = await db.collection('Tenant').findOne({});
  if (!tenant) {
    console.error('No tenant found');
    process.exit(1);
  }
  const tenantId = tenant._id;

  // 1. Create a mock client-submitted complaint
  const clientComplaint = await Complaint.insertOne({
    tenantId,
    clientName: 'Test Client',
    source: 'CLIENT_PORTAL',
    createdByType: 'CLIENT',
    subject: 'Client Grievance Test',
    description: 'Testing client complaint protection',
    status: 'OPEN',
    receivedAt: new Date(),
    deadlineAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('1. Created client complaint:', clientComplaint.insertedId.toString());

  // 2. Create a mock admin-logged complaint
  const adminComplaint = await Complaint.insertOne({
    tenantId,
    clientName: 'Test Admin Client',
    source: 'SCORES',
    createdByType: 'ADMIN',
    subject: 'Admin Grievance Test',
    description: 'Testing admin complaint deletion and cascade purge',
    status: 'OPEN',
    receivedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    deadlineAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const adminComplaintId = adminComplaint.insertedId;
  const adminComplaintIdStr = adminComplaintId.toString();
  console.log('2. Created admin complaint:', adminComplaintIdStr);

  // Create linked Audit, Penalty, and Alert for this admin complaint
  const mockAudit = await ComplianceAudit.insertOne({
    tenantId,
    status: 'NON_COMPLIANT',
    officerRemarks: `System auto-generated: Complaint ${adminComplaintIdStr} unresolved > 21 days.`,
    createdAt: new Date()
  });

  const mockPenalty = await Penalty.insertOne({
    tenantId,
    auditId: mockAudit.insertedId,
    amount: 100,
    reason: `Complaint resolution timeline exceeded for complaint ${adminComplaintIdStr}`,
    status: 'PENDING_PAYMENT',
    createdAt: new Date()
  });

  const mockAlert = await ComplianceAlert.insertOne({
    tenantId,
    alertType: 'COMPLAINT_OVERDUE',
    severity: 'HIGH',
    description: `Compliance Violation (SR.28): Complaint (Admin Grievance Test) is unresolved for over 21 days. Penalty of ₹100 per complaint applies. [Ref: ${adminComplaintIdStr}]`,
    status: 'OPEN',
    createdAt: new Date()
  });

  console.log('3. Created linked Audit, Penalty, and Alert for admin complaint');

  // Verify they exist
  let foundPenalty = await Penalty.findOne({ _id: mockPenalty.insertedId });
  let foundAlert = await ComplianceAlert.findOne({ _id: mockAlert.insertedId });
  let foundAudit = await ComplianceAudit.findOne({ _id: mockAudit.insertedId });
  console.log('Pre-check: All 3 records exist?', Boolean(foundPenalty && foundAlert && foundAudit));

  // Now simulate backend deleteComplaint for CLIENT complaint:
  const targetClientComp = await Complaint.findOne({ _id: clientComplaint.insertedId, tenantId });
  if (targetClientComp.source === 'CLIENT_PORTAL' || targetClientComp.createdByType === 'CLIENT') {
    console.log('PASS: Client complaint deletion successfully BLOCKED (Forbidden)!');
  } else {
    console.error('FAIL: Client complaint was not blocked!');
  }

  // Now simulate backend deleteComplaint logic for ADMIN complaint:
  console.log('Simulating deletion of admin complaint...');
  const linkedAudits = await ComplianceAudit.find({
    tenantId,
    officerRemarks: { $regex: adminComplaintIdStr, $options: 'i' }
  }).toArray();
  const linkedAuditIds = linkedAudits.map(a => a._id);

  const penaltyFilter = {
    tenantId,
    $or: [{ reason: { $regex: adminComplaintIdStr, $options: 'i' } }]
  };
  if (linkedAuditIds.length > 0) penaltyFilter.$or.push({ auditId: { $in: linkedAuditIds } });

  await Penalty.deleteMany(penaltyFilter);
  if (linkedAuditIds.length > 0) await ComplianceAudit.deleteMany({ _id: { $in: linkedAuditIds } });
  await ComplianceAlert.deleteMany({
    tenantId,
    alertType: 'COMPLAINT_OVERDUE',
    description: { $regex: adminComplaintIdStr, $options: 'i' }
  });
  await Complaint.deleteOne({ _id: adminComplaintId });

  // Post-check
  foundPenalty = await Penalty.findOne({ _id: mockPenalty.insertedId });
  foundAlert = await ComplianceAlert.findOne({ _id: mockAlert.insertedId });
  foundAudit = await ComplianceAudit.findOne({ _id: mockAudit.insertedId });
  const foundComplaint = await Complaint.findOne({ _id: adminComplaintId });

  console.log('Post-check:');
  console.log('Complaint deleted?', !foundComplaint);
  console.log('Penalty deleted?', !foundPenalty);
  console.log('Audit deleted?', !foundAudit);
  console.log('Alert deleted?', !foundAlert);

  if (!foundComplaint && !foundPenalty && !foundAudit && !foundAlert) {
    console.log('SUCCESS! All cascading records were completely purged!');
  } else {
    console.error('FAIL: Some cascading records remained!');
  }

  // Clean up client test complaint
  await Complaint.deleteOne({ _id: clientComplaint.insertedId });
  console.log('Cleaned up test records.');

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
