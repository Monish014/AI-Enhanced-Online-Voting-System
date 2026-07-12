import api from './api';

const electionService = {
  getAll: (params = {}) =>
    api.get('/elections', { params }).then((r) => r.data.data),

  getById: (id) =>
    api.get(`/elections/${id}`).then((r) => r.data.data),

  create: (payload) =>
    api.post('/elections', payload).then((r) => r.data.data),

  update: (id, payload) =>
    api.put(`/elections/${id}`, payload).then((r) => r.data.data),

  delete: (id) =>
    api.delete(`/elections/${id}`).then((r) => r.data),

  getCandidates: (electionId) =>
    api.get(`/elections/${electionId}/candidates`).then((r) => r.data.data),

  addCandidate: (electionId, formData) =>
    api.post(`/elections/${electionId}/candidates`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),

  updateCandidate: (electionId, candidateId, formData) =>
    api.put(`/elections/${electionId}/candidates/${candidateId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data),

  deleteCandidate: (electionId, candidateId) =>
    api.delete(`/elections/${electionId}/candidates/${candidateId}`).then((r) => r.data),
};

export default electionService;
