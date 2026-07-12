import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import adminService from '@services/adminService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';

const ACTION_BADGE = {
  LOGIN:                'badge-success',
  LOGOUT:               'badge-gray',
  LOGIN_FAIL:           'badge-danger',
  REGISTER:             'badge-info',
  OTP_VERIFIED:         'badge-info',
  VOTE_CAST:            'badge-success',
  FACE_VERIFY_SUCCESS:  'badge-success',
  FACE_VERIFY_FAIL:     'badge-danger',
  FACE_ENROLLED:        'badge-info',
  ELECTION_CREATED:     'badge-info',
  ELECTION_UPDATED:     'badge-warning',
  ELECTION_DELETED:     'badge-danger',
  CANDIDATE_ADDED:      'badge-info',
  FRAUD_ALERT_RESOLVED: 'badge-warning',
  DUPLICATE_VOTE_ATTEMPT: 'badge-danger',
};

const RISK_COLOR = (score) => {
  if (score >= 70) return 'text-red-700 font-bold';
  if (score >= 40) return 'text-orange-600 font-semibold';
  if (score >= 20) return 'text-yellow-600';
  return 'text-slate-400';
};

const LIMIT = 50;

export default function AuditLogViewer() {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [filters,  setFilters]  = useState({ action: '', from: '', to: '' });
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.action) params.action = filters.action;
      if (filters.from)   params.from   = filters.from;
      if (filters.to)     params.to     = filters.to;

      const data = await adminService.getAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = search
    ? logs.filter((l) =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.ipAddress?.includes(search)
      )
    : logs;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <PageLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Audit Log Viewer</h1>
            <p className="text-slate-500 text-sm">{total.toLocaleString()} total entries</p>
          </div>
          <button onClick={load} className="btn-secondary text-sm">🔄 Refresh</button>
        </div>

        {/* Filters */}
        <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="search" aria-label="Filter audit logs">
          <div>
            <label htmlFor="log-search" className="label">Search</label>
            <input
              id="log-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, IP, action..."
              className="input-field"
              aria-label="Search audit logs"
            />
          </div>
          <div>
            <label htmlFor="log-action" className="label">Action</label>
            <input
              id="log-action"
              type="text"
              value={filters.action}
              onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
              placeholder="e.g. VOTE_CAST"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="log-from" className="label">From Date</label>
            <input
              id="log-from"
              type="datetime-local"
              value={filters.from}
              onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="log-to" className="label">To Date</label>
            <input
              id="log-to"
              type="datetime-local"
              value={filters.to}
              onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }}
              className="input-field"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2" aria-hidden="true">📋</p>
              <p className="font-medium">No logs match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Audit log entries">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Timestamp', 'User', 'Action', 'IP Address', 'Risk Score', 'Reason'].map((h) => (
                      <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {log.userId ? (
                          <div>
                            <p className="font-medium text-slate-900 whitespace-nowrap">{log.userId.name}</p>
                            <p className="text-xs text-slate-400">{log.userId.voterId}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Anonymous</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${ACTION_BADGE[log.action] || 'badge-gray'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ipAddress || '—'}</td>
                      <td className={`px-4 py-3 text-xs ${RISK_COLOR(log.riskScore)}`}>
                        {log.riskScore > 0 ? log.riskScore : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                        {log.flaggedReason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between" role="navigation" aria-label="Log pagination">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total.toLocaleString()} entries)
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1} className="btn-secondary text-xs px-3 py-2">First</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2">←</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2">→</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-2">Last</button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
