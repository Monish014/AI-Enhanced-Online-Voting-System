import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import adminService from '@services/adminService';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import ConfirmModal from '@components/ConfirmModal';

export default function VoterManagement() {
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        role: 'voter',
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setUsers(data.users || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load voters.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (user) => {
    setActionLoading(user._id);
    try {
      const result = await adminService.toggleUserActive(user._id);
      setUsers((prev) => prev.map((u) =>
        u._id === user._id ? { ...u, isActive: result.isActive } : u
      ));
      toast.success(`Voter ${result.isActive ? 'activated' : 'deactivated'}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteUser(deleteTarget._id);
      toast.success(`Voter ${deleteTarget.voterId} deleted.`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setTotal((t) => t - 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <PageLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Voter Management</h1>
            <p className="text-slate-500 text-sm">{total} registered voters</p>
          </div>
          <button onClick={load} className="btn-secondary text-sm">🔄 Refresh</button>
        </div>

        {/* Search */}
        <div className="card p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or Voter ID..."
            className="input-field"
            aria-label="Search voters"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2" aria-hidden="true">👥</p>
              <p className="font-medium">No voters found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Voter list">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Voter ID', 'Name', 'Email', 'Phone', 'Status', 'Registered', 'Actions'].map((h) => (
                      <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.voterId}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                      <td className="px-4 py-3 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3 text-slate-500">{user.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString('en-IN', {
                          timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Activate / Deactivate */}
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={actionLoading === user._id}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              user.isActive
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            } disabled:opacity-50`}
                            aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}`}
                          >
                            {actionLoading === user._id
                              ? '...'
                              : user.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                            aria-label={`Delete voter ${user.name}`}
                          >
                            🗑 Delete
                          </button>
                        </div>
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2">←</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Voter Account?"
        message={`This will permanently delete voter "${deleteTarget?.name}" (${deleteTarget?.voterId}). This action cannot be undone.`}
        confirmLabel="Yes, Delete Permanently"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageLayout>
  );
}
