import api from './api';

const chatbotService = {
  ask: (question) =>
    api.post('/chatbot/ask', { question }).then((r) => r.data.data),

  getHistory: () =>
    api.get('/chatbot/history').then((r) => r.data.data),
};

export default chatbotService;
