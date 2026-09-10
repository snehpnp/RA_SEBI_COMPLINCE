"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermission = exports.SystemSetting = exports.EmailVerification = exports.EmailTemplate = exports.CustomPage = exports.State = exports.TenantDocumentHistory = exports.Resource = exports.ComplaintMonthlyReport = exports.Complaint = exports.Penalty = exports.ComplianceAuditHistory = exports.ComplianceAudit = exports.ComplianceRequirement = exports.SignalMessage = exports.Signal = exports.Stock = exports.TicketMessage = exports.SupportTicket = exports.NotificationLog = exports.AuditLog = exports.ComplianceAlert = exports.ResearchAnalytics = exports.ResearchReport = exports.Payment = exports.ConsentHistory = exports.Consent = exports.AgreementHistory = exports.Agreement = exports.Coupon = exports.Subscription = exports.Plan = exports.PlanCategory = exports.ClientIdentityHistory = exports.ClientDocument = exports.ClientProfile = exports.Client = exports.PersonAssociated = exports.Staff = exports.RolePermission = exports.Permission = exports.Role = exports.User = exports.AllCompany = exports.Tenant = exports.dynamicDb = exports.centralModels = exports.centralConnection = void 0;
const tenantConnectionManager_1 = require("../services/tenantConnectionManager");
Object.defineProperty(exports, "centralConnection", { enumerable: true, get: function () { return tenantConnectionManager_1.centralConnection; } });
Object.defineProperty(exports, "centralModels", { enumerable: true, get: function () { return tenantConnectionManager_1.centralModels; } });
const tenantContext_1 = require("./tenantContext");
/**
 * Creates a dynamic proxy for a specific model that automatically resolves to the
 * active request's tenant connection model from AsyncLocalStorage.
 */
function createDynamicModelProxy(modelName) {
    const dummyFn = function () { };
    return new Proxy(dummyFn, {
        get(_target, prop) {
            const context = (0, tenantContext_1.getTenantContext)();
            const activeModels = (!context?.isCentral && context?.models) ? context.models : tenantConnectionManager_1.centralModels;
            const targetModel = activeModels[modelName];
            if (!targetModel)
                return undefined;
            const value = targetModel[prop];
            if (typeof value === 'function') {
                return value.bind(targetModel);
            }
            return value;
        },
        apply(_target, _thisArg, argArray) {
            const context = (0, tenantContext_1.getTenantContext)();
            const activeModels = (!context?.isCentral && context?.models) ? context.models : tenantConnectionManager_1.centralModels;
            const targetModel = activeModels[modelName];
            return Reflect.apply(targetModel, targetModel, argArray);
        },
        construct(_target, argArray, _newTarget) {
            const context = (0, tenantContext_1.getTenantContext)();
            const activeModels = (!context?.isCentral && context?.models) ? context.models : tenantConnectionManager_1.centralModels;
            const targetModel = activeModels[modelName];
            return Reflect.construct(targetModel, argArray, targetModel);
        }
    });
}
// Transparent Dynamic Database Object Proxy
exports.dynamicDb = new Proxy({}, {
    get(_target, prop) {
        if (typeof prop === 'string') {
            const context = (0, tenantContext_1.getTenantContext)();
            const activeModels = (!context?.isCentral && context?.models) ? context.models : tenantConnectionManager_1.centralModels;
            return activeModels[prop];
        }
        return undefined;
    }
});
// Export individual dynamic model proxies for direct imports
exports.Tenant = createDynamicModelProxy('Tenant');
exports.AllCompany = createDynamicModelProxy('AllCompany');
exports.User = createDynamicModelProxy('User');
exports.Role = createDynamicModelProxy('Role');
exports.Permission = createDynamicModelProxy('Permission');
exports.RolePermission = createDynamicModelProxy('RolePermission');
exports.Staff = createDynamicModelProxy('Staff');
exports.PersonAssociated = createDynamicModelProxy('PersonAssociated');
exports.Client = createDynamicModelProxy('Client');
exports.ClientProfile = createDynamicModelProxy('ClientProfile');
exports.ClientDocument = createDynamicModelProxy('ClientDocument');
exports.ClientIdentityHistory = createDynamicModelProxy('ClientIdentityHistory');
exports.PlanCategory = createDynamicModelProxy('PlanCategory');
exports.Plan = createDynamicModelProxy('Plan');
exports.Subscription = createDynamicModelProxy('Subscription');
exports.Coupon = createDynamicModelProxy('Coupon');
exports.Agreement = createDynamicModelProxy('Agreement');
exports.AgreementHistory = createDynamicModelProxy('AgreementHistory');
exports.Consent = createDynamicModelProxy('Consent');
exports.ConsentHistory = createDynamicModelProxy('ConsentHistory');
exports.Payment = createDynamicModelProxy('Payment');
exports.ResearchReport = createDynamicModelProxy('ResearchReport');
exports.ResearchAnalytics = createDynamicModelProxy('ResearchAnalytics');
exports.ComplianceAlert = createDynamicModelProxy('ComplianceAlert');
exports.AuditLog = createDynamicModelProxy('AuditLog');
exports.NotificationLog = createDynamicModelProxy('NotificationLog');
exports.SupportTicket = createDynamicModelProxy('SupportTicket');
exports.TicketMessage = createDynamicModelProxy('TicketMessage');
exports.Stock = createDynamicModelProxy('Stock');
exports.Signal = createDynamicModelProxy('Signal');
exports.SignalMessage = createDynamicModelProxy('SignalMessage');
exports.ComplianceRequirement = createDynamicModelProxy('ComplianceRequirement');
exports.ComplianceAudit = createDynamicModelProxy('ComplianceAudit');
exports.ComplianceAuditHistory = createDynamicModelProxy('ComplianceAuditHistory');
exports.Penalty = createDynamicModelProxy('Penalty');
exports.Complaint = createDynamicModelProxy('Complaint');
exports.ComplaintMonthlyReport = createDynamicModelProxy('ComplaintMonthlyReport');
exports.Resource = createDynamicModelProxy('Resource');
exports.TenantDocumentHistory = createDynamicModelProxy('TenantDocumentHistory');
exports.State = createDynamicModelProxy('State');
exports.CustomPage = createDynamicModelProxy('CustomPage');
exports.EmailTemplate = createDynamicModelProxy('EmailTemplate');
exports.EmailVerification = createDynamicModelProxy('EmailVerification');
exports.SystemSetting = createDynamicModelProxy('SystemSetting');
exports.AdminPermission = createDynamicModelProxy('AdminPermission');
exports.default = exports.dynamicDb;
