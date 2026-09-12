import { Connection, Model } from 'mongoose';

// Import all Schemas & Models
import { Tenant, TenantSchema, ITenant } from './Tenant';
import { AllCompany, AllCompanySchema, IAllCompany } from './AllCompany';
import { User, UserSchema, IUser } from './User';
import { Role, RoleSchema, IRole } from './Role';
import { Permission, PermissionSchema, IPermission } from './Permission';
import { RolePermission, RolePermissionSchema, IRolePermission } from './RolePermission';
import { Staff, StaffSchema, IStaff } from './Staff';
import { PersonAssociated, PersonAssociatedSchema, IPersonAssociated } from './PersonAssociated';
import { Client, ClientSchema, IClient } from './Client';
import { ClientProfile, ClientProfileSchema, IClientProfile } from './ClientProfile';
import { ClientDocument, ClientDocumentSchema, IClientDocument } from './ClientDocument';
import { ClientIdentityHistory, ClientIdentityHistorySchema, IClientIdentityHistory } from './ClientIdentityHistory';
import { PlanCategory, PlanCategorySchema, IPlanCategory } from './PlanCategory';
import { Plan, PlanSchema, IPlan } from './Plan';
import { Subscription, SubscriptionSchema, ISubscription } from './Subscription';
import { Coupon, CouponSchema, ICoupon } from './Coupon';
import { Agreement, AgreementSchema, IAgreement } from './Agreement';
import { AgreementHistory, AgreementHistorySchema, IAgreementHistory } from './AgreementHistory';
import { Consent, ConsentSchema, IConsent } from './Consent';
import { ConsentHistory, ConsentHistorySchema, IConsentHistory } from './ConsentHistory';
import { Payment, PaymentSchema, IPayment } from './Payment';
import { ResearchReport, ResearchReportSchema, IResearchReport } from './ResearchReport';
import { ResearchAnalytics, ResearchAnalyticsSchema, IResearchAnalytics } from './ResearchAnalytics';
import { ComplianceAlert, ComplianceAlertSchema, IComplianceAlert } from './ComplianceAlert';
import { AuditLog, AuditLogSchema, IAuditLog } from './AuditLog';
import { NotificationLog, NotificationLogSchema, INotificationLog } from './NotificationLog';
import { SupportTicket, SupportTicketSchema, ISupportTicket } from './SupportTicket';
import { TicketMessage, TicketMessageSchema, ITicketMessage } from './TicketMessage';
import { Stock, StockSchema, IStock } from './Stock';
import { Signal, SignalSchema, ISignal } from './Signal';
import { SignalMessage, SignalMessageSchema, ISignalMessage } from './SignalMessage';
import { ComplianceRequirement, ComplianceRequirementSchema, IComplianceRequirement } from './ComplianceRequirement';
import { ComplianceAudit, ComplianceAuditSchema, IComplianceAudit } from './ComplianceAudit';
import { ComplianceAuditHistory, ComplianceAuditHistorySchema, IComplianceAuditHistory } from './ComplianceAuditHistory';
import { Penalty, PenaltySchema, IPenalty } from './Penalty';
import { Complaint, ComplaintSchema, IComplaint } from './Complaint';
import { ComplaintMonthlyReport, ComplaintMonthlyReportSchema, IComplaintMonthlyReport } from './ComplaintMonthlyReport';
import { Resource, ResourceSchema, IResource } from './Resource';
import { TenantDocumentHistory, TenantDocumentHistorySchema, ITenantDocumentHistory } from './TenantDocumentHistory';
import { State, StateSchema, IState } from './State';
import { CustomPage, CustomPageSchema, ICustomPage } from './CustomPage';
import { EmailTemplate, EmailTemplateSchema, IEmailTemplate } from './EmailTemplate';
import { EmailVerification, EmailVerificationSchema, IEmailVerification } from './EmailVerification';
import { SystemSetting, SystemSettingSchema, ISystemSetting } from './SystemSetting';
import { AdminPermission, AdminPermissionSchema, IAdminPermission } from './AdminPermission';

// Re-export all models and interfaces
export {
  Tenant, TenantSchema, ITenant,
  AllCompany, AllCompanySchema, IAllCompany,
  User, UserSchema, IUser,
  Role, RoleSchema, IRole,
  Permission, PermissionSchema, IPermission,
  RolePermission, RolePermissionSchema, IRolePermission,
  Staff, StaffSchema, IStaff,
  PersonAssociated, PersonAssociatedSchema, IPersonAssociated,
  Client, ClientSchema, IClient,
  ClientProfile, ClientProfileSchema, IClientProfile,
  ClientDocument, ClientDocumentSchema, IClientDocument,
  ClientIdentityHistory, ClientIdentityHistorySchema, IClientIdentityHistory,
  PlanCategory, PlanCategorySchema, IPlanCategory,
  Plan, PlanSchema, IPlan,
  Subscription, SubscriptionSchema, ISubscription,
  Coupon, CouponSchema, ICoupon,
  Agreement, AgreementSchema, IAgreement,
  AgreementHistory, AgreementHistorySchema, IAgreementHistory,
  Consent, ConsentSchema, IConsent,
  ConsentHistory, ConsentHistorySchema, IConsentHistory,
  Payment, PaymentSchema, IPayment,
  ResearchReport, ResearchReportSchema, IResearchReport,
  ResearchAnalytics, ResearchAnalyticsSchema, IResearchAnalytics,
  ComplianceAlert, ComplianceAlertSchema, IComplianceAlert,
  AuditLog, AuditLogSchema, IAuditLog,
  NotificationLog, NotificationLogSchema, INotificationLog,
  SupportTicket, SupportTicketSchema, ISupportTicket,
  TicketMessage, TicketMessageSchema, ITicketMessage,
  Stock, StockSchema, IStock,
  Signal, SignalSchema, ISignal,
  SignalMessage, SignalMessageSchema, ISignalMessage,
  ComplianceRequirement, ComplianceRequirementSchema, IComplianceRequirement,
  ComplianceAudit, ComplianceAuditSchema, IComplianceAudit,
  ComplianceAuditHistory, ComplianceAuditHistorySchema, IComplianceAuditHistory,
  Penalty, PenaltySchema, IPenalty,
  Complaint, ComplaintSchema, IComplaint,
  ComplaintMonthlyReport, ComplaintMonthlyReportSchema, IComplaintMonthlyReport,
  Resource, ResourceSchema, IResource,
  TenantDocumentHistory, TenantDocumentHistorySchema, ITenantDocumentHistory,
  State, StateSchema, IState,
  CustomPage, CustomPageSchema, ICustomPage,
  EmailTemplate, EmailTemplateSchema, IEmailTemplate,
  EmailVerification, EmailVerificationSchema, IEmailVerification,
  SystemSetting, SystemSettingSchema, ISystemSetting,
  AdminPermission, AdminPermissionSchema, IAdminPermission
};

/**
 * Interface mapping all models attached to a database connection
 */
export interface ITenantModels {
  // Uppercase
  Tenant: Model<ITenant>;
  AllCompany: Model<IAllCompany>;
  User: Model<IUser>;
  Role: Model<IRole>;
  Permission: Model<IPermission>;
  RolePermission: Model<IRolePermission>;
  Staff: Model<IStaff>;
  PersonAssociated: Model<IPersonAssociated>;
  Client: Model<IClient>;
  ClientProfile: Model<IClientProfile>;
  ClientDocument: Model<IClientDocument>;
  ClientIdentityHistory: Model<IClientIdentityHistory>;
  PlanCategory: Model<IPlanCategory>;
  Plan: Model<IPlan>;
  Subscription: Model<ISubscription>;
  Coupon: Model<ICoupon>;
  Agreement: Model<IAgreement>;
  AgreementHistory: Model<IAgreementHistory>;
  Consent: Model<IConsent>;
  ConsentHistory: Model<IConsentHistory>;
  Payment: Model<IPayment>;
  ResearchReport: Model<IResearchReport>;
  ResearchAnalytics: Model<IResearchAnalytics>;
  ComplianceAlert: Model<IComplianceAlert>;
  AuditLog: Model<IAuditLog>;
  NotificationLog: Model<INotificationLog>;
  SupportTicket: Model<ISupportTicket>;
  TicketMessage: Model<ITicketMessage>;
  Stock: Model<IStock>;
  Signal: Model<ISignal>;
  SignalMessage: Model<ISignalMessage>;
  ComplianceRequirement: Model<IComplianceRequirement>;
  ComplianceAudit: Model<IComplianceAudit>;
  ComplianceAuditHistory: Model<IComplianceAuditHistory>;
  Penalty: Model<IPenalty>;
  Complaint: Model<IComplaint>;
  ComplaintMonthlyReport: Model<IComplaintMonthlyReport>;
  Resource: Model<IResource>;
  TenantDocumentHistory: Model<ITenantDocumentHistory>;
  State: Model<IState>;
  CustomPage: Model<ICustomPage>;
  EmailTemplate: Model<IEmailTemplate>;
  EmailVerification: Model<IEmailVerification>;
  SystemSetting: Model<ISystemSetting>;
  AdminPermission: Model<IAdminPermission>;

  // Lowercase / camelCase aliases
  tenant: Model<ITenant>;
  allCompany: Model<IAllCompany>;
  user: Model<IUser>;
  role: Model<IRole>;
  permission: Model<IPermission>;
  rolePermission: Model<IRolePermission>;
  staff: Model<IStaff>;
  personAssociated: Model<IPersonAssociated>;
  client: Model<IClient>;
  clientProfile: Model<IClientProfile>;
  clientDocument: Model<IClientDocument>;
  clientIdentityHistory: Model<IClientIdentityHistory>;
  planCategory: Model<IPlanCategory>;
  plan: Model<IPlan>;
  subscription: Model<ISubscription>;
  coupon: Model<ICoupon>;
  agreement: Model<IAgreement>;
  agreementHistory: Model<IAgreementHistory>;
  consent: Model<IConsent>;
  consentHistory: Model<IConsentHistory>;
  payment: Model<IPayment>;
  researchReport: Model<IResearchReport>;
  researchAnalytics: Model<IResearchAnalytics>;
  complianceAlert: Model<IComplianceAlert>;
  auditLog: Model<IAuditLog>;
  notificationLog: Model<INotificationLog>;
  supportTicket: Model<ISupportTicket>;
  ticketMessage: Model<ITicketMessage>;
  stock: Model<IStock>;
  signal: Model<ISignal>;
  signalMessage: Model<ISignalMessage>;
  complianceRequirement: Model<IComplianceRequirement>;
  complianceAudit: Model<IComplianceAudit>;
  complianceAuditHistory: Model<IComplianceAuditHistory>;
  penalty: Model<IPenalty>;
  complaint: Model<IComplaint>;
  complaintMonthlyReport: Model<IComplaintMonthlyReport>;
  resource: Model<IResource>;
  tenantDocumentHistory: Model<ITenantDocumentHistory>;
  state: Model<IState>;
  customPage: Model<ICustomPage>;
  emailTemplate: Model<IEmailTemplate>;
  emailVerification: Model<IEmailVerification>;
  systemSetting: Model<ISystemSetting>;
  adminPermission: Model<IAdminPermission>;

  [key: string]: any;
}

/**
 * Helper to register all schemas onto a dynamic Mongoose connection instance
 */
export function registerTenantModels(connection: Connection): ITenantModels {
  const models = {
    Tenant: (connection.models.Tenant || connection.model<ITenant>('Tenant', TenantSchema, 'Tenant')) as Model<ITenant>,
    AllCompany: (connection.models.AllCompany || connection.model<IAllCompany>('AllCompany', AllCompanySchema, 'all_companies')) as Model<IAllCompany>,
    User: (connection.models.User || connection.model<IUser>('User', UserSchema, 'User')) as Model<IUser>,
    Role: (connection.models.Role || connection.model<IRole>('Role', RoleSchema, 'Role')) as Model<IRole>,
    Permission: (connection.models.Permission || connection.model<IPermission>('Permission', PermissionSchema, 'Permission')) as Model<IPermission>,
    RolePermission: (connection.models.RolePermission || connection.model<IRolePermission>('RolePermission', RolePermissionSchema, 'RolePermission')) as Model<IRolePermission>,
    Staff: (connection.models.Staff || connection.model<IStaff>('Staff', StaffSchema, 'Staff')) as Model<IStaff>,
    PersonAssociated: (connection.models.PersonAssociated || connection.model<IPersonAssociated>('PersonAssociated', PersonAssociatedSchema, 'PersonAssociated')) as Model<IPersonAssociated>,
    Client: (connection.models.Client || connection.model<IClient>('Client', ClientSchema, 'Client')) as Model<IClient>,
    ClientProfile: (connection.models.ClientProfile || connection.model<IClientProfile>('ClientProfile', ClientProfileSchema, 'ClientProfile')) as Model<IClientProfile>,
    ClientDocument: (connection.models.ClientDocument || connection.model<IClientDocument>('ClientDocument', ClientDocumentSchema, 'ClientDocument')) as Model<IClientDocument>,
    ClientIdentityHistory: (connection.models.ClientIdentityHistory || connection.model<IClientIdentityHistory>('ClientIdentityHistory', ClientIdentityHistorySchema, 'ClientIdentityHistory')) as Model<IClientIdentityHistory>,
    PlanCategory: (connection.models.PlanCategory || connection.model<IPlanCategory>('PlanCategory', PlanCategorySchema, 'PlanCategory')) as Model<IPlanCategory>,
    Plan: (connection.models.Plan || connection.model<IPlan>('Plan', PlanSchema, 'Plan')) as Model<IPlan>,
    Subscription: (connection.models.Subscription || connection.model<ISubscription>('Subscription', SubscriptionSchema, 'Subscription')) as Model<ISubscription>,
    Coupon: (connection.models.Coupon || connection.model<ICoupon>('Coupon', CouponSchema, 'Coupon')) as Model<ICoupon>,
    Agreement: (connection.models.Agreement || connection.model<IAgreement>('Agreement', AgreementSchema, 'Agreement')) as Model<IAgreement>,
    AgreementHistory: (connection.models.AgreementHistory || connection.model<IAgreementHistory>('AgreementHistory', AgreementHistorySchema, 'AgreementHistory')) as Model<IAgreementHistory>,
    Consent: (connection.models.Consent || connection.model<IConsent>('Consent', ConsentSchema, 'Consent')) as Model<IConsent>,
    ConsentHistory: (connection.models.ConsentHistory || connection.model<IConsentHistory>('ConsentHistory', ConsentHistorySchema, 'ConsentHistory')) as Model<IConsentHistory>,
    Payment: (connection.models.Payment || connection.model<IPayment>('Payment', PaymentSchema, 'Payment')) as Model<IPayment>,
    ResearchReport: (connection.models.ResearchReport || connection.model<IResearchReport>('ResearchReport', ResearchReportSchema, 'ResearchReport')) as Model<IResearchReport>,
    ResearchAnalytics: (connection.models.ResearchAnalytics || connection.model<IResearchAnalytics>('ResearchAnalytics', ResearchAnalyticsSchema, 'ResearchAnalytics')) as Model<IResearchAnalytics>,
    ComplianceAlert: (connection.models.ComplianceAlert || connection.model<IComplianceAlert>('ComplianceAlert', ComplianceAlertSchema, 'ComplianceAlert')) as Model<IComplianceAlert>,
    AuditLog: (connection.models.AuditLog || connection.model<IAuditLog>('AuditLog', AuditLogSchema, 'AuditLog')) as Model<IAuditLog>,
    NotificationLog: (connection.models.NotificationLog || connection.model<INotificationLog>('NotificationLog', NotificationLogSchema, 'NotificationLog')) as Model<INotificationLog>,
    SupportTicket: (connection.models.SupportTicket || connection.model<ISupportTicket>('SupportTicket', SupportTicketSchema, 'SupportTicket')) as Model<ISupportTicket>,
    TicketMessage: (connection.models.TicketMessage || connection.model<ITicketMessage>('TicketMessage', TicketMessageSchema, 'TicketMessage')) as Model<ITicketMessage>,
    Stock: (connection.models.Stock || connection.model<IStock>('Stock', StockSchema, 'Stock')) as Model<IStock>,
    Signal: (connection.models.Signal || connection.model<ISignal>('Signal', SignalSchema, 'Signal')) as Model<ISignal>,
    SignalMessage: (connection.models.SignalMessage || connection.model<ISignalMessage>('SignalMessage', SignalMessageSchema, 'SignalMessage')) as Model<ISignalMessage>,
    ComplianceRequirement: (connection.models.ComplianceRequirement || connection.model<IComplianceRequirement>('ComplianceRequirement', ComplianceRequirementSchema, 'ComplianceRequirement')) as Model<IComplianceRequirement>,
    ComplianceAudit: (connection.models.ComplianceAudit || connection.model<IComplianceAudit>('ComplianceAudit', ComplianceAuditSchema, 'ComplianceAudit')) as Model<IComplianceAudit>,
    ComplianceAuditHistory: (connection.models.ComplianceAuditHistory || connection.model<IComplianceAuditHistory>('ComplianceAuditHistory', ComplianceAuditHistorySchema, 'ComplianceAuditHistory')) as Model<IComplianceAuditHistory>,
    Penalty: (connection.models.Penalty || connection.model<IPenalty>('Penalty', PenaltySchema, 'Penalty')) as Model<IPenalty>,
    Complaint: (connection.models.Complaint || connection.model<IComplaint>('Complaint', ComplaintSchema, 'Complaint')) as Model<IComplaint>,
    ComplaintMonthlyReport: (connection.models.ComplaintMonthlyReport || connection.model<IComplaintMonthlyReport>('ComplaintMonthlyReport', ComplaintMonthlyReportSchema, 'ComplaintMonthlyReport')) as Model<IComplaintMonthlyReport>,
    Resource: (connection.models.Resource || connection.model<IResource>('Resource', ResourceSchema, 'Resource')) as Model<IResource>,
    TenantDocumentHistory: (connection.models.TenantDocumentHistory || connection.model<ITenantDocumentHistory>('TenantDocumentHistory', TenantDocumentHistorySchema, 'TenantDocumentHistory')) as Model<ITenantDocumentHistory>,
    State: (connection.models.State || connection.model<IState>('State', StateSchema, 'State')) as Model<IState>,
    CustomPage: (connection.models.CustomPage || connection.model<ICustomPage>('CustomPage', CustomPageSchema, 'CustomPage')) as Model<ICustomPage>,
    EmailTemplate: (connection.models.EmailTemplate || connection.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema, 'EmailTemplate')) as Model<IEmailTemplate>,
    EmailVerification: (connection.models.EmailVerification || connection.model<IEmailVerification>('EmailVerification', EmailVerificationSchema, 'EmailVerification')) as Model<IEmailVerification>,
    SystemSetting: (connection.models.SystemSetting || connection.model<ISystemSetting>('SystemSetting', SystemSettingSchema, 'SystemSetting')) as Model<ISystemSetting>,
    AdminPermission: (connection.models.AdminPermission || connection.model<IAdminPermission>('AdminPermission', AdminPermissionSchema, 'AdminPermission')) as Model<IAdminPermission>
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
