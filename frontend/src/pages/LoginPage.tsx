import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login({ email, password });
      navigate(loggedInUser.role === 'client_user' ? '/billing' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#e8edf1]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(42,164,255,0.22),transparent_40%),radial-gradient(circle_at_80%_18%,rgba(21,140,70,0.2),transparent_38%),radial-gradient(circle_at_72%_80%,rgba(8,75,160,0.16),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <header className="relative z-10 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center space-x-3">
            <BrandLogo imgClassName="h-14 w-auto" wordmarkClassName="text-lg" />
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50">
              Home
            </Link>
            <details className="group relative">
              <summary className="list-none cursor-pointer rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-success-dark">
                <span className="inline-flex items-center gap-2">
                  Login
                  <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-xl">
                <Link to="/login" className="block px-4 py-2 text-sm font-medium text-secondary-800 transition-colors hover:bg-secondary-50">
                  Login
                </Link>
                <Link to="/register" className="block px-4 py-2 text-sm font-medium text-secondary-800 transition-colors hover:bg-secondary-50">
                  Create Account
                </Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-10">
        <section className="order-2 rounded-3xl border border-white/70 bg-white/88 p-6 shadow-xl backdrop-blur lg:order-1 lg:p-10">
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
              Client Portal
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-secondary-900 sm:text-4xl">
              Manage your waste service in one place
            </h1>
            <p className="mt-3 text-base text-secondary-600 sm:text-lg">
              Review service requests, send updates, track pickups, and stay on top of your billing account.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: 'Service Requests', body: 'Open, update, and track ticket status in real time.' },
              { title: 'Billing Clarity', body: 'See current invoices, due dates, and payment history.' },
              { title: 'Site Schedule', body: 'View pickup cadence by location and waste stream.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-secondary-900">{item.title}</p>
                <p className="mt-1 text-sm text-secondary-600">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-success-light/30 p-4">
            <p className="text-sm font-semibold text-secondary-900">What you can do after signing in</p>
            <div className="mt-3 grid gap-2 text-sm text-secondary-700 sm:grid-cols-2">
              <p className="rounded-lg bg-white/80 px-3 py-2">Track open and resolved requests</p>
              <p className="rounded-lg bg-white/80 px-3 py-2">Upload photos and correspondence</p>
              <p className="rounded-lg bg-white/80 px-3 py-2">Monitor invoice status by location</p>
              <p className="rounded-lg bg-white/80 px-3 py-2">Submit cancellation requests with reasons</p>
            </div>
          </div>
        </section>

        <section className="order-1 flex items-center justify-center lg:order-2">
          <div className="w-full max-w-md animate-fade-in rounded-3xl border border-white/80 bg-white/92 p-7 shadow-2xl backdrop-blur sm:p-8">
            <div className="mb-7">
              <div className="mb-5 flex items-center space-x-3">
                <BrandLogo imgClassName="h-16 w-auto" wordmarkClassName="text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-secondary-900">Welcome back</h2>
              <p className="mt-1 text-sm text-secondary-600">Sign in to continue to your client workspace.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl border border-danger bg-danger-light/20 px-4 py-3 animate-slide-up">
                  <div className="flex items-center">
                    <svg className="mr-2 h-5 w-5 text-danger" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-danger-dark">{error}</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="mb-2 block text-sm font-medium text-secondary-700">
                  Work email
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-secondary-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>

              <div className="pt-1 text-center">
                <Link to="/register" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                  New client user? <span className="underline">Create your account</span>
                </Link>
              </div>
            </form>

            <div className="mt-7 border-t border-secondary-200 pt-5">
              <p className="text-center text-xs text-secondary-500">
                Secure authentication | Encrypted data in transit
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
