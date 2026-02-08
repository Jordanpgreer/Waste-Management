import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from './BrandLogo';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  roles: string[];
  icon: ReactNode;
  children?: NavItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [financeMenuOpen, setFinanceMenuOpen] = useState(
    ['/finances', '/vendor-invoices', '/client-billing'].includes(location.pathname)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      roles: ['admin', 'broker_ops_agent', 'account_manager', 'billing_finance', 'vendor_manager', 'client_user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/clients',
      label: 'Clients',
      roles: ['admin', 'broker_ops_agent', 'account_manager', 'billing_finance'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      path: '/sites',
      label: 'Sites',
      roles: ['admin', 'broker_ops_agent', 'account_manager'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      path: '/tickets',
      label: 'Service Requests',
      roles: ['client_user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
    {
      path: '/tickets',
      label: 'Tickets',
      roles: ['admin', 'broker_ops_agent', 'account_manager'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
    {
      path: '/purchase-orders',
      label: 'Purchase Orders',
      roles: ['admin', 'broker_ops_agent', 'account_manager', 'billing_finance', 'vendor_manager'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      path: '/automation-workflows',
      label: 'Automation Workflows',
      roles: ['admin'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3a3 3 0 00-3 3v1.5H6a3 3 0 000 6h.75V18a3 3 0 006 0v-1.5h.75a3 3 0 000-6h-.75V6a3 3 0 00-3-3z" />
        </svg>
      )
    },
    {
      path: '/finances',
      label: 'Finances',
      roles: ['admin', 'billing_finance', 'vendor_manager'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m8-4a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      ),
      children: [
        {
          path: '/vendor-invoices',
          label: 'Vendor Invoices',
          roles: ['admin', 'billing_finance', 'vendor_manager'],
          icon: null,
        },
        {
          path: '/client-billing',
          label: 'Client Billing',
          roles: ['admin', 'billing_finance'],
          icon: null,
        },
      ],
    },
    {
      path: '/billing',
      label: 'Billing',
      roles: ['client_user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      path: '/vendors',
      label: 'Vendors',
      roles: ['admin', 'vendor_manager', 'broker_ops_agent'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      )
    },
  ];

  const navItems = allNavItems.filter((item) => user?.role && item.roles.includes(user.role));

  const isActive = (path: string) => location.pathname === path;
  const isFinanceChildActive = ['/vendor-invoices', '/client-billing'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-[linear-gradient(180deg,#1FA64A_0%,#188E47_42%,#13724A_74%,#0D4A9E_100%)] shadow-lg flex flex-col">
          <div className="p-6 border-b border-white/10">
            <BrandLogo imgClassName="h-16 w-auto" wordmarkClassName="text-xl text-white" />
            <p className="mt-2 text-xs text-white/80">Operations OS</p>
          </div>

          <nav className="flex-1 py-6 px-3 space-y-1">
            {navItems.map((item) => {
              if (item.children) {
                const children = item.children.filter((child) => user?.role && child.roles.includes(user.role));
                if (children.length === 0) {
                  return null;
                }

                const isParentActive = isActive(item.path) || isFinanceChildActive;
                const isOpen = financeMenuOpen || isFinanceChildActive;

                return (
                  <div key={item.path} className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Link
                        to={item.path}
                        className={`flex flex-1 items-center px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                          isParentActive
                            ? 'bg-white text-primary-700 shadow-md'
                            : 'text-blue-50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className={isParentActive ? 'text-primary-700' : ''}>{item.icon}</span>
                        <span className="ml-3">{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setFinanceMenuOpen((prev) => !prev)}
                        className={`px-2 py-3 rounded-lg transition-colors ${
                          isParentActive ? 'text-primary-700 bg-white/95' : 'text-blue-50 hover:bg-white/10 hover:text-white'
                        }`}
                        aria-label="Toggle finances menu"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="ml-6 space-y-1 border-l border-white/20 pl-3">
                        {children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                          className={`block px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              isActive(child.path)
                                ? 'bg-white text-primary-700 font-semibold shadow-sm'
                                : 'text-blue-50 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-white text-primary-700 shadow-md'
                      : 'text-blue-50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={isActive(item.path) ? 'text-primary-700' : ''}>{item.icon}</span>
                  <span className="ml-3">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center mb-3 p-3 rounded-lg bg-white/10">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary-700 font-bold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-blue-100/80 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-success hover:bg-success-dark rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
