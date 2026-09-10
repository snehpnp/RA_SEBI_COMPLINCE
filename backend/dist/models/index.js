"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogSchema = exports.AuditLog = exports.ComplianceAlertSchema = exports.ComplianceAlert = exports.ResearchAnalyticsSchema = exports.ResearchAnalytics = exports.ResearchReportSchema = exports.ResearchReport = exports.PaymentSchema = exports.Payment = exports.ConsentHistorySchema = exports.ConsentHistory = exports.ConsentSchema = exports.Consent = exports.AgreementHistorySchema = exports.AgreementHistory = exports.AgreementSchema = exports.Agreement = exports.CouponSchema = exports.Coupon = exports.SubscriptionSchema = exports.Subscription = exports.PlanSchema = exports.Plan = exports.PlanCategorySchema = exports.PlanCategory = exports.ClientIdentityHistorySchema = exports.ClientIdentityHistory = exports.ClientDocumentSchema = exports.ClientDocument = exports.ClientProfileSchema = exports.ClientProfile = exports.ClientSchema = exports.Client = exports.PersonAssociatedSchema = exports.PersonAssociated = exports.StaffSchema = exports.Staff = exports.RolePermissionSchema = exports.RolePermission = exports.PermissionSchema = exports.Permission = exports.RoleSchema = exports.Role = exports.UserSchema = exports.User = exports.AllCompanySchema = exports.AllCompany = exports.TenantSchema = exports.Tenant = void 0;
exports.AdminPermissionSchema = exports.AdminPermission = exports.SystemSettingSchema = exports.SystemSetting = exports.EmailVerificationSchema = exports.EmailVerification = exports.EmailTemplateSchema = exports.EmailTemplate = exports.CustomPageSchema = exports.CustomPage = exports.StateSchema = exports.State = exports.TenantDocumentHistorySchema = exports.TenantDocumentHistory = exports.ResourceSchema = exports.Resource = exports.ComplaintMonthlyReportSchema = exports.ComplaintMonthlyReport = exports.ComplaintSchema = exports.Complaint = exports.PenaltySchema = exports.Penalty = exports.ComplianceAuditHistorySchema = exports.ComplianceAuditHistory = exports.ComplianceAuditSchema = exports.ComplianceAudit = exports.ComplianceRequirementSchema = exports.ComplianceRequirement = exports.SignalMessageSchema = exports.SignalMessage = exports.SignalSchema = exports.Signal = exports.StockSchema = exports.Stock = exports.TicketMessageSchema = exports.TicketMessage = exports.SupportTicketSchema = exports.SupportTicket = exports.NotificationLogSchema = exports.NotificationLog = void 0;
exports.registerTenantModels = registerTenantModels;
// Import all Schemas & Models
const Tenant_1 = require("./Tenant");
Object.defineProperty(exports, "Tenant", { enumerable: true, get: function () { return Tenant_1.Tenant; } });
Object.defineProperty(exports, "TenantSchema", { enumerable: true, get: function () { return Tenant_1.TenantSchema; } });
const AllCompany_1 = require("./AllCompany");
Object.defineProperty(exports, "AllCompany", { enumerable: true, get: function () { return AllCompany_1.AllCompany; } });
Object.defineProperty(exports, "AllCompanySchema", { enumerable: true, get: function () { return AllCompany_1.AllCompanySchema; } });
const User_1 = require("./User");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return User_1.User; } });
Object.defineProperty(exports, "UserSchema", { enumerable: true, get: function () { return User_1.UserSchema; } });
const Role_1 = require("./Role");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return Role_1.Role; } });
Object.defineProperty(exports, "RoleSchema", { enumerable: true, get: function () { return Role_1.RoleSchema; } });
const Permission_1 = require("./Permission");
Object.defineProperty(exports, "Permission", { enumerable: true, get: function () { return Permission_1.Permission; } });
Object.defineProperty(exports, "PermissionSchema", { enumerable: true, get: function () { return Permission_1.PermissionSchema; } });
const RolePermission_1 = require("./RolePermission");
Object.defineProperty(exports, "RolePermission", { enumerable: true, get: function () { return RolePermission_1.RolePermission; } });
Object.defineProperty(exports, "RolePermissionSchema", { enumerable: true, get: function () { return RolePermission_1.RolePermissionSchema; } });
const Staff_1 = require("./Staff");
Object.defineProperty(exports, "Staff", { enumerable: true, get: function () { return Staff_1.Staff; } });
Object.defineProperty(exports, "StaffSchema", { enumerable: true, get: function () { return Staff_1.StaffSchema; } });
const PersonAssociated_1 = require("./PersonAssociated");
Object.defineProperty(exports, "PersonAssociated", { enumerable: true, get: function () { return PersonAssociated_1.PersonAssociated; } });
Object.defineProperty(exports, "PersonAssociatedSchema", { enumerable: true, get: function () { return PersonAssociated_1.PersonAssociatedSchema; } });
const Client_1 = require("./Client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return Client_1.Client; } });
Object.defineProperty(exports, "ClientSchema", { enumerable: true, get: function () { return Client_1.ClientSchema; } });
const ClientProfile_1 = require("./ClientProfile");
Object.defineProperty(exports, "ClientProfile", { enumerable: true, get: function () { return ClientProfile_1.ClientProfile; } });
Object.defineProperty(exports, "ClientProfileSchema", { enumerable: true, get: function () { return ClientProfile_1.ClientProfileSchema; } });
const ClientDocument_1 = require("./ClientDocument");
Object.defineProperty(exports, "ClientDocument", { enumerable: true, get: function () { return ClientDocument_1.ClientDocument; } });
Object.defineProperty(exports, "ClientDocumentSchema", { enumerable: true, get: function () { return ClientDocument_1.ClientDocumentSchema; } });
const ClientIdentityHistory_1 = require("./ClientIdentityHistory");
Object.defineProperty(exports, "ClientIdentityHistory", { enumerable: true, get: function () { return ClientIdentityHistory_1.ClientIdentityHistory; } });
Object.defineProperty(exports, "ClientIdentityHistorySchema", { enumerable: true, get: function () { return ClientIdentityHistory_1.ClientIdentityHistorySchema; } });
const PlanCategory_1 = require("./PlanCategory");
Object.defineProperty(exports, "PlanCategory", { enumerable: true, get: function () { return PlanCategory_1.PlanCategory; } });
Object.defineProperty(exports, "PlanCategorySchema", { enumerable: true, get: function () { return PlanCategory_1.PlanCategorySchema; } });
const Plan_1 = require("./Plan");
Object.defineProperty(exports, "Plan", { enumerable: true, get: function () { return Plan_1.Plan; } });
Object.defineProperty(exports, "PlanSchema", { enumerable: true, get: function () { return Plan_1.PlanSchema; } });
const Subscription_1 = require("./Subscription");
Object.defineProperty(exports, "Subscription", { enumerable: true, get: function () { return Subscription_1.Subscription; } });
Object.defineProperty(exports, "SubscriptionSchema", { enumerable: true, get: function () { return Subscription_1.SubscriptionSchema; } });
const Coupon_1 = require("./Coupon");
Object.defineProperty(exports, "Coupon", { enumerable: true, get: function () { return Coupon_1.Coupon; } });
Object.defineProperty(exports, "CouponSchema", { enumerable: true, get: function () { return Coupon_1.CouponSchema; } });
const Agreement_1 = require("./Agreement");
Object.defineProperty(exports, "Agreement", { enumerable: true, get: function () { return Agreement_1.Agreement; } });
Object.defineProperty(exports, "AgreementSchema", { enumerable: true, get: function () { return Agreement_1.AgreementSchema; } });
const AgreementHistory_1 = require("./AgreementHistory");
Object.defineProperty(exports, "AgreementHistory", { enumerable: true, get: function () { return AgreementHistory_1.AgreementHistory; } });
Object.defineProperty(exports, "AgreementHistorySchema", { enumerable: true, get: function () { return AgreementHistory_1.AgreementHistorySchema; } });
const Consent_1 = require("./Consent");
Object.defineProperty(exports, "Consent", { enumerable: true, get: function () { return Consent_1.Consent; } });
Object.defineProperty(exports, "ConsentSchema", { enumerable: true, get: function () { return Consent_1.ConsentSchema; } });
const ConsentHistory_1 = require("./ConsentHistory");
Object.defineProperty(exports, "ConsentHistory", { enumerable: true, get: function () { return ConsentHistory_1.ConsentHistory; } });
Object.defineProperty(exports, "ConsentHistorySchema", { enumerable: true, get: function () { return ConsentHistory_1.ConsentHistorySchema; } });
const Payment_1 = require("./Payment");
Object.defineProperty(exports, "Payment", { enumerable: true, get: function () { return Payment_1.Payment; } });
Object.defineProperty(exports, "PaymentSchema", { enumerable: true, get: function () { return Payment_1.PaymentSchema; } });
const ResearchReport_1 = require("./ResearchReport");
Object.defineProperty(exports, "ResearchReport", { enumerable: true, get: function () { return ResearchReport_1.ResearchReport; } });
Object.defineProperty(exports, "ResearchReportSchema", { enumerable: true, get: function () { return ResearchReport_1.ResearchReportSchema; } });
const ResearchAnalytics_1 = require("./ResearchAnalytics");
Object.defineProperty(exports, "ResearchAnalytics", { enumerable: true, get: function () { return ResearchAnalytics_1.ResearchAnalytics; } });
Object.defineProperty(exports, "ResearchAnalyticsSchema", { enumerable: true, get: function () { return ResearchAnalytics_1.ResearchAnalyticsSchema; } });
const ComplianceAlert_1 = require("./ComplianceAlert");
Object.defineProperty(exports, "ComplianceAlert", { enumerable: true, get: function () { return ComplianceAlert_1.ComplianceAlert; } });
Object.defineProperty(exports, "ComplianceAlertSchema", { enumerable: true, get: function () { return ComplianceAlert_1.ComplianceAlertSchema; } });
const AuditLog_1 = require("./AuditLog");
Object.defineProperty(exports, "AuditLog", { enumerable: true, get: function () { return AuditLog_1.AuditLog; } });
Object.defineProperty(exports, "AuditLogSchema", { enumerable: true, get: function () { return AuditLog_1.AuditLogSchema; } });
const NotificationLog_1 = require("./NotificationLog");
Object.defineProperty(exports, "NotificationLog", { enumerable: true, get: function () { return NotificationLog_1.NotificationLog; } });
Object.defineProperty(exports, "NotificationLogSchema", { enumerable: true, get: function () { return NotificationLog_1.NotificationLogSchema; } });
const SupportTicket_1 = require("./SupportTicket");
Object.defineProperty(exports, "SupportTicket", { enumerable: true, get: function () { return SupportTicket_1.SupportTicket; } });
Object.defineProperty(exports, "SupportTicketSchema", { enumerable: true, get: function () { return SupportTicket_1.SupportTicketSchema; } });
const TicketMessage_1 = require("./TicketMessage");
Object.defineProperty(exports, "TicketMessage", { enumerable: true, get: function () { return TicketMessage_1.TicketMessage; } });
Object.defineProperty(exports, "TicketMessageSchema", { enumerable: true, get: function () { return TicketMessage_1.TicketMessageSchema; } });
const Stock_1 = require("./Stock");
Object.defineProperty(exports, "Stock", { enumerable: true, get: function () { return Stock_1.Stock; } });
Object.defineProperty(exports, "StockSchema", { enumerable: true, get: function () { return Stock_1.StockSchema; } });
const Signal_1 = require("./Signal");
Object.defineProperty(exports, "Signal", { enumerable: true, get: function () { return Signal_1.Signal; } });
Object.defineProperty(exports, "SignalSchema", { enumerable: true, get: function () { return Signal_1.SignalSchema; } });
const SignalMessage_1 = require("./SignalMessage");
Object.defineProperty(exports, "SignalMessage", { enumerable: true, get: function () { return SignalMessage_1.SignalMessage; } });
Object.defineProperty(exports, "SignalMessageSchema", { enumerable: true, get: function () { return SignalMessage_1.SignalMessageSchema; } });
const ComplianceRequirement_1 = require("./ComplianceRequirement");
Object.defineProperty(exports, "ComplianceRequirement", { enumerable: true, get: function () { return ComplianceRequirement_1.ComplianceRequirement; } });
Object.defineProperty(exports, "ComplianceRequirementSchema", { enumerable: true, get: function () { return ComplianceRequirement_1.ComplianceRequirementSchema; } });
const ComplianceAudit_1 = require("./ComplianceAudit");
Object.defineProperty(exports, "ComplianceAudit", { enumerable: true, get: function () { return ComplianceAudit_1.ComplianceAudit; } });
Object.defineProperty(exports, "ComplianceAuditSchema", { enumerable: true, get: function () { return ComplianceAudit_1.ComplianceAuditSchema; } });
const ComplianceAuditHistory_1 = require("./ComplianceAuditHistory");
Object.defineProperty(exports, "ComplianceAuditHistory", { enumerable: true, get: function () { return ComplianceAuditHistory_1.ComplianceAuditHistory; } });
Object.defineProperty(exports, "ComplianceAuditHistorySchema", { enumerable: true, get: function () { return ComplianceAuditHistory_1.ComplianceAuditHistorySchema; } });
const Penalty_1 = require("./Penalty");
Object.defineProperty(exports, "Penalty", { enumerable: true, get: function () { return Penalty_1.Penalty; } });
Object.defineProperty(exports, "PenaltySchema", { enumerable: true, get: function () { return Penalty_1.PenaltySchema; } });
const Complaint_1 = require("./Complaint");
Object.defineProperty(exports, "Complaint", { enumerable: true, get: function () { return Complaint_1.Complaint; } });
Object.defineProperty(exports, "ComplaintSchema", { enumerable: true, get: function () { return Complaint_1.ComplaintSchema; } });
const ComplaintMonthlyReport_1 = require("./ComplaintMonthlyReport");
Object.defineProperty(exports, "ComplaintMonthlyReport", { enumerable: true, get: function () { return ComplaintMonthlyReport_1.ComplaintMonthlyReport; } });
Object.defineProperty(exports, "ComplaintMonthlyReportSchema", { enumerable: true, get: function () { return ComplaintMonthlyReport_1.ComplaintMonthlyReportSchema; } });
const Resource_1 = require("./Resource");
Object.defineProperty(exports, "Resource", { enumerable: true, get: function () { return Resource_1.Resource; } });
Object.defineProperty(exports, "ResourceSchema", { enumerable: true, get: function () { return Resource_1.ResourceSchema; } });
const TenantDocumentHistory_1 = require("./TenantDocumentHistory");
Object.defineProperty(exports, "TenantDocumentHistory", { enumerable: true, get: function () { return TenantDocumentHistory_1.TenantDocumentHistory; } });
Object.defineProperty(exports, "TenantDocumentHistorySchema", { enumerable: true, get: function () { return TenantDocumentHistory_1.TenantDocumentHistorySchema; } });
const State_1 = require("./State");
Object.defineProperty(exports, "State", { enumerable: true, get: function () { return State_1.State; } });
Object.defineProperty(exports, "StateSchema", { enumerable: true, get: function () { return State_1.StateSchema; } });
const CustomPage_1 = require("./CustomPage");
Object.defineProperty(exports, "CustomPage", { enumerable: true, get: function () { return CustomPage_1.CustomPage; } });
Object.defineProperty(exports, "CustomPageSchema", { enumerable: true, get: function () { return CustomPage_1.CustomPageSchema; } });
const EmailTemplate_1 = require("./EmailTemplate");
Object.defineProperty(exports, "EmailTemplate", { enumerable: true, get: function () { return EmailTemplate_1.EmailTemplate; } });
Object.defineProperty(exports, "EmailTemplateSchema", { enumerable: true, get: function () { return EmailTemplate_1.EmailTemplateSchema; } });
const EmailVerification_1 = require("./EmailVerification");
Object.defineProperty(exports, "EmailVerification", { enumerable: true, get: function () { return EmailVerification_1.EmailVerification; } });
Object.defineProperty(exports, "EmailVerificationSchema", { enumerable: true, get: function () { return EmailVerification_1.EmailVerificationSchema; } });
const SystemSetting_1 = require("./SystemSetting");
Object.defineProperty(exports, "SystemSetting", { enumerable: true, get: function () { return SystemSetting_1.SystemSetting; } });
Object.defineProperty(exports, "SystemSettingSchema", { enumerable: true, get: function () { return SystemSetting_1.SystemSettingSchema; } });
const AdminPermission_1 = require("./AdminPermission");
Object.defineProperty(exports, "AdminPermission", { enumerable: true, get: function () { return AdminPermission_1.AdminPermission; } });
Object.defineProperty(exports, "AdminPermissionSchema", { enumerable: true, get: function () { return AdminPermission_1.AdminPermissionSchema; } });
/**
 * Helper to register all schemas onto a dynamic Mongoose connection instance
 */
function registerTenantModels(connection) {
    const models = {
        Tenant: (connection.models.Tenant || connection.model('Tenant', Tenant_1.TenantSchema, 'Tenant')),
        AllCompany: (connection.models.AllCompany || connection.model('AllCompany', AllCompany_1.AllCompanySchema, 'all_companies')),
        User: (connection.models.User || connection.model('User', User_1.UserSchema, 'User')),
        Role: (connection.models.Role || connection.model('Role', Role_1.RoleSchema, 'Role')),
        Permission: (connection.models.Permission || connection.model('Permission', Permission_1.PermissionSchema, 'Permission')),
        RolePermission: (connection.models.RolePermission || connection.model('RolePermission', RolePermission_1.RolePermissionSchema, 'RolePermission')),
        Staff: (connection.models.Staff || connection.model('Staff', Staff_1.StaffSchema, 'Staff')),
        PersonAssociated: (connection.models.PersonAssociated || connection.model('PersonAssociated', PersonAssociated_1.PersonAssociatedSchema, 'PersonAssociated')),
        Client: (connection.models.Client || connection.model('Client', Client_1.ClientSchema, 'Client')),
        ClientProfile: (connection.models.ClientProfile || connection.model('ClientProfile', ClientProfile_1.ClientProfileSchema, 'ClientProfile')),
        ClientDocument: (connection.models.ClientDocument || connection.model('ClientDocument', ClientDocument_1.ClientDocumentSchema, 'ClientDocument')),
        ClientIdentityHistory: (connection.models.ClientIdentityHistory || connection.model('ClientIdentityHistory', ClientIdentityHistory_1.ClientIdentityHistorySchema, 'ClientIdentityHistory')),
        PlanCategory: (connection.models.PlanCategory || connection.model('PlanCategory', PlanCategory_1.PlanCategorySchema, 'PlanCategory')),
        Plan: (connection.models.Plan || connection.model('Plan', Plan_1.PlanSchema, 'Plan')),
        Subscription: (connection.models.Subscription || connection.model('Subscription', Subscription_1.SubscriptionSchema, 'Subscription')),
        Coupon: (connection.models.Coupon || connection.model('Coupon', Coupon_1.CouponSchema, 'Coupon')),
        Agreement: (connection.models.Agreement || connection.model('Agreement', Agreement_1.AgreementSchema, 'Agreement')),
        AgreementHistory: (connection.models.AgreementHistory || connection.model('AgreementHistory', AgreementHistory_1.AgreementHistorySchema, 'AgreementHistory')),
        Consent: (connection.models.Consent || connection.model('Consent', Consent_1.ConsentSchema, 'Consent')),
        ConsentHistory: (connection.models.ConsentHistory || connection.model('ConsentHistory', ConsentHistory_1.ConsentHistorySchema, 'ConsentHistory')),
        Payment: (connection.models.Payment || connection.model('Payment', Payment_1.PaymentSchema, 'Payment')),
        ResearchReport: (connection.models.ResearchReport || connection.model('ResearchReport', ResearchReport_1.ResearchReportSchema, 'ResearchReport')),
        ResearchAnalytics: (connection.models.ResearchAnalytics || connection.model('ResearchAnalytics', ResearchAnalytics_1.ResearchAnalyticsSchema, 'ResearchAnalytics')),
        ComplianceAlert: (connection.models.ComplianceAlert || connection.model('ComplianceAlert', ComplianceAlert_1.ComplianceAlertSchema, 'ComplianceAlert')),
        AuditLog: (connection.models.AuditLog || connection.model('AuditLog', AuditLog_1.AuditLogSchema, 'AuditLog')),
        NotificationLog: (connection.models.NotificationLog || connection.model('NotificationLog', NotificationLog_1.NotificationLogSchema, 'NotificationLog')),
        SupportTicket: (connection.models.SupportTicket || connection.model('SupportTicket', SupportTicket_1.SupportTicketSchema, 'SupportTicket')),
        TicketMessage: (connection.models.TicketMessage || connection.model('TicketMessage', TicketMessage_1.TicketMessageSchema, 'TicketMessage')),
        Stock: (connection.models.Stock || connection.model('Stock', Stock_1.StockSchema, 'Stock')),
        Signal: (connection.models.Signal || connection.model('Signal', Signal_1.SignalSchema, 'Signal')),
        SignalMessage: (connection.models.SignalMessage || connection.model('SignalMessage', SignalMessage_1.SignalMessageSchema, 'SignalMessage')),
        ComplianceRequirement: (connection.models.ComplianceRequirement || connection.model('ComplianceRequirement', ComplianceRequirement_1.ComplianceRequirementSchema, 'ComplianceRequirement')),
        ComplianceAudit: (connection.models.ComplianceAudit || connection.model('ComplianceAudit', ComplianceAudit_1.ComplianceAuditSchema, 'ComplianceAudit')),
        ComplianceAuditHistory: (connection.models.ComplianceAuditHistory || connection.model('ComplianceAuditHistory', ComplianceAuditHistory_1.ComplianceAuditHistorySchema, 'ComplianceAuditHistory')),
        Penalty: (connection.models.Penalty || connection.model('Penalty', Penalty_1.PenaltySchema, 'Penalty')),
        Complaint: (connection.models.Complaint || connection.model('Complaint', Complaint_1.ComplaintSchema, 'Complaint')),
        ComplaintMonthlyReport: (connection.models.ComplaintMonthlyReport || connection.model('ComplaintMonthlyReport', ComplaintMonthlyReport_1.ComplaintMonthlyReportSchema, 'ComplaintMonthlyReport')),
        Resource: (connection.models.Resource || connection.model('Resource', Resource_1.ResourceSchema, 'Resource')),
        TenantDocumentHistory: (connection.models.TenantDocumentHistory || connection.model('TenantDocumentHistory', TenantDocumentHistory_1.TenantDocumentHistorySchema, 'TenantDocumentHistory')),
        State: (connection.models.State || connection.model('State', State_1.StateSchema, 'State')),
        CustomPage: (connection.models.CustomPage || connection.model('CustomPage', CustomPage_1.CustomPageSchema, 'CustomPage')),
        EmailTemplate: (connection.models.EmailTemplate || connection.model('EmailTemplate', EmailTemplate_1.EmailTemplateSchema, 'EmailTemplate')),
        EmailVerification: (connection.models.EmailVerification || connection.model('EmailVerification', EmailVerification_1.EmailVerificationSchema, 'EmailVerification')),
        SystemSetting: (connection.models.SystemSetting || connection.model('SystemSetting', SystemSetting_1.SystemSettingSchema, 'SystemSetting')),
        AdminPermission: (connection.models.AdminPermission || connection.model('AdminPermission', AdminPermission_1.AdminPermissionSchema, 'AdminPermission'))
    };
    return {
        ...models,
        tenant: models.Tenant,
        allCompany: models.AllCompany,
        user: models.User,
        role: models.Role,
        permission: models.Permission,
        rolePermission: models.RolePermission,
        staff: models.Staff,
        personAssociated: models.PersonAssociated,
        client: models.Client,
        clientProfile: models.ClientProfile,
        clientDocument: models.ClientDocument,
        clientIdentityHistory: models.ClientIdentityHistory,
        planCategory: models.PlanCategory,
        plan: models.Plan,
        subscription: models.Subscription,
        coupon: models.Coupon,
        agreement: models.Agreement,
        agreementHistory: models.AgreementHistory,
        consent: models.Consent,
        consentHistory: models.ConsentHistory,
        payment: models.Payment,
        researchReport: models.ResearchReport,
        researchAnalytics: models.ResearchAnalytics,
        complianceAlert: models.ComplianceAlert,
        auditLog: models.AuditLog,
        notificationLog: models.NotificationLog,
        supportTicket: models.SupportTicket,
        ticketMessage: models.TicketMessage,
        stock: models.Stock,
        signal: models.Signal,
        signalMessage: models.SignalMessage,
        complianceRequirement: models.ComplianceRequirement,
        complianceAudit: models.ComplianceAudit,
        complianceAuditHistory: models.ComplianceAuditHistory,
        penalty: models.Penalty,
        complaint: models.Complaint,
        complaintMonthlyReport: models.ComplaintMonthlyReport,
        resource: models.Resource,
        tenantDocumentHistory: models.TenantDocumentHistory,
        state: models.State,
        customPage: models.CustomPage,
        emailTemplate: models.EmailTemplate,
        emailVerification: models.EmailVerification,
        systemSetting: models.SystemSetting,
        adminPermission: models.AdminPermission
    };
}
