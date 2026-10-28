# White-Label Architecture

This document outlines the core architecture and communication flow for our white-label SaaS application.

## Roles
- Super Admin
- Admin
- Client
- Staff

## Core Architecture

- **Separation of Concerns:** The Super Admin panel is completely isolated from all individual company panels.
- **Central Management:** All companies are managed from the central Super Admin panel using a central collection named `all_companies`.
- **`all_companies` Collection:** This collection stores essential information about each tenant, including:
  - `companyId` / `tenantId`
  - `companyName`
  - `domain` (Used to identify which company/panel is being accessed)
  - `status`
  - `API configuration`
  - Other required settings

## API-Based Management (Crucial Rule)

**The Super Admin must NEVER directly access or modify any company panel's database.**

All operations originating from the Super Admin that affect a company panel (e.g., create/update/delete, activate/deactivate, changing permissions/settings, user management) MUST be executed through APIs.

### Communication Flow

```text
Super Admin Panel
       ↓
Our Central API
       ↓
Company/Panel API
       ↓
Company Database
```

## Adding New Features/Permissions

If a new Super Admin permission or feature is required that interacts with company data, follow this workflow:

1. **Do NOT** modify the company panel's database directly.
2. **Create/Update API:** Implement the required logic in our central API/backend.
3. **Update Panel Code:** Update the required company panel code to handle the API request.
4. **Execute via API:** The API performs the actual operation on the company database.

All APIs must be documented to maintain system scalability and manageability.
