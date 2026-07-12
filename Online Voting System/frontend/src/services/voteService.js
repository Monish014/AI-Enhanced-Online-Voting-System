import api from './api';

const voteService = {
  castVote: (payload) =>
    api.post('/votes/cast', payload).then((r) => r.data),

  verifyByHash: (blockHash) =>
    api.get(`/votes/verify/${blockHash}`).then((r) => r.data),

  getResults: (electionId) =>
    api.get(`/votes/results/${electionId}`).then((r) => r.data.data),

  checkVoteStatus: (electionId) =>
    api.get(`/votes/status/${electionId}`).then((r) => r.data.data),
};

export default voteService;
