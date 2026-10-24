import { base_api_url, getDscBridgeUrl, setDscBridgeUrl } from '../utils/config';

const getApiBaseUrl = () => {
  return base_api_url;
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }
    }

    return headers;
  }

  getBaseUrl() {
    return API_BASE_URL.replace('/api/v1', '');
  }

  getDownloadUrl(url: string) {
    if (!url) return '';
    return `${API_BASE_URL}/download?path=${encodeURIComponent(url)}`;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const headers = this.getHeaders((options.headers as Record<string, string>) || {});

    // Check if body is FormData (e.g. file upload), then let browser set boundary header
    const isFormData = options.body instanceof FormData;
    if (isFormData && headers instanceof Object) {
      const headersObj = headers as Record<string, string>;
      delete headersObj['Content-Type'];
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 || response.status === 403) {
      const clone = response.clone();
      const data = await clone.json().catch(() => ({}));

      const isAuthError = response.status === 401 ||
        (response.status === 403 && (
          data.errors?.includes('User inactive or suspended') ||
          data.errors?.includes('User inactive') ||
          data.errors?.includes('Tenant suspended') ||
          data.errors?.includes('User suspended') ||
          (data.message && data.message.toLowerCase().includes('suspended'))
        ));

      if (isAuthError && !endpoint.startsWith('/auth/') && endpoint !== '/admin/tenant/go-live') {
        if (typeof window !== 'undefined') {
          if ((window as any).__isRedirecting) return new Promise(() => { });
          (window as any).__isRedirecting = true;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('tenantId');

          const isAdminRoute = window.location.pathname.startsWith('/admin') ||
            window.location.pathname.startsWith('/compliance-officer') ||
            window.location.pathname.startsWith('/researcher');
          const loginPath = isAdminRoute ? '/admin/login' : '/login';

          const isSuspended = (data.errors && (data.errors.includes('Tenant suspended') || data.errors.includes('User suspended'))) ||
            (data.message && data.message.toLowerCase().includes('suspended'));

          if (isSuspended) {
            window.location.href = `${loginPath}?error=suspended`;
          } else if (response.status === 403) {
            window.location.href = `${loginPath}?error=inactive`;
          } else {
            window.location.href = `${loginPath}?error=expired`;
          }
        }
        return new Promise(() => { }); // Never resolve to prevent multiple alerts from component catch blocks
      }
    }

    let data: any = {};
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        message: text && text.length < 200 && !text.includes('<!DOCTYPE')
          ? text
          : (response.status === 404 ? 'Resource or API route not found.' : `Server returned error (${response.status}: ${response.statusText})`)
      };
    }

    if (!response.ok) {
      let errorMessage = data?.message || data?.error || (data?.errors && data.errors[0]) || `Request failed with status ${response.status}`;
      
      // Clean up raw database duplicate errors into user-friendly message
      if (typeof errorMessage === 'string' && (errorMessage.includes('E11000') || errorMessage.includes('duplicate key') || errorMessage.includes('findAndModify'))) {
        if (/\bemail\b/i.test(errorMessage)) {
          errorMessage = 'This email address is already registered. Please login or use a different email.';
        } else if (/\b(mobile|phone)\b/i.test(errorMessage)) {
          errorMessage = 'This mobile number is already registered. Please login or use a different number.';
        } else if (/\b(pan|pan_1|pan_unique_partial)\b/i.test(errorMessage) || /index:\s*pan/i.test(errorMessage) || /dup key:\s*\{\s*pan:/i.test(errorMessage)) {
          const match = errorMessage.match(/dup key:\s*\{\s*pan:\s*"([^"]+)"/i) || errorMessage.match(/\{ pan:\s*"([^"]+)"\s*\}/i);
          errorMessage = match ? `PAN card (${match[1]}) is already registered with another account. Please use another PAN.` : 'This PAN card is already registered with another account. Please use another PAN.';
        } else if (/\baadhaar\b/i.test(errorMessage)) {
          errorMessage = 'This Aadhaar number is already registered with another account.';
        } else {
          errorMessage = 'A duplicate record already exists with these details. Please use another.';
        }
      }

      const err = new Error(errorMessage) as any;
      err.response = { data, status: response.status };
      err.status = response.status;
      err.duplicateField = data?.duplicateField;
      err.duplicateFields = data?.duplicateFields || [];
      err.errors = data?.errors;
      throw err;
    }
    return data;
  }

  async get(endpoint: string, options: RequestInit = {}) {
    const data = await this.request(endpoint, { ...options, method: 'GET' });
    return { data };
  }

  async post(endpoint: string, payload?: any, options: RequestInit = {}) {
    const data = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: payload ? (payload instanceof FormData ? payload : JSON.stringify(payload)) : undefined,
    });
    return { data };
  }

  async put(endpoint: string, payload?: any, options: RequestInit = {}) {
    const data = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: payload ? (payload instanceof FormData ? payload : JSON.stringify(payload)) : undefined,
    });
    return { data };
  }

  async delete(endpoint: string, options: RequestInit = {}) {
    const data = await this.request(endpoint, { ...options, method: 'DELETE' });
    return { data };
  }

  async patch(endpoint: string, payload?: any, options: RequestInit = {}) {
    const data = await this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: payload ? (payload instanceof FormData ? payload : JSON.stringify(payload)) : undefined,
    });
    return { data };
  }

  // Auth Methods
  async login(payload: any) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.success && res.data?.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.tenantId) {
        localStorage.setItem('tenantId', res.data.user.tenantId);
      }
    }
    return res;
  }

  async requestLoginOtp(identifier: string) {
    return this.request('/auth/request-login-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  async loginWithOtp(identifier: string, otp: string) {
    const res = await this.request('/auth/login-with-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp })
    });
    if (res.success && res.data?.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.tenantId) {
        localStorage.setItem('tenantId', res.data.user.tenantId);
      }
    }
    return res;
  }

  async verify2FA(payload: { tempToken: string; otp: string; type?: 'EMAIL' | 'SMS' }) {
    const res = await this.request('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({
        twoFactorToken: payload.tempToken,
        otp: payload.otp,
        type: payload.type
      })
    });
    if (res.success && res.data?.accessToken) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user?.tenantId) {
        localStorage.setItem('tenantId', res.data.user.tenantId);
      }
    }
    return res;
  }

  async resend2FA(payload: { tempToken: string; type?: 'EMAIL' | 'SMS' }) {
    return this.request('/auth/resend-2fa', {
      method: 'POST',
      body: JSON.stringify({
        twoFactorToken: payload.tempToken,
        type: payload.type
      })
    });
  }

  async getSecurityPolicy(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/auth/security-policy${query}`);
  }

  async logout(allDevices: boolean = false) {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ allDevices })
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
  }

  // Super Admin Methods
  async getTenants() {
    return this.request('/super-admin/tenants');
  }

  async getPublicTenants() {
    return this.request('/public/tenants');
  }

  async getTenantDocumentHistory(id: string) {
    return this.request(`/super-admin/tenants/${id}/documents`);
  }

  async getTenantClients(id: string) {
    return this.request(`/super-admin/tenants/${id}/clients`);
  }

  async getTenantStaff(id: string) {
    try {
      const res = await this.request(`/super-admin/tenants/${id}/staff`);
      if (res && res.success) return res;
    } catch (err) {
      // If 404 or backend server is running older process without restart, fallback to tenant details
    }

    try {
      const tenantRes = await this.request(`/super-admin/tenants/${id}`);
      if (tenantRes && (tenantRes.success || tenantRes.data)) {
        const rawTenant = tenantRes.data?.tenant || tenantRes.tenant || {};
        const rawUsers = rawTenant.users || tenantRes.data?.users || [];
        const allStaff = (tenantRes.data?.allStaff || rawUsers.filter((u: any) => (u.role?.name || '').toUpperCase() !== 'CLIENT')).map((u: any) => ({
          id: u.staff?.id || u.id,
          userId: u.id,
          employeeId: u.staff?.employeeId || u.employeeCode || `EMP-${(u.id || '').slice(-4).toUpperCase()}`,
          name: u.staff?.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Staff Member',
          email: u.staff?.email || u.email,
          mobile: u.staff?.mobile || u.mobile,
          role: u.role?.name || u.role || 'STAFF',
          status: u.staff?.status || u.status || 'ACTIVE',
          nismNumber: u.staff?.nismNumber || null,
          nismValidity: u.staff?.nismValidity || null,
          joiningDate: u.staff?.joiningDate || u.createdAt,
          createdAt: u.createdAt
        }));

        return {
          success: true,
          source: 'LOCAL_DATABASE',
          company: rawTenant,
          count: allStaff.length,
          data: allStaff
        };
      }
    } catch (fallbackErr: any) {
      return { success: false, message: fallbackErr.message || 'Failed to fetch staff' };
    }

    return { success: false, message: 'Failed to fetch staff' };
  }

  async getTenantCompliance(id?: string) {
    if (id && id !== 'ALL' && id !== 'all') {
      try {
        const res = await this.request(`/super-admin/tenants/${id}/compliance`);
        if (res && (res.success || res.data)) return res;
      } catch (e) {
        // Fallback to compliance metrics with query param
        return this.request(`/compliance/dashboard-metrics?tenantId=${id}`);
      }
    }
    return this.request('/super-admin/tenants/ALL/compliance').catch(() =>
      this.request('/compliance/dashboard-metrics')
    );
  }

  async runTenantComplianceSweep(id?: string) {
    if (id && id !== 'ALL' && id !== 'all') {
      try {
        const res = await this.request(`/super-admin/tenants/${id}/compliance/sweep`, { method: 'POST' });
        if (res && res.success) return res;
      } catch (e) {
        return this.request(`/compliance/check?tenantId=${id}`, { method: 'POST' });
      }
    }
    return this.request('/super-admin/tenants/ALL/compliance/sweep', { method: 'POST' }).catch(() =>
      this.request('/compliance/check', { method: 'POST' })
    );
  }

  async createTenant(formData: FormData) {
    return this.request('/super-admin/tenants', {
      method: 'POST',
      body: formData
    });
  }

  async createTenantJson(payload: any) {
    return this.request('/super-admin/tenants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async toggleTenantStatus(id: string, status: string) {
    return this.request(`/super-admin/tenants/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  async provisionTenantDb(id: string) {
    return this.request(`/super-admin/tenants/${id}/provision-db`, {
      method: 'POST'
    });
  }

  async syncTenantApi(id: string, targetUrl?: string) {
    return this.request(`/super-admin/tenants/${id}/sync-api`, {
      method: 'POST',
      body: JSON.stringify({ targetUrl })
    });
  }

  async syncAllTenants() {
    return this.request('/super-admin/tenants/sync-all', {
      method: 'POST'
    });
  }

  async getAuditLogs() {
    return this.request('/super-admin/logs');
  }

  async getStates() {
    return this.request('/locations/states');
  }

  async getTelemetry() {
    try {
      const res = await this.request('/super-admin/dashboard');
      if (res && res.success) return res;
      return await this.request('/super-admin/telemetry');
    } catch {
      return this.request('/super-admin/telemetry');
    }
  }

  async getSuperAdminDashboard() {
    return this.getTelemetry();
  }

  async getCompanyPanelStats(companyId: string) {
    return this.request(`/super-admin/companies/${companyId}/panel-stats`);
  }

  async verifyDomainUrl(domainUrl: string) {
    return this.request('/super-admin/verify-domain', {
      method: 'POST',
      body: JSON.stringify({ domainUrl })
    });
  }

  async testMongoConnection(mongoDbUrl: string) {
    return this.request('/super-admin/test-mongo-connection', {
      method: 'POST',
      body: JSON.stringify({ mongoDbUrl })
    });
  }

  async parseSebiCertificate(formData: FormData) {
    return this.request('/super-admin/parse-sebi-certificate', {
      method: 'POST',
      body: formData
    });
  }

  async parseNismCertificate(formData: FormData) {
    return this.request('/super-admin/parse-nism-certificate', {
      method: 'POST',
      body: formData
    });
  }

  async getSuperAdminComplianceRules() {
    return this.request('/super-admin/compliance-rules');
  }

  async updateSuperAdminComplianceRule(id: string, data: any) {
    return this.request(`/super-admin/compliance-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Admin Methods
  async adminParseNismCertificate(formData: FormData) {
    return this.request('/admin/parse-nism-certificate', {
      method: 'POST',
      body: formData
    });
  }

  async getTenantAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  async getProfileCompleteness() {
    return this.request('/admin/profile-completeness');
  }

  async saveProfileStep(step: string, data: any) {
    if (data.nismFile) {
      const formData = new FormData();
      formData.append('step', step);
      const { nismFile, ...restData } = data;
      formData.append('data', JSON.stringify(restData));
      formData.append('nismFile', nismFile);

      return this.request('/admin/profile-wizard', {
        method: 'POST',
        body: formData
      });
    }

    return this.request('/admin/profile-wizard', {
      method: 'POST',
      body: JSON.stringify({ step, data })
    });
  }

  async getStaff() {
    return this.request('/admin/staff');
  }

  async createStaff(formData: FormData) {
    return this.request('/admin/staff', {
      method: 'POST',
      body: formData
    });
  }

  async updateStaff(id: string, formData: FormData) {
    return this.request(`/admin/staff/${id}`, {
      method: 'PUT',
      body: formData
    });
  }

  async toggleStaffStatus(id: string) {
    return this.request(`/admin/staff/${id}/status`, {
      method: 'POST'
    });
  }

  async deleteStaff(id: string) {
    try {
      return await this.request(`/admin/staff/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        return await this.request(`/admin/staff/${id}/delete`, {
          method: 'POST'
        });
      }
      throw err;
    }
  }

  async restoreStaff(id: string) {
    return this.request(`/admin/staff/${id}/restore`, {
      method: 'POST'
    });
  }

  async getStaffPassword(id: string) {
    return this.request(`/admin/staff/${id}/password`);
  }

  async resendStaffPassword(id: string) {
    return this.request(`/admin/staff/${id}/resend-password`, {
      method: 'POST'
    });
  }

  // Admin Client Management
  async getAdminClients() {
    return this.request('/admin/clients');
  }

  async getClientCommunicationsAdmin(id: string) {
    return this.request(`/admin/clients/${id}/communications`);
  }

  async getClientTimelineAdmin(id: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '') as any).toString() : '';
    return this.request(`/admin/clients/${id}/timeline${query}`);
  }

  async getAdminDeletedClients() {
    return this.request('/admin/clients/deleted');
  }

  async toggleAdminClientStatus(id: string) {
    return this.request(`/admin/clients/${id}/status`, { method: 'POST' });
  }

  async approveClient(id: string) {
    return this.request(`/admin/clients/${id}/approve`, { method: 'PUT' });
  }

  async updateAdminClient(id: string, payload: any) {
    return this.request(`/admin/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteAdminClient(id: string) {
    try {
      return await this.request(`/admin/clients/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        return await this.request(`/admin/clients/${id}/delete`, {
          method: 'POST'
        });
      }
      throw err;
    }
  }

  async restoreAdminClient(id: string) {
    return this.request(`/admin/clients/${id}/restore`, {
      method: 'POST'
    });
  }

  async assignPlanByAdmin(clientId: string, payload: { planId: string; remarks?: string; paymentRefId: string; paymentDate: string; couponCode?: string }) {
    return this.request(`/admin/clients/${clientId}/assign-plan`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAdminCategories() {
    return this.request('/admin/categories');
  }

  async createCategory(payload: any) {
    return this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateCategory(id: string, payload: any) {
    return this.request(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async updateTenantSettings(formData: FormData) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: formData
    });
  }

  async toggleCategoryStatus(id: string) {
    return this.request(`/admin/categories/${id}/status`, { method: 'POST' });
  }

  // Admin Plan Management
  async getAdminPlans() {
    return this.request('/admin/plans');
  }

  async createPlan(payload: any) {
    return this.request('/admin/plans', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePlan(id: string, payload: any) {
    return this.request(`/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async togglePlanStatus(id: string) {
    return this.request(`/admin/plans/${id}/status`, { method: 'POST' });
  }

  async deletePlan(id: string) {
    try {
      return await this.request(`/admin/plans/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err?.status === 404 || (err?.message && err.message.includes('404'))) {
        return await this.request(`/admin/plans/${id}/delete`, { method: 'POST' });
      }
      throw err;
    }
  }

  async restorePlan(id: string) {
    return this.request(`/admin/plans/${id}/restore`, { method: 'POST' });
  }

  // Client Onboarding & KYC Methods
  async registerClient(payload: any) {
    return this.request('/client/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getClientProfile() {
    return this.request('/client/profile');
  }

  async updateProfile(payload: any) {
    return this.request('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async updateClientTelegram(payload: { isTelegramTradeEnabled?: boolean; telegramChatId?: string; telegramUsername?: string }) {
    return this.request('/client/telegram', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async testClientTelegramPing() {
    return this.request('/client/telegram/test-ping', {
      method: 'POST'
    });
  }


  async verifyKRA(payload: { pan: string; statusInput?: string; aadhaar?: string; digioResponse?: any }) {
    return this.request('/client/kyc/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }



  async acceptConsent(payload: any) {
    return this.request('/client/consent', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteClientAccount() {
    return this.request('/client/account', { method: 'DELETE' });
  }

  async signAgreement(payload?: { signatureText?: string, documentId?: string, digioResponse?: any }) {
    return this.request('/client/esign', {
      method: 'POST',
      body: JSON.stringify(payload || { signatureText: 'eSign Verified' })
    });
  }

  async getPlans() {
    return this.request('/client/plans');
  }

  async submitManualPayment(formData: FormData) {
    return this.request('/client/payments/manual', {
      method: 'POST',
      body: formData
    });
  }

  async getAdminPayments(page = 1, limit = 50, search = '') {
    return this.request(`/admin/payments?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  }

  async verifyManualPayment(payload: { paymentId: string; status: string; remarks: string }) {
    return this.request('/admin/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async sendPaymentInvoiceEmail(paymentId: string) {
    return this.request(`/admin/payments/${paymentId}/send-email`, {
      method: 'POST'
    });
  }

  async simulateRazorpayWebhook(payload: any) {
    return fetch(`${API_BASE_URL}/webhook/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
  }

  async getPaymentGatewayStatus() {
    return this.request('/payment/gateway-status');
  }

  async initiateCCAvenuePayment(payload: { planId: string, couponCode?: string }) {
    return this.request('/payment/ccavenue/initiate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async initiateRazorpayPayment(payload: { planId: string, couponCode?: string }) {
    return this.request('/payment/razorpay/initiate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyRazorpayPayment(payload: { razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string, planId: string, couponCode?: string }) {
    return this.request('/payment/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Research Analyst Methods
  async refreshToken(refreshTokenStr: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token: refreshTokenStr })
    });
  }

  async forgotPassword(payload: { email?: string; username?: string; identifier?: string }) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async changePassword(data: any) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createResearch(payload: any) {
    return this.request('/research', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateResearch(id: string, payload: any) {
    return this.request(`/research/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async publishResearch(id: string, checklist: { acceptTnc: boolean; acceptPolicy: boolean; acceptConsent: boolean }) {
    return this.request(`/research/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(checklist)
    });
  }

  async listResearch() {
    return this.request('/research/list');
  }

  async getResearchDetail(id: string) {
    return this.request(`/research/${id}/detail`);
  }

  // Compliance Methods
  async runComplianceCheck() {
    return this.request('/compliance/check', { method: 'POST' });
  }

  async getComplianceAlerts() {
    return this.request('/compliance/alerts');
  }

  async closeComplianceAlert(id: string, formData: FormData) {
    return this.request(`/compliance/alerts/${id}/close`, {
      method: 'POST',
      body: formData
    });
  }

  async getComplianceChecklist() {
    return this.request('/compliance/checklist');
  }

  async getComplianceChecklistHistory() {
    return this.request('/compliance/checklist/history');
  }

  async updateAuditStatus(requirementId: string, formData: FormData) {
    return this.request(`/compliance/checklist/${requirementId}`, {
      method: 'POST',
      body: formData
    });
  }

  async getPenalties() {
    return this.request('/compliance/penalties');
  }

  async resolvePenalty(id: string, formData: FormData) {
    return this.request(`/compliance/penalties/${id}/resolve`, {
      method: 'POST',
      body: formData
    });
  }

  // Client Portal & Tickets
  async getClientSubscriptions() {
    return this.request('/client/subscriptions');
  }

  async getClientPayments() {
    return this.request('/client/payments');
  }

  async downloadInvoicePdf(paymentId: string, filename: string) {
    const headers = this.getHeaders();
    delete (headers as any)['Content-Type']; // Let browser handle it for blob

    const response = await fetch(`${API_BASE_URL}/client/payments/${paymentId}/invoice`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  async updateClientProfile(data: any) {
    return this.request('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getClientNotifications() {
    return this.request('/client/notifications');
  }

  async markClientNotificationsAsRead(notificationId?: string) {
    return this.request('/client/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationId })
    });
  }

  async getAdminNotifications() {
    return this.request('/admin/notifications');
  }

  async markAdminNotificationsAsRead(notificationId?: string) {
    return this.request('/admin/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationId })
    });
  }

  async getMarketOverview() {
    return this.request('/client/market-overview');
  }

  async getNewsFeed() {
    return this.request('/client/news-feed');
  }

  async createTicket(data: any) {
    return this.request('/client/tickets', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async listTickets() {
    return this.request('/client/tickets');
  }

  async getTicket(id: string) {
    return this.request(`/client/tickets/${id}`);
  }

  async replyTicket(id: string, data: any) {
    return this.request(`/client/tickets/${id}/reply`, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async listAdminTickets() {
    return this.request('/admin/tickets');
  }

  async getAdminTicket(id: string) {
    return this.request(`/admin/tickets/${id}`);
  }

  async replyAdminTicket(id: string, data: any) {
    return this.request(`/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }

  async closeAdminTicket(id: string) {
    return this.request(`/admin/tickets/${id}/close`, {
      method: 'POST'
    });
  }

  // FAQ APIs
  async getFaqs() {
    return this.request('/faqs');
  }

  async getAdminFaqs(params?: { search?: string; category?: string }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.category) qs.append('category', params.category);
    const queryStr = qs.toString();
    return this.request(`/admin/faqs${queryStr ? `?${queryStr}` : ''}`);
  }

  async createFaq(data: { question: string; answer: string; category?: string; order?: number; isActive?: boolean }) {
    return this.request('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFaq(id: string, data: any) {
    return this.request(`/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteFaq(id: string) {
    return this.request(`/admin/faqs/${id}`, {
      method: 'DELETE'
    });
  }

  async getStocks(query?: string) {
    return this.request(`/stocks${query ? `?query=${query}` : ''}`);
  }

  async getSignals() {
    return this.request('/signals');
  }

  async createSignal(data: any) {
    return this.request('/signals', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? undefined : { 'Content-Type': 'application/json' }
    });
  }

  async closeSignal(id: string, data: any) {
    return this.request(`/signals/${id}/close`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async uploadSignalReport(id: string, formData: FormData) {
    return this.request(`/signals/${id}/report`, {
      method: 'POST',
      body: formData,
    });
  }

  // Multi-Channel Trade Delivery Reports & Telegram Bot
  async getMasterDeliveryReport(params: {
    page?: number;
    limit?: number;
    channel?: string;
    status?: string;
    search?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.channel) searchParams.set('channel', params.channel);
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.clientId) searchParams.set('clientId', params.clientId);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    const qs = searchParams.toString();
    return this.request(`/signals/delivery-reports/master${qs ? `?${qs}` : ''}`);
  }

  async getChannelDeliveryReport(channel: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    const qs = searchParams.toString();
    return this.request(`/signals/delivery-reports/channel/${channel}${qs ? `?${qs}` : ''}`);
  }

  async syncSmsDeliveryReports(logId?: string) {
    return this.request('/signals/delivery-reports/sync-dlr', {
      method: 'POST',
      body: JSON.stringify(logId ? { logId } : {})
    });
  }

  async testTelegramBot(botToken?: string) {
    return this.request('/admin/telegram/test', {
      method: 'POST',
      body: JSON.stringify({ botToken })
    });
  }

  // Roles & Access Control
  async getRoles() {
    return this.request('/admin/roles');
  }

  async createRole(payload: { name: string; description: string; requiresNism?: boolean; twoFactorAuth?: 'DISABLED' | 'EMAIL_OTP' | 'SMS_OTP' | 'BOTH' }) {
    return this.request('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateRolePermissions(roleId: string, permissions: string[]) {
    return this.request(`/admin/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions })
    });
  }

  async updateRole(id: string, payload: { name?: string; description?: string; allowMultiDeviceLogin?: boolean; requiresNism?: boolean; twoFactorAuth?: 'DISABLED' | 'EMAIL_OTP' | 'SMS_OTP' | 'BOTH' }) {
    return this.request(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteRole(id: string) {
    return this.request(`/admin/roles/${id}`, {
      method: 'DELETE'
    });
  }

  // Complaints & Grievances
  async getComplaints() {
    return this.request('/compliance/complaints');
  }

  async logAdminComplaint(payload: any) {
    return this.request('/compliance/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createComplaint(payload: any) {
    return this.request('/compliance/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async resolveComplaint(id: string, formData: FormData) {
    return this.request(`/compliance/complaints/${id}/resolve`, {
      method: 'PUT',
      body: formData
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Resources Methods
  async getResources() {
    return this.request('/resources');
  }

  async uploadResource(formData: FormData) {
    return this.request('/super-admin/resources', {
      method: 'POST',
      body: formData
    });
  }

  async deleteResource(id: string) {
    return this.request(`/super-admin/resources/${id}`, {
      method: 'DELETE'
    });
  }

  // Periodic Report
  async getPeriodicReportData(startDate?: string, endDate?: string) {
    let url = '/compliance/periodic-report-data';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('_t', Date.now().toString()); // Cache buster
    if (params.toString()) url += `?${params.toString()}`;
    return this.request(url);
  }

  async getPeriodicReportMeta() {
    return this.request('/compliance/periodic-report-meta');
  }

  // Digio Dynamic KYC and eSign
  async initiateDigioKyc() {
    return this.request('/client/kyc/initiate-digio', { method: 'POST' });
  }

  async initiateDigioAgreement() {
    return this.request('/client/agreement/initiate', { method: 'POST' });
  }

  async updateDigioStatus(data: {
    type: string;
    status: string;
    kycId?: string;
    digioKycId?: string;
    documentId?: string;
    signatureText?: string;
    digioResponse?: any;
    [key: string]: any;
  }) {
    return this.request('/client/kyc/status', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testDigioConfig(data: { digioClientId?: string, digioClientSecret?: string, digioEnvironment?: string }) {
    return this.request('/admin/test-digio', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async fetchDigioRecord(data: { digioId?: string; kycDigioId?: string; esignDigioId?: string; clientId?: string; saveToClient?: boolean }) {
    return this.request('/admin/digio/fetch-by-id', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testCamsKra(data: { camsClientCode?: string; camsClientId?: string; camsClientSecret?: string; camsPoscode?: string }) {
    return this.request('/admin/test-cams-kra', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async fetchCamsRecord(data: { pan: string; dob?: string; clientId?: string; saveToClient?: boolean }) {
    return this.request('/admin/cams-kra/fetch-pan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ── Researcher Signature & eSign & DSC ────────────────
  async getResearcherSignatureSettings() {
    return this.request('/researcher/signature-settings');
  }

  async updateResearcherSignatureSettings(data: {
    signatureMode?: 'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN';
    dscSettings?: { placement?: string; signScope?: string; registeredCertSerial?: string | null };
    signatureUrl?: string | null;
  }) {
    return this.request('/researcher/signature-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async uploadResearcherSignature(formData: FormData) {
    return this.request('/researcher/signature/upload', {
      method: 'POST',
      body: formData
    });
  }

  async initiateReportAadhaarEsign(formData: FormData) {
    return this.request('/researcher/esign/initiate', {
      method: 'POST',
      body: formData
    });
  }

  async completeReportAadhaarEsign(data: { documentId: string; signalId: string }) {
    return this.request('/researcher/esign/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async useDailyAadhaarSign(formData: FormData) {
    return this.request('/researcher/esign/use-daily-stamp', {
      method: 'POST',
      body: formData
    });
  }

  async saveDscSignedReport(formData: FormData) {
    return this.request('/researcher/dsc/save-signed-report', {
      method: 'POST',
      body: formData
    });
  }

  async verifyDscToken(signerName: string) {
    return this.request('/researcher/dsc/verify-token', {
      method: 'POST',
      body: JSON.stringify({ signerName })
    });
  }

  getDscBridgeUrl() {
    return getDscBridgeUrl();
  }

  setDscBridgeUrl(url: string) {
    setDscBridgeUrl(url);
  }

  async checkDscBridgeStatus(customBridgeUrl?: string, timeoutMs = 3500) {
    const isLive = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    // Candidate URLs: on live site, probe local bridge (127.0.0.1:1620) first where USB token is inserted
    const candidateUrls: string[] = [];
    if (customBridgeUrl) {
      candidateUrls.push(customBridgeUrl);
    } else {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('dsc_bridge_url') : null;
      if (saved && saved.trim()) {
        candidateUrls.push(saved.trim());
      }
      if (isLive) {
        candidateUrls.push('http://127.0.0.1:1620');
        candidateUrls.push('http://localhost:1620');
      }
      const defaultUrl = getDscBridgeUrl();
      if (!candidateUrls.includes(defaultUrl)) {
        candidateUrls.push(defaultUrl);
      }
      if (!isLive && !candidateUrls.includes('http://127.0.0.1:1620')) {
        candidateUrls.push('http://127.0.0.1:1620');
      }
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    let lastError: any = null;
    for (const bridgeUrl of candidateUrls) {
      const controller = new AbortController();
      const perUrlTimeout = candidateUrls.length > 1 ? Math.min(timeoutMs, 1800) : timeoutMs;
      const timeoutId = setTimeout(() => controller.abort(), perUrlTimeout);

      try {
        const res = await fetch(`${bridgeUrl}/token-status`, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.detected || data.success)) {
            data.bridgeUrlUsed = bridgeUrl;
            return data;
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    throw lastError || new Error('Could not connect to any DSC hardware bridge');
  }

  async signPdfWithDscBridge(payload: {
    pdfBase64: string;
    pin: string;
    placement?: string;
    signScope?: string;
    signerName?: string;
    reason?: string;
    location?: string;
  }, customBridgeUrl?: string) {
    const bridgeUrl = customBridgeUrl || getDscBridgeUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await fetch(`${bridgeUrl}/sign-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `DSC bridge error (HTTP ${res.status})`);
    }
    return await res.json();
  }

  async pingDscBridge(customBridgeUrl?: string, timeoutMs = 2000) {
    const bridgeUrl = customBridgeUrl || getDscBridgeUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${bridgeUrl}/ping`, {
        method: 'GET',
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Bridge returned HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async getResearcherDscPermissions() {
    return this.request('/admin/researcher-dsc-permissions');
  }

  async updateResearcherDscPermission(id: string, dscSigningScope: 'DISABLED' | 'SELF' | 'ALL') {
    return this.request(`/admin/researcher-dsc-permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ dscSigningScope })
    });
  }

  // Coupon Methods
  async getCoupons() {
    return this.request('/admin/coupons');
  }

  async getClientCoupons() {
    return this.request('/client/coupons');
  }

  async createCoupon(payload: any) {
    return this.request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateCoupon(id: string, payload: any) {
    return this.request(`/admin/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async toggleCouponVisibility(id: string) { return this.request(`/admin/coupons/${id}/visibility`, { method: 'POST' }); }

  async toggleCouponStatus(id: string) {
    return this.request(`/admin/coupons/${id}/status`, { method: 'POST' });
  }

  async applyCoupon(code: string) {
    return this.request('/client/coupons/apply', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async requestOtp(param: string | { email?: string; mobile?: string; type?: 'EMAIL' | 'MOBILE'; tenantId?: string }, tenantId?: string) {
    const payload = typeof param === 'string' ? { email: param, tenantId } : param;
    return this.request('/public/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyOtp(param: string | { email?: string; mobile?: string; otp: string; type?: 'EMAIL' | 'MOBILE' }, otp?: string) {
    const payload = typeof param === 'string' ? { email: param, otp: otp! } : param;
    return this.request('/public/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
  async testSmtpConnection(data: any) {
    return this.request('/admin/test-smtp-connection', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyPaymentGateway(data: any) {
    return this.request('/admin/verify-payment-gateway', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Occupations
  async getOccupations(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return this.request(`/occupations${query}`);
  }

  async getAdminOccupations() {
    return this.request('/admin/occupations');
  }

  async createOccupation(data: { name: string }) {
    return this.request('/admin/occupations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateOccupation(id: string, data: { name: string }) {
    return this.request(`/admin/occupations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async toggleOccupationStatus(id: string) {
    return this.request(`/admin/occupations/${id}/status`, {
      method: 'POST'
    });
  }

  async deleteOccupation(id: string) {
    return this.request(`/admin/occupations/${id}`, {
      method: 'DELETE' 
    });
  }

  // Dynamic Email Templates
  async getEmailTemplates() {
    return this.request('/admin/email-templates');
  }

  async updateEmailTemplate(type: string, data: { subject: string; body: string }) {
    return this.request(`/admin/email-templates/${encodeURIComponent(type)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async resetEmailTemplate(type: string) {
    return this.request(`/admin/email-templates/${encodeURIComponent(type)}/reset`, {
      method: 'POST'
    });
  }

  // SMS Gateway & Templates
  async getSmsTemplates() {
    return this.request('/admin/sms-templates');
  }

  async createSmsTemplate(data: {
    name: string;
    dltTemplateId: string;
    category?: string;
    applicableSegments?: string[];
    applicableActions?: string[];
    applicableCombinations?: string[];
    content: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.request('/admin/sms-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSmsTemplate(id: string, data: {
    name?: string;
    dltTemplateId?: string;
    category?: string;
    applicableSegments?: string[];
    applicableActions?: string[];
    applicableCombinations?: string[];
    content?: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.request(`/admin/sms-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async toggleSmsTemplateStatus(id: string) {
    return this.request(`/admin/sms-templates/${id}/status`, {
      method: 'POST'
    });
  }

  async deleteSmsTemplate(id: string) {
    return this.request(`/admin/sms-templates/${id}`, {
      method: 'DELETE'
    });
  }

  async testSmsGateway(data: {
    mobile?: string;
    destMobile?: string;
    templateId?: string;
    message?: string;
    dltTemplateId?: string;
    username?: string;
    password?: string;
    senderId?: string;
    entityId?: string;
  }) {
    return this.request('/admin/sms/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Client Digital Vaults & File Explorer
  async getClientVaults(params?: { search?: string; planStatusFilter?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.planStatusFilter) q.append('planStatusFilter', params.planStatusFilter);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/admin/vaults${qs}`);
  }

  async getClientVaultDetails(clientId: string) {
    return this.request(`/admin/vaults/${clientId}`);
  }

  async downloadVaultInvoice(clientId: string, paymentId: string, invoiceNumber?: string) {
    return this.downloadVaultFile(
      `/admin/vaults/${clientId}/invoice/${paymentId}`,
      `Invoice_${invoiceNumber || paymentId}.pdf`
    );
  }

  async downloadVaultAgreement(clientId: string, clientName?: string) {
    return this.downloadVaultFile(
      `/admin/vaults/${clientId}/agreement`,
      `Signed_Service_Agreement_${clientName || 'Client'}.pdf`
    );
  }

  async downloadVaultResearchReport(clientId: string, reportId: string, fallbackTitle?: string) {
    return this.downloadVaultFile(
      `/admin/vaults/${clientId}/research-report/${reportId}`,
      `${fallbackTitle ? fallbackTitle.replace(/[^a-zA-Z0-9_-]/g, '_') : `Research_Report_${reportId}`}.pdf`
    );
  }

  async uploadCallRecording(clientId: string, formData: FormData) {
    return this.request(`/admin/vaults/${clientId}/recordings`, {
      method: 'POST',
      body: formData
    });
  }

  async deleteCallRecording(clientId: string, recordingId: string) {
    return this.request(`/admin/vaults/${clientId}/recordings/${recordingId}`, {
      method: 'DELETE'
    });
  }

  async downloadVaultFile(endpoint: string, fallbackFilename: string) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const disposition = response.headers.get('content-disposition');
    let filename = fallbackFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async downloadFileFromUrl(fileUrl?: string | null, fallbackFilename?: string) {
    if (!fileUrl) return;
    try {
      const fullUrl = fileUrl.startsWith('http')
        ? fileUrl
        : `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '';

      const response = await fetch(fullUrl, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(tenantId ? { 'x-tenant-id': tenantId } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const disposition = response.headers.get('content-disposition');
      let filename = fallbackFilename;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      if (!filename) {
        filename = fileUrl.split('/').pop()?.split('?')[0] || 'download';
      }

      // Ensure proper extension
      if (!filename.includes('.')) {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('png')) filename += '.png';
        else if (ct.includes('jpeg') || ct.includes('jpg')) filename += '.jpg';
        else if (ct.includes('webm')) filename += '.webm';
        else if (ct.includes('mp4')) filename += '.mp4';
        else if (ct.includes('pdf')) filename += '.pdf';
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.warn('Direct fetch download failed, attempting direct anchor download:', err);
      const fullUrl = fileUrl.startsWith('http')
        ? fileUrl
        : `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl}`;
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = fallbackFilename || fileUrl.split('/').pop()?.split('?')[0] || 'download';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 1000);
    }
  }

  async getClientTimeline(clientId: string, params?: { category?: string; search?: string; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/admin/clients/${clientId}/timeline${qs}`);
  }

  // Video KYC Methods
  async createVideoKycSession(payload: { clientId?: string; customConsentText?: string; scheduleType?: 'INSTANT' | 'SCHEDULED'; scheduledAt?: string | null; origin?: string }) {
    return this.request('/video-kyc/create-session', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async startEarlyVideoKycSession(sessionId: string) {
    return this.request(`/video-kyc/start-early/${sessionId}`, {
      method: 'POST'
    });
  }

  async getVideoKycSession(sessionId: string) {
    return this.request(`/video-kyc/session/${sessionId}`);
  }

  async verifyVideoKycOtp(sessionId: string, otpCode: string) {
    return this.request('/video-kyc/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId, otpCode })
    });
  }

  async resendVideoKycOtp(sessionId: string) {
    return this.request('/video-kyc/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }

  async listVideoKycSessions(params?: { status?: string; clientId?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.clientId) q.append('clientId', params.clientId);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/video-kyc/sessions${qs}`);
  }

  async uploadVideoKycRecording(sessionId: string, formData: FormData) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '';
    const res = await fetch(`${API_BASE_URL}/video-kyc/upload/${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId || ''
      },
      body: formData
    });
    return res.json();
  }

  async reviewVideoKycSession(sessionId: string, payload: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string; adminNotes?: string }) {
    return this.request(`/video-kyc/review/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getVideoKycSettings() {
    return this.request('/video-kyc/settings');
  }

  async updateVideoKycSettings(payload: { 
    videoKycEnabled?: boolean; 
    clientVideoKycRequestEnabled?: boolean; 
    videoKycAgreementRule?: 'ALL' | 'SIGNED_ONLY' | 'PENDING_ONLY';
    videoKycPlanRule?: 'ALL' | 'ACTIVE_ONLY' | 'EXPIRED_ONLY';
    globalVideoKycConsentText?: string; 
  }) {
    return this.request('/video-kyc/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async goLiveTenant(password: string) {
    return this.request('/admin/tenant/go-live', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }
}

export const api = new ApiClient();
export default api;
