import prisma from '../config/db';

export const logAudit = async (params: {
  tenantId?: string | null;
  userId: string;
  action: string; // CREATE, UPDATE, DELETE, LOGIN, EXPORT, APPROVE, REJECT
  module: string; // TENANTS, USERS, STAFF, CLIENTS, RESEARCH, PAYMENTS, COMPLIANCE
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId,
        action: params.action,
        module: params.module,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || null,
      }
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};
