# Role-Based Access Control

Your waste management platform now has **proper role-based access control** to separate broker operations from client access.

---

## 🎯 Platform Overview

**This is a BROKER platform** - you (the broker) manage relationships between:
- **Clients** (stores/businesses needing waste management)
- **Vendors** (waste management service providers)

---

## 👥 User Roles & Access

### 1. **Client User** (`client_user`)
**Who they are:** Store owners, facility managers who need waste management services

**What they SEE:**
- ✅ **Dashboard** - Their own service overview
- ✅ **My Locations** - Their store/facility locations
- ✅ **Service Requests** - Their waste management tickets/requests

**What they DON'T see:**
- ❌ Clients list (other businesses)
- ❌ Vendors (broker manages this relationship)
- ❌ Invoices (backend vendor invoices)

---

### 2. **Admin** (`admin`)
**Who they are:** Full system administrators

**What they SEE:**
- ✅ Dashboard - Full operations overview
- ✅ Clients - All client businesses
- ✅ Sites - All locations across all clients
- ✅ Tickets - All service requests
- ✅ **Invoices** - Vendor invoices to broker
- ✅ **Vendors** - Waste management service providers

---

### 3. **Broker Operations Agent** (`broker_ops_agent`)
**Who they are:** Day-to-day operations staff

**What they SEE:**
- ✅ Dashboard
- ✅ Clients
- ✅ Sites
- ✅ Tickets
- ✅ Vendors

**What they DON'T see:**
- ❌ Invoices (billing/finance only)

---

### 4. **Account Manager** (`account_manager`)
**Who they are:** Manages client relationships

**What they SEE:**
- ✅ Dashboard
- ✅ Clients
- ✅ Sites
- ✅ Tickets

**What they DON'T see:**
- ❌ Vendors (operations manages this)
- ❌ Invoices (billing/finance only)

---

### 5. **Billing/Finance** (`billing_finance`)
**Who they are:** Handles invoicing and payments

**What they SEE:**
- ✅ Dashboard
- ✅ Clients
- ✅ **Invoices** - Vendor invoices to broker

**What they DON'T see:**
- ❌ Vendors (operations manages this)

---

### 6. **Vendor Manager** (`vendor_manager`)
**Who they are:** Manages vendor relationships

**What they SEE:**
- ✅ Dashboard
- ✅ **Vendors** - Waste management providers

---

## 🔧 Technical Implementation

### Frontend
- **Navigation filtering:** `DashboardLayout.tsx` filters menu items by role
- **Route protection:** Can be enhanced in `ProtectedRoute.tsx` to enforce role-based access
- **Dynamic labels:** Client users see "My Locations" and "Service Requests" instead of "Sites" and "Tickets"

### Backend
- **Role-based authorization:** `backend/src/middleware/auth.ts` has `authorize()` middleware
- **Routes protected:** Each route specifies which roles can access it
- **Example:**
  ```typescript
  router.post('/clients',
    authorize(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.BROKER_OPS_AGENT),
    createClient
  );
  ```

---

## 🚧 Still To Build

### Vendor Page (Admin/Broker Ops/Vendor Manager)
- List all waste management vendors
- Add/edit vendor details
- Track vendor performance scores
- Manage service capabilities and coverage areas

### Invoice Page (Admin/Billing)
- List invoices from vendors to broker
- Approve/dispute vendor invoices
- Track discrepancies
- Payment status management

---

## 🧪 Test Each Role

Login with different users to see the different experiences:

| Role | Email | Password | What You'll See |
|------|-------|----------|----------------|
| **Admin** | admin@demowaste.com | Admin123!@# | Full system access |
| **Client** | test@demowaste.com | Test123!@# | Limited client portal |
| **Broker Ops** | broker@demowaste.com | Test123!@# | Operations view |
| **Account Mgr** | account@demowaste.com | Test123!@# | Client management |
| **Billing** | billing@demowaste.com | Test123!@# | Financial view |

---

## 📝 Key Takeaways

1. **Client users are NOT vendors** - they're stores/businesses needing waste management
2. **The broker (you) sits between** clients and vendors
3. **Clients should never see** vendor information or backend operations
4. **Different roles see different navigation** - role-based UI filtering active
5. **Backend API enforces permissions** - unauthorized access returns 403 Forbidden

---

**Next Steps:**
- Test the client user experience
- Build out Vendor and Invoice pages
- Add data filtering (clients only see their own data)
