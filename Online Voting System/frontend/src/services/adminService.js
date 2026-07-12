import api from './api';

const adminService = {
  getDashboardStats: () =>
    api.get('/admin/dashboard-stats').then((r) => r.data.data),

  getAuditLogs: (params = {}) =>
    api.get('/admin/audit-logs', { params }).then((r) => r.data.data),

  exportResults: (electionId) =>
    api.get(`/admin/export-results/${electionId}`, { responseType: 'blob' }).then((r) => {
      const url  = window.URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `results-${electionId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }),

  getUsers: (params = {}) =>
    api.get('/admin/users', { params }).then((r) => r.data.data),

  toggleUserActive: (userId) =>
    api.put(`/admin/users/${userId}/toggle-active`).then((r) => r.data.data),

  deleteUser: (userId) =>
    api.delete(`/admin/users/${userId}`).then((r) => r.data),

  validateChain: (electionId) =>
    api.get(`/admin/validate-chain/${electionId}`).then((r) => r.data.data),

  getTurnoutTimeSeries: (electionId) =>
    api.get(`/admin/turnout/${electionId}`).then((r) => r.data.data),
};

export default adminService;
