import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import fraudService from '@services/fraudService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import ConfirmModal from '@components/ConfirmModal';
import useSocket from '@hooks/useSocket';
import { useAuth } from '@context/AuthContext';

const SEVERITY_STYLES = {
  critical: { badge: 'bg-red-100 text-red-800',    row: 'border-l-4 border-red-500' },
  high:     { badge: 'bg-orange-100 text-orange-800', row: 'border-l-4 border-orange-400' },
  medium:   { badge: 'bg-yellow-100 text-yellow-800', row: 'border-l-4 border-yellow-400' },
  low:      { badge: 'bg-blue-100 text-blue-800',   row: 'border-l-4 border-blue-400' },
};

const TYPE_LABEL = {
  duplicate_attempt:  '🔁 Duplicate Vote',
  bot_pattern:        '🤖 Bot Pattern',
  ip_cluster:         '📡 IP Cluster',
  deepfake_suspected: '🎭 Deepfake',
  device_mismatch:    '📱 Device Mismatch',
  rate_limit_breach:  '⚡ Rate Limit',
};

const ALL_TYPES     = ['', ...Object.keys(TYPE_LABEL)];
const ALL_SEVERITIES = ['', 'critical', 'high', 'medium', 'low'];

export default function FraudAlerts() {
  const { isAdmin } = useAuth();
  const [alerts,   setAlerts]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ type: '', severity: '', resolved: 'false' });
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [resolving, setResolving] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, ...filters };
      if (!params.type)     delete params.type;
      if (!params.severity) delete params.severity;
      const [data, statsData] = await Promise.all([
        fraudService.getAlerts(params),
        fraudService.getStats(),
      ]);
      setAlerts(data.alerts || []);
      setTotal(data.pagination?.total || 0);
      setStats(statsData);
    } catch {
      toast.error('Failed to load fraud alerts.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // Live socket updates
  useSocket(isAdmin, {
    'fraud-alert': (alert) => {
      setAlerts((prev) => [{ ...alert, _id: alert.id }, ...prev]);
      setTotal((t) => t + 1);
      toast.warning(`🚨 New ${alert.severity} alert: ${alert.type?.replace(/_/g, ' ')}`, { autoClose: 6000 });
    },
    'alert-resolved': ({ id }) => {
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, resolved: true } : a));
    },
  });

  const handleResolve = async () => {
    try {
      await fraudService.resolveAlert(resolving, resolveNote);
      toast.success('Alert resolved.');
      setAlerts((prev) => prev.map((a) => a._id === resolving ? { ...a, resolved: true } : a));
      if (filters.resolved === 'false') {
        setAlerts((prev) => prev.filter((a) => a._id !== resolving));
      }
    } catch {
      toast.error('Failed to resolve alert.');
    } finally {
      setResolving(null);
      setResolveNote('');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <PageLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Fraud Alerts</h1>
            <p className="text-slate-500 text-sm">{total} total alerts</p>
          </div>
          <button onClick={load} className="btn-secondary text-sm">🔄 Refresh</button>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Unresolved',  value: stats.unresolved,  color: 'bg-red-50 text-red-800' },
              ...['critical','high','medium','low'].map((s) => ({
                label: s.charAt(0).toUpperCase() + s.slice(1),
                value: stats.bySeverity?.find((b) => b._id === s)?.count || 0,
                color: SEVERITY_STYLES[s]?.badge + ' border border-transparent',
              })),
            ].slice(0, 4).map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`} role="status" aria-label={`${s.label}: ${s.value}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-end" role="search" aria-label="Filter fraud alerts">
          <div>
            <label htmlFor="filter-type" className="label">Type</label>
            <select id="filter-type" value={filters.type}
              onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value })); setPage(1); }}
              className="input-field py-2 w-auto min-w-[160px]">
              <option value="">All Types</option>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-sev" className="label">Severity</label>
            <select id="filter-sev" value={filters.severity}
              onChange={(e) => { setFilters((f) => ({ ...f, severity: e.target.value })); setPage(1); }}
              className="input-field py-2 w-auto min-w-[140px]">
              <option value="">All Severities</option>
              {ALL_SEVERITIES.slice(1).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-resolved" className="label">Status</label>
            <select id="filter-resolved" value={filters.resolved}
              onChange={(e) => { setFilters((f) => ({ ...f, resolved: e.target.value })); setPage(1); }}
              className="input-field py-2 w-auto">
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>

        {/* Alerts list */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2" aria-hidden="true">✅</p>
              <p className="font-medium">No alerts matching your filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" aria-label="Fraud alerts list">
              {alerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
                return (
                  <li
                    key={alert._id}
                    className={`px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors ${style.row}`}
                    aria-label={`${alert.severity} ${alert.type} alert`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${style.badge} capitalize`}>{alert.severity}</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {TYPE_LABEL[alert.type] || alert.type?.replace(/_/g,' ')}
                        </span>
                        {alert.resolved && <span className="badge badge-success text-xs">Resolved</span>}
                      </div>
                      <p className="text-sm text-slate-600">{alert.details}</p>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.userId?.name && <span>User: {alert.userId.name}</span>}
                        {alert.electionId?.title && <span>Election: {alert.electionId.title}</span>}
                      </div>
                    </div>

                    {!alert.resolved && (
                      <button
                        onClick={() => setResolving(alert._id)}
                        className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
                        aria-label={`Resolve alert: ${alert.type}`}
                      >
                        Resolve
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Pagination">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2">←</button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2">→</button>
          </div>
        )}
      </div>

      {/* Resolve modal */}
      <ConfirmModal
        open={!!resolving}
        title="Resolve Fraud Alert"
        confirmLabel="Mark as Resolved"
        confirmClass="btn-primary bg-green-600 hover:bg-green-700"
        onConfirm={handleResolve}
        onCancel={() => { setResolving(null); setResolveNote(''); }}
      >
        <div className="space-y-2 mt-2">
          <label htmlFor="resolve-note" className="label">Resolution Note (optional)</label>
          <textarea
            id="resolve-note"
            rows={3}
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Describe the resolution..."
            className="input-field resize-none text-sm"
          />
        </div>
      </ConfirmModal>
    </PageLayout>
  );
}
