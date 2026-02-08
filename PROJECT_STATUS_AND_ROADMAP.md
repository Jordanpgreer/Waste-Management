# WasteFlow Project Status and Roadmap

Last updated: February 8, 2026

WasteFlow has moved from early MVP into a functional operations platform with a client-facing brand/site, role-scoped admin and client workflows, expanded ticket correspondence controls, PO/invoice finance foundations, and a first-pass finance dashboard.

This document reflects what is currently implemented and what should happen next.

## 1) Current Product State

WasteFlow currently supports two primary experiences:
- Admin/staff workspace (admin, ops, account, finance, vendor roles)
- Client portal (public home + authenticated service/billing/ticket workflows)

Core stack:
- Frontend: React + TypeScript (`frontend/`)
- Backend: Express + TypeScript (`backend/`)
- API base: `/api/v1`
- Health: `/health`

## 2) What Is Implemented (As Of Today)

### 2.1 Branding and Public Experience
- Rebranded UI to WasteFlow with new logo usage across key surfaces.
- Public home page was fully redesigned into a professional, scrollable, client-facing marketing site.
- Home page messaging is now broker-service oriented for clients (not internal broker tooling language).
- Primary CTA styling remains recycle-green as requested.

Key files:
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/components/BrandLogo.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`

### 2.2 Auth and Role Routing
- Role-aware navigation and route protection are active.
- Auth redirect behavior:
  - Client users -> `/billing`
  - Staff roles -> `/dashboard`

### 2.3 Dashboard and Navigation Improvements
- Sidebar visual refresh to green-to-blue gradient.
- Added new `Finances` nav parent item with dropdown behavior.
- Moved `Vendor Invoices` and `Client Billing` under `Finances` submenu.
- Added clickable `Finances` page route (`/finances`).

Key files:
- `frontend/src/components/DashboardLayout.tsx`
- `frontend/src/pages/FinancesPage.tsx`
- `frontend/src/App.tsx`

### 2.4 Ticket System (Majorly Expanded)

#### Status model and workflow
- Ticket statuses replaced with business-specific lifecycle values.
- Migrations run for status alignment and numbering updates.

#### Ticket numbering
- Ticket format shifted to numeric request sequence starting at 120.
- UI display now uses `Request #<number>`.

#### Admin ticket detail UX
- Admin modal now supports split-focus layout (summary + correspondence).
- Correspondence ordering adjusted to newest-first.
- Compose area moved to top of correspondence flow.
- Quick actions simplified and behavior refined.

#### Message-level correspondence controls
- Message-level status tagging added.
- Admin can delete correspondence messages.
- Original ticket-creation message cannot be deleted and is fixed as `Ticket Request`.

#### Email/correspondence ingestion
- Drag-and-drop/email file upload in ticket correspondence flow.
- Uploaded message file can populate draft and be saved directly as correspondence.
- Uploaded email/message file retained as attachment on that message.
- Download action labeled as `Download Email`.

#### Visibility/routing controls
- Routing model supports admin correspondence destinations: client/vendor/other.
- Client-side visibility scoped to client-facing thread only.
- Additional backend enforcement added so client users cannot access vendor/other/internal message files.

#### Client restrictions
- Client can no longer edit ticket subject/type/description.
- Backend also blocks those updates for client role (API-enforced).

Key files:
- `frontend/src/pages/TicketsPage.tsx`
- `frontend/src/api/tickets.ts`
- `frontend/src/types/ticket.ts`
- `backend/src/controllers/ticket.controller.ts`
- `backend/src/services/ticket.service.ts`
- `backend/src/types/ticket.types.ts`
- `backend/src/routes/ticket.routes.ts`

### 2.5 Ticket Lists, Tabs, Sorting, and Search
- Ticket tabs for `Open Tickets`, `Completed Tickets`, and `Cancelled Tickets`.
- Reopen flow added for completed/cancelled tickets.
- Quick action now auto-closes detail modal after execution.
- Search/filter upgraded:
  - Search by request number, client name, site name
  - Filter by status and priority
  - Sort by newest/oldest/recently touched/oldest touched

### 2.6 Clients, Sites, Vendors UX
- Admin can click row/cards to open detail views in UI.
- Added edit/delete capability in detail views.

### 2.7 Client Profile Deepening
Client detail modal now includes tabbed workspace:
- Overview
- Client Details
- Financials
- Sites
- Contract (PDF upload/view)
- Open Tickets (click-through)

Also added:
- Vendor assignment support on client details/edit
- Contract storage/serving fields and endpoints

Key files:
- `frontend/src/pages/ClientsPage.tsx`
- `frontend/src/api/clients.ts`
- `backend/src/controllers/clientController.ts`
- `backend/src/routes/clientRoutes.ts`
- `backend/src/services/clientService.ts`
- `backend/src/database/schema.sql`

### 2.8 Purchase Orders and Finance Foundations
- Purchase Order creation UI added and cleaned up substantially.
- PO pricing behavior implemented:
  - `Vendor Price` and `Client Price`
  - Auto markup defaults and recalculation behavior
  - Editable price and editable markup % with reciprocal recalculation
  - Currency formatting improvements
- Removed unnecessary `Terms` section in PO modal and simplified layout.

Key files:
- `frontend/src/components/CreatePOModal.tsx`
- `frontend/src/pages/PurchaseOrdersPage.tsx`

### 2.9 Invoice Pages UX
- Vendor invoices and client billing filter controls upgraded to match cleaner page filter style.
- Empty-state and loading behavior improved to avoid misleading error popups when no data exists.

Key files:
- `frontend/src/pages/VendorInvoicesPage.tsx`
- `frontend/src/pages/ClientBillingPage.tsx`

### 2.10 Finances Dashboard (New)
`/finances` now includes live analytics pulled from invoice data:
- Upcoming invoices
- Overdue vendor invoices
- Client payments overdue
- Net realized spread
- Collection/payment completion ring gauges
- Overdue and upcoming invoice lists
- 30-day cash flow forecast with:
  - expected inflow
  - expected outflow
  - projected net
  - weekly bucket bars (1-7, 8-14, 15-21, 22-30 days)

Key file:
- `frontend/src/pages/FinancesPage.tsx`

### 2.11 Client Dashboard Cleanup
- Removed broad error banner that surfaced unnecessarily.
- Current bill card now always shows amount due + due timing to month-end.
- If no bill: `$0.00` with days until end of month.

Key file:
- `frontend/src/pages/DashboardPage.tsx`

## 3) Migrations and Data Model Changes Added

Notable migration work already executed includes:
- ticket status migration updates
- message status tag support
- message email metadata support
- recipient routing support
- PO pricing/scope updates
- vendor invoice payment fields
- client contract + vendor assignment
- ticket numbering request sequence migration

(See backend migration scripts and package scripts for exact names/run history.)

## 4) Immediate Next Steps (Priority)

### P0: Finish Client and Finance Execution Quality (Next 3-5 Days)
1. Implement outbound email delivery for ticket correspondence.
- Admin-to-client and admin-to-vendor sends should reliably deliver through configured provider.
- Add delivery status and failure feedback in UI.

2. Add finance dashboard date-range controls.
- 30/60/90-day toggle for metrics and forecast.
- Keep default at 30-day.

3. Add invoice action queue on finances page.
- Needs approval
- Ready to send
- Overdue follow-up
- One-click jump to relevant invoice records.

### P1: Accounting Workflow Completion (Next 1-2 Weeks)
1. PO -> Vendor Invoice auto-match hardening.
- Confidence score, mismatch flags, and manual override path.

2. Vendor payment workflow completion.
- Mark paid with payment date/method/reference in consistent UI flow.
- Add audit events for payment actions.

3. Client billing maturity.
- Add clearer due-date policy controls and payment tracking surface for finance team.

### P1: Client Experience Polish (Next 1-2 Weeks)
1. Client ticket detail polish pass.
- Further simplify card density and spacing.
- Add a compact request timeline block (submitted/last update/current state).

2. Client-facing notifications.
- In-app notices for request updates and billing milestones.

## 5) Risks / Gaps Still Open

- Outbound mail delivery pipeline still needs production-level hardening and observability.
- Automated E2E coverage is still limited for the latest admin/client ticket and finance flows.
- Finance analytics are now useful, but still based on current invoice dataset size and due-date quality.

## 6) Suggested Definition of Ready for Broader Rollout

Use this gate before wider onboarding:
- Correspondence email delivery is reliable and monitored.
- Client ticket flows are fully role-safe and E2E tested.
- Finance dashboard has date-range controls and invoice action queue.
- PO/invoice/payment path is auditable end-to-end.
- Error handling in client and finance surfaces is inline and non-disruptive.

## 7) High-Impact Files (Recent Core Work)

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/components/BrandLogo.tsx`
- `frontend/src/components/DashboardLayout.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/TicketsPage.tsx`
- `frontend/src/pages/ClientsPage.tsx`
- `frontend/src/pages/PurchaseOrdersPage.tsx`
- `frontend/src/components/CreatePOModal.tsx`
- `frontend/src/pages/VendorInvoicesPage.tsx`
- `frontend/src/pages/ClientBillingPage.tsx`
- `frontend/src/pages/FinancesPage.tsx`
- `frontend/src/App.tsx`
- `backend/src/controllers/ticket.controller.ts`
- `backend/src/services/ticket.service.ts`
- `backend/src/controllers/clientController.ts`
- `backend/src/services/clientService.ts`
- `backend/src/routes/clientRoutes.ts`
- `backend/src/routes/ticket.routes.ts`
- `backend/src/types/ticket.types.ts`
- `backend/src/database/schema.sql`
