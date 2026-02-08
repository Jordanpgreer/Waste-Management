import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { SitesPage } from './pages/SitesPage';
import { TicketsPage } from './pages/TicketsPage';
import { VendorsPage } from './pages/VendorsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { ClientBillingPage } from './pages/ClientBillingPage';
import { VendorInvoicesPage } from './pages/VendorInvoicesPage';
import { FinancesPage } from './pages/FinancesPage';
import { HomePage } from './pages/HomePage';
import { BillingPage } from './pages/BillingPage';
import { AutomationWorkflowsPage } from './pages/AutomationWorkflowsPage';
import { UserRole } from './types';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sites"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN, UserRole.BROKER_OPS_AGENT, UserRole.ACCOUNT_MANAGER]}
              >
                <SitesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <PurchaseOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/finances"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.VENDOR_MANAGER]}
              >
                <FinancesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor-invoices"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN, UserRole.BILLING_FINANCE, UserRole.VENDOR_MANAGER]}
              >
                <VendorInvoicesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/client-billing"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN, UserRole.BILLING_FINANCE]}
              >
                <ClientBillingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute allowedRoles={[UserRole.CLIENT_USER]}>
                <BillingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/automation-workflows"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <AutomationWorkflowsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <VendorsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
