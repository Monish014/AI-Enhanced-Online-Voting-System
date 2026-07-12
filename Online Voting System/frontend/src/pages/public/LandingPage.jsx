import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import { useElections } from '@context/ElectionContext';
import useCountdown from '@hooks/useCountdown';

const FEATURES = [
  { icon: '🔐', title: 'Face Recognition Login', desc: 'AI-powered identity verification with liveness detection ensures only you can vote.' },
  { icon: '⛓️', title: 'Blockchain Receipts',    desc: 'Every vote is hashed into an immutable ledger. Verify your vote with your unique block hash.' },
  { icon: '🛡️', title: 'Fraud Detection',        desc: 'Real-time AI monitors for duplicate votes, bot patterns, and IP clustering.' },
  { icon: '♿', title: 'Fully Accessible',       desc: 'Screen reader support, high-contrast mode, and text-to-speech ballot reading.' },
];

const HOW_IT_WORKS = [
  { step: 1, title: 'Register',         desc: 'Create an account with ID verification and face enrollment.' },
  { step: 2, title: 'Verify Identity',  desc: 'Log in and complete liveness-checked face recognition.' },
  { step: 3, title: 'Cast Your Vote',   desc: 'Select your candidate — confirmation required before submission.' },
  { step: 4, title: 'Get Receipt',      desc: 'Download your block hash receipt and verify your vote anytime.' },
];

function ElectionCard({ election }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(
    election.status === 'active' ? election.endTime : election.startTime
  );

  const statusColor = {
    active:   'badge-success',
    upcoming: 'badge-info',
    ended:    'badge-gray',
  }[election.status] || 'badge-gray';

  return (
    <article className="card-hover flex flex-col gap-3" aria-label={`Election: ${election.title}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 leading-snug">{election.title}</h3>
        <span className={statusColor}>{election.status}</span>
      </div>
      {election.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{election.description}</p>
      )}
      {!isExpired && election.status !== 'ended' && (
        <div className="text-xs text-slate-500 font-medium">
          {election.status === 'active' ? 'Ends in: ' : 'Starts in: '}
          <span className="font-bold text-primary-700">
            {String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
          </span>
        </div>
      )}
      <div className="text-xs text-slate-400">
        {election.candidates?.length ?? 0} candidate{election.candidates?.length !== 1 ? 's' : ''}
      </div>
      {election.status === 'active' && (
        <Link to="/voter/face-verify" className="btn-primary text-sm py-2 mt-auto">
          Vote Now →
        </Link>
      )}
    </article>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const { elections, loading, fetchElections } = useElections();

  useEffect(() => {
    fetchElections({ status: 'active' });
  }, []);

  const activeElections = elections.filter((e) => e.status !== 'ended').slice(0, 6);

  return (
    <PageLayout className="px-0 py-0 max-w-full">
      {/* ── Hero ── */}
      <section
        className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700
                   text-white py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" aria-hidden="true" />
            Secure · Transparent · AI-Powered
          </div>

          <h1 id="hero-heading" className="text-4xl sm:text-6xl font-extrabold tracking-tight text-balance">
            Democracy in the{' '}
            <span className="text-primary-300">Digital Age</span>
          </h1>

          <p className="text-xl text-primary-100 max-w-2xl mx-auto text-balance">
            Cast your vote securely from anywhere. Face recognition, liveness detection,
            and blockchain receipts ensure every vote counts — and counts only once.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link to="/register" className="btn-primary bg-white text-primary-800 hover:bg-primary-50 text-base px-8 py-3.5">
              Register to Vote →
            </Link>
            <Link to="/verify-vote" className="btn-secondary bg-transparent border-white/40 text-white hover:bg-white/10 text-base px-8 py-3.5">
              Verify My Vote
            </Link>
          </div>
        </div>
      </section>

      {/* ── Active Elections ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-labelledby="elections-heading"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 id="elections-heading" className="text-3xl font-bold text-slate-900">Active Elections</h2>
            <p className="text-slate-500 mt-1">Participate in ongoing and upcoming elections</p>
          </div>
          <Link to="/login" className="btn-secondary text-sm hidden sm:inline-flex">View All →</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : activeElections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeElections.map((e) => <ElectionCard key={e._id} election={e} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3" aria-hidden="true">🗳️</p>
            <p className="text-lg font-medium">No active elections right now.</p>
            <p className="text-sm mt-1">Check back soon for upcoming elections.</p>
          </div>
        )}
      </section>

      {/* ── How It Works ── */}
      <section
        className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8"
        aria-labelledby="how-heading"
      >
        <div className="max-w-5xl mx-auto">
          <h2 id="how-heading" className="text-3xl font-bold text-slate-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div
                  className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center
                             text-lg font-bold mx-auto shadow-lg shadow-primary-200"
                  aria-hidden="true"
                >
                  {item.step}
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className="text-3xl font-bold text-slate-900 text-center mb-12">
          Built for Trust
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card text-center space-y-3 hover:border-primary-200 transition-colors">
              <span className="text-4xl block" aria-hidden="true">{f.icon}</span>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-primary-700 text-white py-16 px-4 text-center" aria-label="Call to action">
        <h2 className="text-3xl font-bold mb-4">Your vote matters.</h2>
        <p className="text-primary-200 mb-8 text-lg">Register today and make your voice count.</p>
        <Link to="/register" className="btn-primary bg-white text-primary-800 hover:bg-primary-50 text-base px-10 py-4">
          Get Started — It's Free
        </Link>
      </section>
    </PageLayout>
  );
}
