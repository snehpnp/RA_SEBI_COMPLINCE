export interface DefaultEmailTemplateDef {
  type: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  variableLabels?: Record<string, string>;
  sampleVariables?: Record<string, string>;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplateDef[] = [
  {
    type: 'WELCOME_CLIENT',
    name: 'Client Welcome & Onboarding',
    description: 'Sent to newly registered/onboarded clients with their portal login URL and initial credentials.',
    subject: 'Welcome to {{companyName}} — Your Account is Ready',
    body: `Hi {{clientName}},

Welcome to {{companyName}}! Your client portal account has been successfully created.

You can use the verified credentials below to log into your portal:
Portal URL: {{loginUrl}}
Email / Username: {{email}}
Temporary Password: {{temporaryPassword}}
Account Role: {{role}}

Please log in and update your password immediately in your profile settings.

Best regards,
{{companyName}} Compliance Team`,
    variables: ['clientName', 'email', 'temporaryPassword', 'loginUrl', 'role', 'companyName', 'supportEmail'],
    variableLabels: {
      clientName: 'Client Full Name',
      email: 'Client Registered Email',
      temporaryPassword: 'Generated Temporary Password',
      loginUrl: 'Portal Login URL',
      role: 'Assigned User Role (e.g. CLIENT)',
      companyName: 'Your SEBI Registered RA Company Name',
      supportEmail: 'Support Email Address'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      temporaryPassword: 'TempPass@2026',
      loginUrl: 'https://researchportal.in/login',
      role: 'CLIENT',
      companyName: 'Alpha Research Advisors',
      supportEmail: 'support@alpharesearch.in'
    }
  },
  {
    type: 'LOGIN_2FA',
    name: 'Login 2-Factor Authentication (OTP)',
    description: 'Sent when a user attempts to log into their account to verify their identity with a 6-digit code.',
    subject: 'Your Login Verification Code for {{companyName}}: {{otp}}',
    body: `Hello {{clientName}},

You are attempting to log into your account on {{companyName}}. Please enter the following 6-digit verification code to complete your login:

Verification Code: {{otp}}

This verification code is valid for {{expiryMinutes}} minutes. If you did not attempt to log in, please secure your account immediately.

Best regards,
{{companyName}} Security Team`,
    variables: ['clientName', 'otp', 'expiryMinutes', 'companyName'],
    variableLabels: {
      clientName: 'Client Full Name',
      otp: '6-Digit Verification Code',
      expiryMinutes: 'Validity Duration in Minutes',
      companyName: 'Company Name'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      otp: '482910',
      expiryMinutes: '10',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'REGISTRATION_OTP',
    name: 'Registration Email Verification OTP',
    description: 'Sent to verify client email address during initial registration/onboarding signup.',
    subject: 'Verify Your Email Address - {{companyName}}: {{otp}}',
    body: `Hello,

Thank you for registering with {{companyName}}. Please use the following One-Time Password (OTP) to complete your registration and verify your email address:

Verification OTP: {{otp}}

This OTP is valid for {{expiryMinutes}} minutes. If you did not request this verification, please ignore this email.

Best regards,
{{companyName}} Compliance Team`,
    variables: ['otp', 'expiryMinutes', 'companyName'],
    variableLabels: {
      otp: '6-Digit OTP Code',
      expiryMinutes: 'Validity Duration in Minutes',
      companyName: 'Company Name'
    },
    sampleVariables: {
      otp: '918234',
      expiryMinutes: '10',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'CHANGE_PASSWORD',
    name: 'Password Reset Request',
    description: 'Sent when a user requests a password reset with their temporary password and login link.',
    subject: 'Password Reset Request — {{companyName}}',
    body: `Hi {{userName}},

We received a password reset request for your account on {{companyName}}. Your temporary password is:

Temporary Password: {{temporaryPassword}}
Login URL: {{loginUrl}}

Please log in using this temporary password and update it immediately in your profile settings.

Best regards,
{{companyName}} Support Team`,
    variables: ['userName', 'temporaryPassword', 'loginUrl', 'companyName'],
    variableLabels: {
      userName: 'User / Client Name',
      temporaryPassword: 'New Temporary Password',
      loginUrl: 'Portal Login URL',
      companyName: 'Company Name'
    },
    sampleVariables: {
      userName: 'Rahul Sharma',
      temporaryPassword: 'Reset#77291!',
      loginUrl: 'https://researchportal.in/login',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'KYC_AGREEMENT',
    name: 'Signed Service Agreement (eSign)',
    description: 'Sent to the client along with the attached signed PDF agreement upon eSign completion.',
    subject: 'Your Signed Service Agreement — {{companyName}}',
    body: `Dear {{clientName}},

Thank you for completing your onboarding compliance. Your SEBI-mandated Research Analyst Service Agreement has been successfully signed and verified on {{agreementDate}}.

A full copy of your signed agreement has been attached to this email as a PDF. Please download and retain it for your regulatory and legal records.

You can also view or download this agreement at any time by logging into your client portal.

Best regards,
{{companyName}} Compliance Desk`,
    variables: ['clientName', 'companyName', 'agreementDate', 'maskedAadhaar'],
    variableLabels: {
      clientName: 'Client Full Name',
      companyName: 'Company Name',
      agreementDate: 'Date and Time of Signature Execution',
      maskedAadhaar: 'Masked Aadhaar Number (if available)'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      companyName: 'Alpha Research Advisors',
      agreementDate: '13 Oct 2026, 02:30 PM',
      maskedAadhaar: 'XXXX-XXXX-1234'
    }
  },
  {
    type: 'INVOICE',
    name: 'Tax Invoice & Payment Confirmation',
    description: 'Sent when a client subscribes to a plan or tax invoice is generated, with PDF attachment.',
    subject: 'Tax Invoice {{invoiceNumber}} for {{planName}} — {{companyName}}',
    body: `Dear {{clientName}},

Thank you for subscribing to our research services. Your official Tax Invoice has been generated and is attached to this email.

Invoice Number: {{invoiceNumber}}
Subscribed Plan: {{planName}}
Total Amount: {{amount}}
Invoice Date: {{invoiceDate}}

A detailed copy of your GST/Tax invoice is attached as a PDF. Please retain this for your financial records and tax filing.

Best regards,
{{companyName}} Accounts Desk`,
    variables: ['clientName', 'companyName', 'planName', 'invoiceNumber', 'amount', 'invoiceDate'],
    variableLabels: {
      clientName: 'Client Full Name',
      companyName: 'Company Name',
      planName: 'Subscribed Service / Plan Name',
      invoiceNumber: 'Unique Tax Invoice Number',
      amount: 'Invoice Amount (including GST)',
      invoiceDate: 'Date of Invoice Generation'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      companyName: 'Alpha Research Advisors',
      planName: 'Nifty Options Pro 6-Month',
      invoiceNumber: 'INV-2026-0042',
      amount: '₹14,160',
      invoiceDate: '13 Oct 2026'
    }
  },
  {
    type: 'ACCOUNT_ACTIVATED',
    name: 'Account Approval & Activation',
    description: 'Sent when a client account has been reviewed, approved, and activated by compliance.',
    subject: 'Account Activated — {{companyName}}',
    body: `Hi {{clientName}},

Your account on {{companyName}} has been successfully approved and activated. You can now log into your client portal and access all research recommendations and services.

Best regards,
{{companyName}} Team`,
    variables: ['clientName', 'companyName'],
    variableLabels: {
      clientName: 'Client Full Name',
      companyName: 'Company Name'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'ACCOUNT_DEACTIVATED',
    name: 'Account Deactivation Notice',
    description: 'Sent when an account is temporarily or permanently suspended or deactivated.',
    subject: 'Account Deactivated — {{companyName}}',
    body: `Hi {{clientName}},

Your account on {{companyName}} has been deactivated by the administrator. If you believe this was in error or require assistance, please contact our compliance support team.

Best regards,
{{companyName}} Support Team`,
    variables: ['clientName', 'companyName'],
    variableLabels: {
      clientName: 'Client Full Name',
      companyName: 'Company Name'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'COMPLAINT_NOTIFICATION',
    name: 'Investor Grievance / Complaint Alert',
    description: 'Sent to the compliance officer / admin when an investor lodges a grievance.',
    subject: 'Action Required: New Complaint from {{clientName}}',
    body: `A new grievance/complaint has been registered on the compliance desk:

Client Name: {{clientName}}
Client PAN: {{clientPan}}
Subject: {{complaintSubject}}
Description: {{description}}

Please log into the Compliance Desk to review, respond, and resolve this complaint within regulatory timelines.

Best regards,
{{companyName}} Grievance Desk`,
    variables: ['clientName', 'clientPan', 'complaintSubject', 'description', 'companyName'],
    variableLabels: {
      clientName: 'Client Full Name',
      clientPan: 'Client PAN Card Number',
      complaintSubject: 'Grievance Subject',
      description: 'Grievance Description / Details',
      companyName: 'Company Name'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      clientPan: 'ABCDE1234F',
      complaintSubject: 'Delay in advisory communication',
      description: 'Client reported delay receiving recommendation updates.',
      companyName: 'Alpha Research Advisors'
    }
  },
  {
    type: 'VIDEO_KYC_INVITE',
    name: 'Video KYC & IPV Verification Link',
    description: 'Sent to the client with the secure live two-way Video KYC link and instructions for completing their In-Person Verification (IPV).',
    subject: 'Complete Your SEBI Video KYC Verification — {{companyName}}',
    body: `Dear {{clientName}},

As per SEBI guidelines for Research Analyst services, please complete your interactive two-way Video KYC / Digital IPV verification.

Session Details:
Verification Link: {{videoKycUrl}}
Session Code / OTP: {{otpCode}}
PAN Card: {{pan}}

Instructions for the session:
1. Please keep your original PAN card handy (front and back).
2. Ensure you are in a well-lit and quiet room with a working camera and microphone.
3. You will be requested to read the on-screen consent statement aloud during the recording.
4. Allow camera, microphone, and location permissions when prompted in your browser.

Click here to start your Video KYC:
{{videoKycUrl}}

Best regards,
{{companyName}} Compliance & KYC Desk`,
    variables: ['clientName', 'companyName', 'videoKycUrl', 'otpCode', 'pan'],
    variableLabels: {
      clientName: 'Client Full Name',
      companyName: 'Company Name',
      videoKycUrl: 'Live Video KYC Session Link',
      otpCode: '4-Digit Verification Security Code',
      pan: 'Client PAN Card Number'
    },
    sampleVariables: {
      clientName: 'Rahul Sharma',
      companyName: 'Alpha Research Advisors',
      videoKycUrl: 'https://researchportal.in/video-kyc/VKYC-123456',
      otpCode: '4829',
      pan: 'ABCDE1234F'
    }
  }
];

/**
 * Replace all {{key}} occurrences in template text with actual values from data dictionary
 */
export function renderEmailTemplateString(template: string, data: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    return match;
  });
}
