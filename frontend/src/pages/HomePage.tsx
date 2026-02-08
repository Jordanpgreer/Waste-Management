import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/BrandLogo';

const servicePillars = [
  {
    title: 'Single Point of Contact',
    description: 'Your team gets one expert partner to manage requests, follow-through, and communication.',
  },
  {
    title: 'Service Reliability',
    description: 'We coordinate pickups, extras, and issue resolution so your sites stay clean and compliant.',
  },
  {
    title: 'Billing Confidence',
    description: 'We help audit service activity and billing so you understand exactly what you are paying for.',
  },
];

const capabilities = [
  'Request support for missed pickups, overflows, and service issues',
  'Rapid coordination for extra pickups and service changes',
  'Centralized correspondence and status visibility by location',
  'Invoice review support and clearer billing explanation',
  'Account visibility for open items and completed work',
  'Client portal access for updates and documentation',
];

const industries = [
  {
    title: 'Retail & Multi-Location',
    detail: 'Consistent service standards and issue response across all locations.',
  },
  {
    title: 'Restaurants & Hospitality',
    detail: 'Reliable pickup coordination for high-frequency and seasonal demand shifts.',
  },
  {
    title: 'Commercial Property',
    detail: 'Clean, organized service management for tenants and facilities teams.',
  },
  {
    title: 'Industrial & Distribution',
    detail: 'Structured support for high-volume service needs and site-specific requirements.',
  },
];

const timeline = [
  {
    step: '01',
    title: 'Tell Us What You Need',
    detail: 'Submit your request through the portal and include details, photos, or files when needed.',
  },
  {
    step: '02',
    title: 'We Coordinate the Solution',
    detail: 'Our team drives communication, tracks progress, and keeps your stakeholders updated.',
  },
  {
    step: '03',
    title: 'You Get Clear Updates',
    detail: 'Follow every milestone in your portal, from acknowledgement to completion.',
  },
  {
    step: '04',
    title: 'Closeout With Confidence',
    detail: 'Completed work and supporting documentation stay organized for future reference.',
  },
];

export const HomePage: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'client_user' ? '/billing' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-[#f1f6f3] text-secondary-900">
      <header className="sticky top-0 z-40 border-b border-secondary-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo imgClassName="h-28 w-auto" wordmarkClassName="text-2xl sm:text-3xl" />

          <nav className="hidden items-center gap-7 text-sm font-semibold text-secondary-700 lg:flex">
            <a href="#services" className="transition-colors hover:text-success-dark">Services</a>
            <a href="#workflow" className="transition-colors hover:text-success-dark">How It Works</a>
            <a href="#industries" className="transition-colors hover:text-success-dark">Industries</a>
            <a href="#contact" className="transition-colors hover:text-success-dark">Contact</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-secondary-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(43,179,95,0.24),transparent_36%),radial-gradient(circle_at_82%_12%,rgba(45,140,255,0.22),transparent_40%),linear-gradient(180deg,#eef8f1_0%,#f6fbff_100%)]" />
          <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-20 pt-14 sm:px-6 lg:pb-24 lg:pt-20">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="space-y-6">
                <p className="inline-flex rounded-full border border-success/20 bg-success-light/40 px-4 py-1.5 text-sm font-semibold text-success-dark">
                  Waste Brokerage Services for Commercial Clients
                </p>
                <h1 className="text-balance text-4xl font-bold leading-tight text-secondary-900 lg:text-6xl">
                  Waste Service Support Built Around Your Business.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-secondary-700">
                  WasteFlow helps clients simplify waste and recycling operations with faster issue resolution,
                  coordinated service support, and clearer communication across every location.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link to="/register" className="btn-primary px-6 py-3 text-base">
                    Get Started
                  </Link>
                  <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                    Access Portal
                  </Link>
                </div>

                <div className="grid gap-3 pt-1 sm:grid-cols-3">
                  <div className="rounded-xl border border-secondary-200 bg-white/90 p-4 shadow-sm">
                    <p className="text-2xl font-bold text-success-dark">Faster</p>
                    <p className="mt-1 text-sm text-secondary-600">Response on service issues</p>
                  </div>
                  <div className="rounded-xl border border-secondary-200 bg-white/90 p-4 shadow-sm">
                    <p className="text-2xl font-bold text-success-dark">Clear</p>
                    <p className="mt-1 text-sm text-secondary-600">Visibility into request progress</p>
                  </div>
                  <div className="rounded-xl border border-secondary-200 bg-white/90 p-4 shadow-sm">
                    <p className="text-2xl font-bold text-success-dark">Reliable</p>
                    <p className="mt-1 text-sm text-secondary-600">Coordination across your sites</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-4 top-8 h-32 w-32 rounded-full bg-success-light/60 blur-3xl" />
                <div className="absolute -bottom-5 right-0 h-36 w-36 rounded-full bg-primary-200/70 blur-3xl" />
                <div className="relative rounded-3xl border border-secondary-200 bg-white p-6 shadow-soft-lg">
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary-500">What clients value most</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: 'Issue Response', value: 'Rapid', trend: 'Missed pickup and overflow support' },
                      { label: 'Account Visibility', value: '24/7', trend: 'Track active requests in one portal' },
                      { label: 'Billing Clarity', value: 'Clean', trend: 'Understand service activity and charges' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold text-secondary-800">{item.label}</p>
                          <p className="text-2xl font-bold text-secondary-900">{item.value}</p>
                        </div>
                        <p className="mt-1 text-xs text-secondary-600">{item.trend}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-success-dark">Our Services</p>
            <h2 className="mt-2 text-3xl font-bold text-secondary-900 lg:text-4xl">A broker service model focused on your outcomes.</h2>
            <p className="mt-3 text-base text-secondary-700">
              We work as an extension of your team to keep waste and recycling services dependable, responsive,
              and easier to manage across your organization.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {servicePillars.map((pillar) => (
              <article key={pillar.title} className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-secondary-900">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary-700">{pillar.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm lg:p-8">
            <h3 className="text-xl font-semibold text-secondary-900">What you can expect</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white">
                    ?
                  </span>
                  <p className="text-sm text-secondary-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-secondary-200 bg-white">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-success-dark">How It Works</p>
                <h2 className="mt-2 text-3xl font-bold text-secondary-900 lg:text-4xl">Simple client experience, expert broker support behind it.</h2>
                <p className="mt-3 text-base leading-relaxed text-secondary-700">
                  You submit needs and receive clear updates while our team handles coordination and follow-through.
                </p>
              </div>

              <div className="space-y-4">
                {timeline.map((item) => (
                  <article key={item.step} className="rounded-2xl border border-secondary-200 bg-[#f7faf8] p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-success text-sm font-bold text-white">
                        {item.step}
                      </span>
                      <h3 className="text-lg font-semibold text-secondary-900">{item.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-secondary-700">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="industries" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-2xl border border-secondary-200 bg-white p-7 shadow-sm lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-success-dark">Industries We Support</p>
              <h2 className="mt-2 text-3xl font-bold text-secondary-900">Built for organizations with real operational complexity.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {industries.map((item) => (
                  <article key={item.title} className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
                    <h3 className="text-base font-semibold text-secondary-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-secondary-700">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-secondary-200 bg-[linear-gradient(160deg,#0d4a9e_0%,#16794c_95%)] p-7 text-white shadow-soft-lg lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Why WasteFlow</p>
              <h3 className="mt-2 text-3xl font-bold">A broker partner that protects service quality and accountability.</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                We focus on service outcomes for your team: fewer unresolved issues, clearer communication,
                and stronger confidence in day-to-day waste operations.
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <p className="rounded-lg bg-white/15 px-3 py-2">Dedicated support for urgent service needs</p>
                <p className="rounded-lg bg-white/15 px-3 py-2">Clear communication from request to closeout</p>
                <p className="rounded-lg bg-white/15 px-3 py-2">Consistent service standards across locations</p>
              </div>
            </aside>
          </div>
        </section>

        <section id="contact" className="border-t border-secondary-200 bg-white">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6">
            <div className="rounded-3xl border border-secondary-200 bg-[radial-gradient(circle_at_80%_10%,rgba(43,179,95,0.22),transparent_38%),#ffffff] p-7 shadow-sm sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-wide text-success-dark">Start Now</p>
                  <h2 className="mt-2 text-3xl font-bold text-secondary-900 lg:text-4xl">Need a better waste brokerage experience?</h2>
                  <p className="mt-3 text-base text-secondary-700">
                    Create an account to start managing requests, updates, and account visibility in one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/register" className="btn-primary px-6 py-3 text-base">
                    Create Account
                  </Link>
                  <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
