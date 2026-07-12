import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@services/api';

const AuthContext = createContext(null);

const TOKEN_KEY    = 'voteai_access_token';
const REFRESH_KEY  = 'voteai_refresh_token';
const USER_KEY     = 'voteai_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [token, setToken]         = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading]     = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ── Persist helpers ────────────────────────────────────────────────────────
  const persist = (accessToken, refreshToken, userData) => {
    localStorage.setItem(TOKEN_KEY,   accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    // Attach to axios default header
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  };

  const clear = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  // ── Boot: attach stored token to axios ────────────────────────────────────
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setInitialized(true);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.data.accessToken, data.data.refreshToken, data.data.user);
      return { success: true, user: data.data.user };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clear();
  }, []);

  // ── Refresh Token ──────────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) { clear(); return null; }
    try {
      const { data } = await api.post('/auth/refresh-token', { refreshToken: stored });
      const { accessToken, refreshToken: newRefresh } = data.data;
      localStorage.setItem(TOKEN_KEY,   accessToken);
      localStorage.setItem(REFRESH_KEY, newRefresh);
      setToken(accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      return accessToken;
    } catch {
      clear();
      return null;
    }
  }, []);

  // ── Update user in state (e.g. after face enroll) ─────────────────────────
  const updateUser = useCallback((updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, [user]);

  const isAuthenticated = !!token && !!user;
  const isAdmin  = user?.role === 'admin';
  const isVoter  = user?.role === 'voter';

  return (
    <AuthContext.Provider value={{
      user, token, loading, initialized,
      isAuthenticated, isAdmin, isVoter,
      login, logout, refreshToken, updateUser,
      persist, clear,
    }}>
      {initialized ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
