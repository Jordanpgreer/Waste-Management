import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Total Clients',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary-600',
    },
    {
      label: 'Active Sites',
      value: '0',
      change: '+0%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: 'bg-success-light/20',
      iconColor: 'text-success-dark',
    },
    {
      label: 'Open Tickets',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      bgColor: 'bg-warning-light/20',
      iconColor: 'text-warning-dark',
    },
    {
      label: 'Pending Invoices',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      bgColor: 'bg-info-light/20',
      iconColor: 'text-info-dark',
    },
  ];

  const quickActions = [
    {
      label: 'Add Client',
      description: 'Create a new client account',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      onClick: () => navigate('/clients'),
      color: 'primary',
    },
    {
      label: 'Create Ticket',
      description: 'Log a new service request',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => navigate('/tickets'),
      color: 'success',
    },
    {
      label: 'Upload Invoice',
      description: 'Process vendor invoices',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      onClick: () => navigate('/invoices'),
      color: 'info',
    },
  ];

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-secondary-600">
            Here's what's happening with your waste management operations today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="card-hover p-6 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg ${stat.iconColor}`}>
                  {stat.icon}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trend === 'up' ? 'bg-success-light/20 text-success-dark' :
                  stat.trend === 'down' ? 'bg-danger-light/20 text-danger-dark' :
                  'bg-secondary-100 text-secondary-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-sm font-medium text-secondary-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-secondary-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <div className="p-6 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900">Quick Actions</h2>
            <p className="text-sm text-secondary-600 mt-1">Common tasks to get you started</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`group p-5 rounded-xl border-2 border-secondary-200 hover:border-${action.color}-500 hover:shadow-md transition-all duration-200 text-left`}
                >
                  <div className={`inline-flex p-3 rounded-lg bg-${action.color}-50 text-${action.color}-600 mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-secondary-900 mb-1">{action.label}</h3>
                  <p className="text-sm text-secondary-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity & Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="card">
            <div className="p-6 border-b border-secondary-200">
              <h3 className="font-semibold text-secondary-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-secondary-100 mb-4">
                  <svg className="w-8 h-8 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-secondary-600 text-sm">No recent activity yet</p>
                <p className="text-secondary-500 text-xs mt-1">Activity will appear here once you start using the system</p>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="card">
            <div className="p-6 border-b border-secondary-200">
              <h3 className="font-semibold text-secondary-900">System Alerts</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-900">Welcome to WasteFlow!</p>
                    <p className="text-xs text-primary-700 mt-1">
                      Complete your setup by adding your first client and configuring email integration.
                    </p>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-success-light/10 border border-success rounded-lg">
                  <svg className="w-5 h-5 text-success-dark mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-success-dark">System Status: Operational</p>
                    <p className="text-xs text-success-dark mt-1">
                      All services running normally.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
