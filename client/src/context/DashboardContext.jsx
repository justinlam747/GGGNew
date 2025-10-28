import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  // Use relative URLs in production, localhost in development
  const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5001';

  // Load from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('dashboard_cache');
    if (cached) {
      try {
        const { overview: cachedOverview, history: cachedHistory, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Use cache if less than 15 minutes old
        if (age < 15 * 60 * 1000) {
          setOverview(cachedOverview);
          setHistory(cachedHistory);
          setLastFetch(timestamp);
          setLoading(false);
          console.log('[DashboardContext] Loaded from cache, age:', Math.floor(age / 1000), 'seconds');
          return;
        }
      } catch (error) {
        console.error('[DashboardContext] Failed to parse cache:', error);
      }
    }

    // No valid cache, fetch fresh data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    console.log('[DashboardContext] Fetching fresh data...');
    setLoading(true);

    try {
      const [overviewRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/analytics/overview`, { withCredentials: true }),
        axios.get(`${API_BASE}/admin/analytics/history?hours=168`, { withCredentials: true })
      ]);

      const timestamp = Date.now();

      setOverview(overviewRes.data);
      setHistory(historyRes.data);
      setLastFetch(timestamp);

      // Save to localStorage
      localStorage.setItem('dashboard_cache', JSON.stringify({
        overview: overviewRes.data,
        history: historyRes.data,
        timestamp
      }));

      console.log('[DashboardContext] Data fetched and cached');
    } catch (error) {
      console.error('[DashboardContext] Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const clearCache = useCallback(() => {
    localStorage.removeItem('dashboard_cache');
    setOverview(null);
    setHistory([]);
    setLastFetch(null);
  }, []);

  const value = useMemo(() => ({
    overview,
    history,
    loading,
    lastFetch,
    refresh: fetchDashboardData,
    clearCache
  }), [overview, history, loading, lastFetch, fetchDashboardData, clearCache]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
