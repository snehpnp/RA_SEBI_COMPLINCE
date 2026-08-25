const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('pnpuniverse.in')) {
    return 'https://compliance.pnpuniverse.in/backend/api/v1';
  }
  return process.env.NODE_ENV === 'production' 
    ? 'https://compliance.pnpuniverse.in/backend/api/v1' 
    : 'http://localhost:5000/api/v1';
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
        (response.status === 403 && (data.errors?.includes('User inactive or suspended') || data.errors?.includes('User inactive')));

      if (isAuthError && !endpoint.includes('/auth/login')) {
        if (typeof window !== 'undefined') {
          if ((window as any).__isRedirecting) return new Promise(() => {});
          (window as any).__isRedirecting = true;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('tenantId');
          
          let loginPath = '/admin/login';
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/client')) {
            loginPath = '/client-login';
          }
          
          if (response.status === 403) {
            window.location.href = `${loginPath}?error=inactive`;
          } else {
            window.location.href = `${loginPath}?error=expired`;
          }
        }
        return new Promise(() => {}); // Never resolve to prevent multiple alerts from component catch blocks
      }
    }

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Something went wrong') as any;
      err.duplicateField = data.duplicateField;
      err.duplicateFields = data.duplicateFields || [];
      err.errors = data.errors;
      throw err;
    }
    return data;
  }

  // Auth Methods
  async login(payload: any) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.success) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.tenantId) {
        localStorage.setItem('tenantId', res.data.user.tenantId);
      }
    }
    return res;
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

  async getAuditLogs() {
    return this.request('/super-admin/logs');
  }

  async getTelemetry() {
    return this.request('/super-admin/telemetry');
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
    return this.request(`/admin/staff/${id}`, {
      method: 'DELETE'
    });
  }

  async restoreStaff(id: string) {
    return this.request(`/admin/staff/${id}/restore`, {
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
    return this.request(`/admin/clients/${id}`, {
      method: 'DELETE'
    });
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
    return this.request(`/admin/plans/${id}`, { method: 'DELETE' });
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

  async verifyKRA(payload: { pan: string; statusInput: string; aadhaar?: string }) {
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

  async signAgreement(payload: { signatureText: string }) {
    return this.request('/client/esign', {
      method: 'POST',
      body: JSON.stringify(payload)
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

  async simulateRazorpayWebhook(payload: any) {
    return fetch(`${API_BASE_URL}/webhook/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());
  }

  async initiateCCAvenuePayment(payload: { planId: string, couponCode?: string }) {
    return this.request('/payment/ccavenue/initiate', {
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

  async forgotPassword(payload: { email: string }) {
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

  async getMarketOverview() {
    return this.request('/client/market-overview');
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

  // Roles & Access Control
  async getRoles() {
    return this.request('/admin/roles');
  }

  async createRole(payload: { name: string; description: string }) {
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

  async updateRole(id: string, payload: { name?: string; description?: string; allowMultiDeviceLogin?: boolean }) {
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
    return this.request('/client/kyc/initiate', { method: 'POST' });
  }

  async initiateDigioAgreement() {
    return this.request('/client/agreement/initiate', { method: 'POST' });
  }

  async updateDigioStatus(data: { type: string, status: string }) {
    return this.request('/client/kyc/status', {
      method: 'POST',
      body: JSON.stringify(data),
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
}

export const api = new ApiClient();
export default api;
