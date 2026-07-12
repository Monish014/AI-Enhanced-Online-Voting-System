import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import voteService from '@services/voteService';
import adminService from '@services/adminService';
import electionService from '@services/electionService';
import { useElections } from '@context/ElectionContext';
import PageLayout from '@components/PageLayout';
import LoadingSpinner from '@components/LoadingSpinner';

const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#be123c'];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage }) => {
  if (percentage < 5) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

export default function ResultsAnalytics() {
  const { electionId: paramId } = useParams();
  const { elections, fetchElections } = useElections();

  const [selectedId,  setSelectedId]  = useState(paramId || '');
  const [results,     setResults]     = useState(null);
  const [timeSeries,  setTimeSeries]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);

  useEffect(() => { fetchElections({}, false); }, []);

  useEffect(() => {
    if (selectedId) loadData(selectedId);
  }, [selectedId]);

  const loadData = async (id) => {
    setLoading(true);
    try {
      const [resultsData, turnoutData] = await Promise.all([
        voteService.getResults(id),
        adminService.getTurnoutTimeSeries(id),
      ]);
      setResults(resultsData);
      setTimeSeries(turnoutData || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load results.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      await adminService.exportResults(selectedId);
      toast.success('Results exported as CSV.');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  // Recharts data
  const barData = results?.results?.map((r) => ({
    name:    r.name,
    votes:   r.voteCount,
    percent: r.percentage,
    party:   r.party || 'Independent',
  })) || [];

  const pieData = results?.results?.map((r) => ({
    name:  r.name,
    value: r.voteCount,
  })) || [];

  return (
    <PageLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="page-title">Results & Analytics</h1>
          <button
            onClick={handleExport}
            disabled={!selectedId || exporting}
            className="btn-secondary text-sm"
            aria-label="Export results as CSV"
          >
            {exporting ? <LoadingSpinner size="sm" /> : '📥 Export CSV'}
          </button>
        </div>

        {/* Election selector */}
        <div className="card p-4">
          <label htmlFor="election-select" className="label">Select Election</label>
          <select
            id="election-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-field max-w-md"
          >
            <option value="">— Choose an election —</option>
            {elections.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title} ({e.status})
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        )}

        {results && !loading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="text-3xl font-extrabold text-primary-700">{results.totalVotes}</div>
                <div className="text-sm text-slate-500 mt-1">Total Votes Cast</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-extrabold text-green-700">
                  {results.results?.[0]?.name || '—'}
                </div>
                <div className="text-sm text-slate-500 mt-1">Leading Candidate</div>
              </div>
              <div className="card text-center col-span-2 sm:col-span-1">
                <div className="text-3xl font-extrabold text-slate-700">
                  {results.results?.length || 0}
                </div>
                <div className="text-sm text-slate-500 mt-1">Total Candidates</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="card space-y-4">
              <h2 className="section-title">Vote Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  aria-label="Vote distribution bar chart">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [name === 'percent' ? `${value}%` : value, name === 'percent' ? 'Share' : 'Votes']}
                  />
                  <Legend />
                  <Bar dataKey="votes" fill="#2563eb" radius={[4, 4, 0, 0]} name="Votes" />
                  <Bar dataKey="percent" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Percentage" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            {pieData.length > 0 && results.totalVotes > 0 && (
              <div className="card space-y-4">
                <h2 className="section-title">Vote Share</h2>
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart aria-label="Vote share pie chart">
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        labelLine={false}
                        label={(props) => renderCustomLabel({ ...props, percentage: (props.value / results.totalVotes) * 100 })}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} votes (${((v / results.totalVotes) * 100).toFixed(1)}%)`]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Turnout time-series */}
            {timeSeries.length > 0 && (
              <div className="card space-y-4">
                <h2 className="section-title">Voter Turnout Over Time</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    aria-label="Voter turnout over time line chart">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="votes" stroke="#2563eb" strokeWidth={2} dot={false} name="Votes / Hour" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Results table */}
            <div className="card overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="section-title">Detailed Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Detailed election results">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Rank','Candidate','Party','Votes','Share'].map((h) => (
                        <th key={h} scope="col" className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.results.map((r, i) => (
                      <tr key={r._id} className={i === 0 ? 'bg-green-50' : 'hover:bg-slate-50'}>
                        <td className="px-5 py-3">
                          <span className={`font-bold ${i === 0 ? 'text-green-700' : 'text-slate-500'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{r.name}</td>
                        <td className="px-5 py-3 text-slate-500">{r.party || 'Independent'}</td>
                        <td className="px-5 py-3 font-semibold text-primary-700">{r.voteCount.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-1.5">
                              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${r.percentage}%` }} aria-hidden="true" />
                            </div>
                            <span className="text-slate-600 font-medium">{r.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!selectedId && !loading && (
          <div className="card text-center py-16 text-slate-400">
            <p className="text-4xl mb-3" aria-hidden="true">📊</p>
            <p className="font-medium text-lg">Select an election to view analytics</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
