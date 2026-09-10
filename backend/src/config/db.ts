import { Model } from 'mongoose';
import { centralConnection, centralModels } from '../services/tenantConnectionManager';
import { getTenantContext } from './tenantContext';
import { ITenantModels } from '../models';

export { centralConnection, centralModels };

/**
 * Creates a dynamic proxy for a specific model that automatically resolves to the
 * active request's tenant connection model from AsyncLocalStorage.
 */
function createDynamicModelProxy<K extends keyof ITenantModels>(modelName: K): ITenantModels[K] {
  const dummyFn = function () {};
  return new Proxy(dummyFn as any, {
    get(_target, prop) {
      const context = getTenantContext();
      const activeModels = (!context?.isCentral && context?.models) ? context.models : centralModels;
      const targetModel = activeModels[modelName];
      if (!targetModel) return undefined;
      const value = (targetModel as any)[prop];

      if (typeof value === 'function') {
        return value.bind(targetModel);
      }
      return value;
    },
    apply(_target, _thisArg, argArray) {
      const context = getTenantContext();
      const activeModels = (!context?.isCentral && context?.models) ? context.models : centralModels;
      const targetModel = activeModels[modelName];
      return Reflect.apply(targetModel as any, targetModel, argArray);
    },
    construct(_target, argArray, _newTarget) {
      const context = getTenantContext();
      const activeModels = (!context?.isCentral && context?.models) ? context.models : centralModels;
      const targetModel = activeModels[modelName];
      return Reflect.construct(targetModel as any, argArray, targetModel);
    }
  }) as ITenantModels[K];
}

// Transparent Dynamic Database Object Proxy
export const dynamicDb: ITenantModels = new Proxy({} as any, {
  get(_target: any, prop: string | symbol) {
    if (typeof prop === 'string') {
      const context = getTenantContext();
      const activeModels = (!context?.isCentral && context?.models) ? context.models : centralModels;
      return (activeModels as any)[prop];
    }
    return undefined;
  }
});

// Export individual dynamic model proxies for direct imports
export const Tenant = createDynamicModelProxy('Tenant');
export const AllCompany = createDynamicModelProxy('AllCompany');
export const User = createDynamicModelProxy('User');
export const Role = createDynamicModelProxy('Role');
export const Permission = createDynamicModelProxy('Permission');
export const RolePermission = createDynamicModelProxy('RolePermission');
export const Staff = createDynamicModelProxy('Staff');
export const PersonAssociated = createDynamicModelProxy('PersonAssociated');
export const Client = createDynamicModelProxy('Client');
export const ClientProfile = createDynamicModelProxy('ClientProfile');
export const ClientDocument = createDynamicModelProxy('ClientDocument');
export const ClientIdentityHistory = createDynamicModelProxy('ClientIdentityHistory');
export const PlanCategory = createDynamicModelProxy('PlanCategory');
export const Plan = createDynamicModelProxy('Plan');
export const Subscription = createDynamicModelProxy('Subscription');
export const Coupon = createDynamicModelProxy('Coupon');
export const Agreement = createDynamicModelProxy('Agreement');
export const AgreementHistory = createDynamicModelProxy('AgreementHistory');
export const Consent = createDynamicModelProxy('Consent');
export const ConsentHistory = createDynamicModelProxy('ConsentHistory');
export const Payment = createDynamicModelProxy('Payment');
export const ResearchReport = createDynamicModelProxy('ResearchReport');
export const ResearchAnalytics = createDynamicModelProxy('ResearchAnalytics');
export const ComplianceAlert = createDynamicModelProxy('ComplianceAlert');
export const AuditLog = createDynamicModelProxy('AuditLog');
export const NotificationLog = createDynamicModelProxy('NotificationLog');
export const SupportTicket = createDynamicModelProxy('SupportTicket');
export const TicketMessage = createDynamicModelProxy('TicketMessage');
export const Stock = createDynamicModelProxy('Stock');
export const Signal = createDynamicModelProxy('Signal');
export const SignalMessage = createDynamicModelProxy('SignalMessage');
export const ComplianceRequirement = createDynamicModelProxy('ComplianceRequirement');
export const ComplianceAudit = createDynamicModelProxy('ComplianceAudit');
export const ComplianceAuditHistory = createDynamicModelProxy('ComplianceAuditHistory');
export const Penalty = createDynamicModelProxy('Penalty');
export const Complaint = createDynamicModelProxy('Complaint');
export const ComplaintMonthlyReport = createDynamicModelProxy('ComplaintMonthlyReport');
export const Resource = createDynamicModelProxy('Resource');
export const TenantDocumentHistory = createDynamicModelProxy('TenantDocumentHistory');
export const State = createDynamicModelProxy('State');
export const CustomPage = createDynamicModelProxy('CustomPage');
export const EmailTemplate = createDynamicModelProxy('EmailTemplate');
export const EmailVerification = createDynamicModelProxy('EmailVerification');
export const SystemSetting = createDynamicModelProxy('SystemSetting');
export const AdminPermission = createDynamicModelProxy('AdminPermission');

export default dynamicDb;
