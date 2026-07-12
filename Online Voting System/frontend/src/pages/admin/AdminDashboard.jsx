import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '@services/adminService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import useSocket from '@hooks/useSocket';
import { useAuth } from '@context/AuthContext';

const SEVERITY_COLOR = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  low:      'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
};

function StatCard({ icon, label, value, sub, color = 'bg-white', loading }) {
  return (
    <div className={`card ${color} space-y-1`} role="status" aria-label={label}>
      <div className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        {loading && <LoadingSpinner size="sm" />}
      </div>
      <div className="text-3xl font-extrabold text-slate-900">
        {loading ? '—' : value ?? '—'}
      </div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [liveVotes,  setLiveVotes]  = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch {
      toast.error('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Real-time socket events
  useSocket(isAdmin, {
    'fraud-alert': (alert) => {
      setLiveAlerts((prev) => [alert, ...prev].slice(0, 10));
      toast.warning(`🚨 Fraud alert: ${alert.type} — ${alert.severity}`, { autoClose: 8000 });
      // Refresh stats
      loadStats();
    },
    'vote-cast': () => {
      setLiveVotes((v) => v + 1);
    },
    'election-update': () => {
      loadStats();
    },
  });

  const allAlerts = [
    ...liveAlerts,
    ...(stats?.recentAlerts || []),
  ].slice(0, 8);

  return (
    <PageLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
              Live monitoring active
            </p>
          </div>
          <button
            onClick={loadStats}
            className="btn-secondary text-sm"
            aria-label="Refresh dashboard data"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="👥" label="Verified Voters"    value={stats?.totalVoters}       loading={loading} />
          <StatCard icon="🗳️" label="Total Votes Cast"   value={(stats?.totalVotesCast ?? 0) + liveVotes} sub={`${stats?.votesToday ?? 0} today`} loading={loading} />
          <StatCard icon="⚡" label="Active Elections"   value={stats?.activeElections}   loading={loading} color="bg-green-50" />
          <StatCard icon="🚨" label="Open Fraud Alerts"  value={stats?.openAlerts}        loading={loading} color={stats?.openAlerts > 0 ? 'bg-red-50' : 'bg-white'} />
        </div>

        {/* Turnout */}
        {stats && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Overall Voter Turnout</h2>
              <span className="text-2xl font-bold text-primary-700">{stats.turnoutPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3" role="progressbar"
              aria-valuenow={stats.turnoutPercent} aria-valuemin={0} aria-valuemax={100}
              aria-label={`Turnout: ${stats.turnoutPercent}%`}>
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(stats.turnoutPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {stats.totalVotesCast} votes cast out of {stats.totalVoters} registered voters
            </p>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/admin/elections',    icon: '🗳️', label: 'Manage Elections' },
            { to: '/admin/fraud-alerts', icon: '🚨', label: 'Fraud Alerts',    badge: stats?.openAlerts },
            { to: '/admin/results',      icon: '📊', label: 'Results & Analytics' },
            { to: '/admin/audit-logs',   icon: '📋', label: 'Audit Logs' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="card-hover text-center space-y-2 relative"
              aria-label={item.label}
            >
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold" aria-label={`${item.badge} alerts`}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              <div className="text-2xl" aria-hidden="true">{item.icon}</div>
              <div className="text-xs font-semibold text-slate-700">{item.label}</div>
            </Link>
          ))}
        </div>

        {/* Live Fraud Alerts */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
              Recent Fraud Alerts
            </h2>
            <Link to="/admin/fraud-alerts" className="text-sm text-primary-600 hover:underline font-medium">
              View all →
            </Link>
          </div>

          {allAlerts.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-3xl mb-2" aria-hidden="true">✅</p>
              <p className="text-sm font-medium">No open fraud alerts</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-6"><LoadingSpinner /></div>
          ) : (
            <ul className="space-y-2" aria-label="Recent fraud alerts">
              {allAlerts.map((alert, i) => (
                <li
                  key={alert.id || alert._id || i}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${SEVERITY_COLOR[alert.severity] || 'bg-slate-50 border-slate-200'}`}
                  aria-label={`${alert.severity} alert: ${alert.type}`}
                >
                  <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[alert.severity]}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold capitalize">{alert.type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs opacity-80 truncate">{alert.details}</p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {new Date(alert.timestamp).toLocaleString()}
                      {alert.userId?.name && ` · ${alert.userId.name}`}
                    </p>
                  </div>
                  <span className="badge badge-danger capitalize flex-shrink-0">{alert.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
