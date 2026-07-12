import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import electionService from '@services/electionService';
import { useElections } from '@context/ElectionContext';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';
import ConfirmModal from '@components/ConfirmModal';

const STATUS_BADGE = {
  active:   'badge-success',
  upcoming: 'badge-info',
  ended:    'badge-gray',
};

const electionSchema = yup.object({
  title:       yup.string().required('Title is required').max(200),
  description: yup.string().optional().max(2000),
  startTime:   yup.string().required('Start time is required'),
  endTime:     yup.string().required('End time is required'),
  isPublicResults: yup.boolean(),
});

const candidateSchema = yup.object({
  name:   yup.string().required('Name is required').max(100),
  party:  yup.string().optional().max(100),
  symbol: yup.string().optional().max(50),
  bio:    yup.string().optional().max(500),
});

const toISTDatetimeString = (d) => {
  if (!d) return '';
  // Convert stored UTC date to IST for display in datetime-local input
  const date = new Date(d);
  const istOffset = 330; // IST = UTC + 5:30
  const istMs = date.getTime() + istOffset * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 16);
};

// datetime-local input gives "YYYY-MM-DDTHH:mm" in the browser's local time
// We treat the entered value as IST explicitly and convert to UTC
const istToUTC = (localStr) => {
  if (!localStr) return '';
  // Parse as IST: append +05:30 offset
  return new Date(localStr + ':00+05:30').toISOString();
};

const getNowIST = () => {
  const istOffset = 330;
  const istMs = Date.now() + istOffset * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 16);
};

export default function ElectionManagement() {
  const { elections, fetchElections, invalidateCache } = useElections();
  const [loading,      setLoading]      = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [editElection, setEditElection] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selected,     setSelected]     = useState(null); // expanded election for candidates
  const [candidates,   setCandidates]   = useState([]);
  const [showCandForm, setShowCandForm] = useState(false);
  const [candImage,    setCandImage]    = useState(null);

  useEffect(() => { fetchElections({}, true); }, []);
  useEffect(() => {
    if (selected) loadCandidates(selected._id);
  }, [selected?._id]);

  const loadCandidates = async (id) => {
    try {
      const data = await electionService.getCandidates(id);
      setCandidates(data || []);
    } catch { setCandidates([]); }
  };

  // ── Election form ──────────────────────────────────────────────────────────
  const { register: regE, handleSubmit: handleE, reset: resetE, formState: { errors: errE } } =
    useForm({ resolver: yupResolver(electionSchema) });

  const openCreate = () => {
    setEditElection(null);
    const nowIST = getNowIST();
    // Default end time = now + 2 hours IST
    const endIST = new Date(new Date(nowIST).getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
    resetE({ title: '', description: '', startTime: nowIST, endTime: endIST, isPublicResults: false });
    setShowForm(true);
  };

  const openEdit = (e) => {
    setEditElection(e);
    resetE({
      title:           e.title,
      description:     e.description || '',
      startTime:       toISTDatetimeString(e.startTime),
      endTime:         toISTDatetimeString(e.endTime),
      isPublicResults: e.isPublicResults,
    });
    setShowForm(true);
  };

  const onSaveElection = async (data) => {
    // Compare as IST strings directly — both are YYYY-MM-DDTHH:mm format
    if (data.startTime >= data.endTime) {
      toast.error('End time must be after start time (IST).');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...data,
        startTime: istToUTC(data.startTime),
        endTime:   istToUTC(data.endTime),
      };
      if (editElection) {
        await electionService.update(editElection._id, payload);
        toast.success('Election updated.');
      } else {
        await electionService.create(payload);
        toast.success('Election created.');
      }
      invalidateCache();
      await fetchElections({}, true);
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      await electionService.delete(deleteTarget._id);
      toast.success('Election deleted.');
      invalidateCache();
      await fetchElections({}, true);
      if (selected?._id === deleteTarget._id) setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Candidate form ─────────────────────────────────────────────────────────
  const { register: regC, handleSubmit: handleC, reset: resetC, formState: { errors: errC } } =
    useForm({ resolver: yupResolver(candidateSchema) });

  const onAddCandidate = async (data) => {
    if (!selected) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (candImage) fd.append('candidateImage', candImage);
      await electionService.addCandidate(selected._id, fd);
      toast.success('Candidate added.');
      await loadCandidates(selected._id);
      resetC();
      setCandImage(null);
      setShowCandForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add candidate.');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteCandidate = async (candidateId) => {
    try {
      await electionService.deleteCandidate(selected._id, candidateId);
      toast.success('Candidate removed.');
      await loadCandidates(selected._id);
    } catch {
      toast.error('Failed to remove candidate.');
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="page-title">Election Management</h1>
          <button onClick={openCreate} className="btn-primary">+ New Election</button>
        </div>

        {/* Elections table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid" aria-label="Elections list">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Title', 'Status', 'Start', 'End', 'Candidates', 'Actions'].map((h) => (
                    <th key={h} scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {elections.map((e) => (
                  <tr
                    key={e._id}
                    className={`hover:bg-slate-50 transition-colors ${selected?._id === e._id ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{e.title}</td>
                    <td className="px-4 py-3"><span className={STATUS_BADGE[e.status]}>{e.status}</span></td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(e.endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.candidates?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(selected?._id === e._id ? null : e)} className="btn-ghost text-xs px-2 py-1">
                          {selected?._id === e._id ? 'Collapse' : 'Candidates'}
                        </button>
                        <button onClick={() => openEdit(e)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button
                          onClick={() => setDeleteTarget(e)}
                          disabled={e.status === 'active'}
                          className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={`Delete election ${e.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {elections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No elections yet. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Candidate panel for selected election */}
        {selected && (
          <div className="card space-y-4 animate-slide-up">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="section-title">Candidates — {selected.title}</h2>
              <button onClick={() => { setShowCandForm(true); resetC(); }} className="btn-primary text-sm">
                + Add Candidate
              </button>
            </div>

            {candidates.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No candidates yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">
                      {c.imageUrl
                        ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api','')}${c.imageUrl}`} alt={c.name} className="w-12 h-12 rounded-xl object-cover" />
                        : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.party || 'Independent'}</p>
                    </div>
                    <button
                      onClick={() => onDeleteCandidate(c._id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                      aria-label={`Remove candidate ${c.name}`}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add candidate form */}
            {showCandForm && (
              <form onSubmit={handleC(onAddCandidate)} className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                <h3 className="font-semibold text-slate-800">New Candidate</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[['name','Name *','text'],['party','Party','text'],['symbol','Symbol','text']].map(([id,label,type]) => (
                    <div key={id}>
                      <label htmlFor={`cand-${id}`} className="label">{label}</label>
                      <input id={`cand-${id}`} type={type} {...regC(id)} className={`input-field ${errC[id]?'input-error':''}`} />
                      {errC[id] && <p className="error-text">{errC[id].message}</p>}
                    </div>
                  ))}
                  <div>
                    <label htmlFor="cand-photo" className="label">Photo</label>
                    <input id="cand-photo" type="file" accept=".jpg,.jpeg,.png"
                      onChange={(e) => setCandImage(e.target.files[0])}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label htmlFor="cand-bio" className="label">Bio</label>
                  <textarea id="cand-bio" rows={2} {...regC('bio')} className="input-field resize-none" placeholder="Short biography..." />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn-primary text-sm">
                    {loading ? <LoadingSpinner size="sm" color="white" /> : 'Add Candidate'}
                  </button>
                  <button type="button" onClick={() => setShowCandForm(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Election form modal */}
      <ConfirmModal
        open={showForm}
        title={editElection ? 'Edit Election' : 'Create New Election'}
        confirmLabel={loading ? 'Saving…' : 'Save Election'}
        cancelLabel="Cancel"
        onConfirm={handleE(onSaveElection)}
        onCancel={() => setShowForm(false)}
      >
        <div className="space-y-3 my-2 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label htmlFor="e-title" className="label">Title *</label>
            <input id="e-title" {...regE('title')} className={`input-field ${errE.title?'input-error':''}`} placeholder="General Election 2025" />
            {errE.title && <p className="error-text">{errE.title.message}</p>}
          </div>
          <div>
            <label htmlFor="e-desc" className="label">Description</label>
            <textarea id="e-desc" rows={3} {...regE('description')} className="input-field resize-none" placeholder="Optional description..." />
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
            🕐 All times are in Indian Standard Time (IST, UTC+5:30)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-start" className="label">Start Time (IST) *</label>
              <input
                id="e-start"
                type="datetime-local"
                {...regE('startTime')}
                className={`input-field ${errE.startTime?'input-error':''}`}
              />
              {errE.startTime && <p className="error-text">{errE.startTime.message}</p>}
            </div>
            <div>
              <label htmlFor="e-end" className="label">End Time (IST) *</label>
              <input
                id="e-end"
                type="datetime-local"
                {...regE('endTime')}
                className={`input-field ${errE.endTime?'input-error':''}`}
              />
              {errE.endTime && <p className="error-text">{errE.endTime.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...regE('isPublicResults')} className="rounded border-slate-300 text-primary-600" />
            <span className="text-sm text-slate-700">Publish results publicly after election ends</span>
          </label>
        </div>
      </ConfirmModal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Election?"
        message={`"${deleteTarget?.title}" and all its candidates will be permanently deleted.`}
        confirmLabel="Delete"
        confirmClass="btn-danger"
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageLayout>
  );
}
