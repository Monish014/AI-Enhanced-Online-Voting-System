import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useElections } from '@context/ElectionContext';
import voteService from '@services/voteService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import useCountdown from '@hooks/useCountdown';

function ElectionStatusBadge({ status }) {
  const map = {
    active:   { cls: 'badge-success', label: '🟢 Active' },
    upcoming: { cls: 'badge-info',    label: '🔵 Upcoming' },
    ended:    { cls: 'badge-gray',    label: '⚪ Ended' },
  };
  const { cls, label } = map[status] || map.ended;
  return <span className={cls}>{label}</span>;
}

function ElectionCard({ election }) {
  const { hours, minutes, seconds, isExpired } = useCountdown(
    election.status === 'active' ? election.endTime : election.startTime
  );
  const [hasVoted, setHasVoted] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (election.status === 'active') {
      voteService.checkVoteStatus(election._id)
        .then((d) => setHasVoted(d.hasVoted))
        .catch(() => setHasVoted(false))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [election._id, election.status]);

  return (
    <article
      className="card-hover space-y-3 flex flex-col"
      aria-label={`Election: ${election.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 leading-snug text-base">{election.title}</h3>
        <ElectionStatusBadge status={election.status} />
      </div>

      {election.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{election.description}</p>
      )}

      <div className="text-xs text-slate-400 space-y-0.5">
        <div>Start: {new Date(election.startTime).toLocaleString()}</div>
        <div>End:   {new Date(election.endTime).toLocaleString()}</div>
      </div>

      {election.status !== 'ended' && !isExpired && (
        <div className="text-xs font-medium text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1.5">
          {election.status === 'active' ? 'Closes in: ' : 'Opens in: '}
          <span className="font-bold font-mono">
            {String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 mt-auto">
        {checking ? (
          <LoadingSpinner size="sm" label="Checking..." />
        ) : election.status === 'active' && hasVoted ? (
          <div className="flex items-center gap-2 w-full">
            <span className="badge-success flex-1 justify-center py-2">✓ You have voted</span>
            <Link to="/verify-vote" className="btn-secondary text-xs px-3 py-2">Verify</Link>
          </div>
        ) : election.status === 'active' && !hasVoted ? (
          <Link
            to={`/voter/face-verify`}
            state={{ electionId: election._id, electionTitle: election.title }}
            className="btn-primary w-full text-sm py-2.5"
          >
            Vote Now →
          </Link>
        ) : election.status === 'ended' ? (
          election.isPublicResults ? (
            <Link to={`/verify-vote`} className="btn-secondary w-full text-sm py-2">View Results</Link>
          ) : (
            <span className="text-xs text-slate-400 italic w-full text-center">Results not yet published</span>
          )
        ) : (
          <span className="text-xs text-slate-400 italic w-full text-center">Opens soon</span>
        )}
      </div>
    </article>
  );
}

export default function VoterDashboard() {
  const { user } = useAuth();
  const { elections, loading, fetchElections } = useElections();

  useEffect(() => {
    fetchElections({}, true);
  }, []);

  const active   = elections.filter((e) => e.status === 'active');
  const upcoming = elections.filter((e) => e.status === 'upcoming');
  const ended    = elections.filter((e) => e.status === 'ended');

  return (
    <PageLayout>
      {/* Greeting */}
      <div className="mb-8 space-y-1 animate-fade-in">
        <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500">Voter ID: <span className="font-mono font-semibold text-slate-700">{user?.voterId}</span></p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Elections',   value: active.length,   color: 'bg-green-50 text-green-800',  icon: '🗳️' },
          { label: 'Upcoming',           value: upcoming.length, color: 'bg-blue-50 text-blue-800',    icon: '📅' },
          { label: 'Completed',          value: ended.length,    color: 'bg-slate-50 text-slate-700',  icon: '✅' },
          { label: 'Total Elections',    value: elections.length,color: 'bg-purple-50 text-purple-800',icon: '📊' },
        ].map((s) => (
          <div key={s.label} className={`card ${s.color} border-transparent`} role="status" aria-label={s.label}>
            <div className="text-2xl mb-1" aria-hidden="true">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : elections.length === 0 ? (
        <div className="text-center py-16 text-slate-400 card">
          <p className="text-4xl mb-3" aria-hidden="true">📭</p>
          <p className="text-lg font-medium">No elections available</p>
          <p className="text-sm mt-1">Check back soon — upcoming elections will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section aria-labelledby="active-heading">
              <h2 id="active-heading" className="section-title mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                Active Elections
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {active.map((e) => <ElectionCard key={e._id} election={e} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="section-title mb-4">Upcoming Elections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcoming.map((e) => <ElectionCard key={e._id} election={e} />)}
              </div>
            </section>
          )}

          {ended.length > 0 && (
            <section aria-labelledby="ended-heading">
              <h2 id="ended-heading" className="section-title mb-4">Past Elections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ended.map((e) => <ElectionCard key={e._id} election={e} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </PageLayout>
  );
}
