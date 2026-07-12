import api from './api';

const authService = {
  register: (formData) =>
    api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  verifyOtp: (userId, otp) =>
    api.post('/auth/verify-otp', { userId, otp }).then((r) => r.data),

  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  faceVerify: (faceDescriptor, livenessPass) =>
    api.post('/auth/face-verify', { faceDescriptor, livenessPass }).then((r) => r.data),

  enrollFace: (faceDescriptor) =>
    api.post('/auth/enroll-face', { faceDescriptor }).then((r) => r.data),

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh-token', { refreshToken }).then((r) => r.data),

  logout: () =>
    api.post('/auth/logout').then((r) => r.data),

  getProfile: () =>
    api.get('/auth/me').then((r) => r.data),
};

export default authService;
