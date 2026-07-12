import api from './api';

const fraudService = {
  getAlerts: (params = {}) =>
    api.get('/fraud/alerts', { params }).then((r) => r.data.data),

  getStats: () =>
    api.get('/fraud/stats').then((r) => r.data.data),

  flagAlert: (payload) =>
    api.post('/fraud/flag', payload).then((r) => r.data.data),

  resolveAlert: (id, resolverNote = '') =>
    api.put(`/fraud/alerts/${id}/resolve`, { resolverNote }).then((r) => r.data.data),

  getRiskScore: (userId) =>
    api.get(`/fraud/risk-score/${userId}`).then((r) => r.data.data),
};

export default fraudService;
