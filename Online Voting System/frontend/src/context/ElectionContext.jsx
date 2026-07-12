import React, { createContext, useContext, useState, useCallback } from 'react';
import electionService from '@services/electionService';

const ElectionContext = createContext(null);

export const ElectionProvider = ({ children }) => {
  const [elections, setElections]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const CACHE_TTL_MS = 60_000; // 1 minute cache

  const fetchElections = useCallback(async (params = {}, force = false) => {
    // Use cache if fresh and no explicit force-refresh
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL_MS && elections.length > 0) {
      return elections;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await electionService.getAll(params);
      setElections(data.elections || []);
      setLastFetched(Date.now());
      return data.elections;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load elections.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [elections, lastFetched]);

  const getElectionById = useCallback((id) => {
    return elections.find((e) => e._id === id) || null;
  }, [elections]);

  const invalidateCache = useCallback(() => {
    setLastFetched(null);
  }, []);

  return (
    <ElectionContext.Provider value={{
      elections, loading, error,
      fetchElections, getElectionById, invalidateCache,
      setElections,
    }}>
      {children}
    </ElectionContext.Provider>
  );
};

export const useElections = () => {
  const ctx = useContext(ElectionContext);
  if (!ctx) throw new Error('useElections must be used within ElectionProvider');
  return ctx;
};

export default ElectionContext;
