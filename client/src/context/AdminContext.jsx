import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false - only check auth when needed

  // Use empty string for production (relative URLs), localhost for development
  const API_BASE = import.meta.env.VITE_API_BASE !== undefined
    ? import.meta.env.VITE_API_BASE
    : 'http://localhost:5001';

  const checkAuth = useCallback(async () => {
    console.log('[AdminContext] checkAuth called, pathname:', window.location.pathname);
    // Only check auth if on admin route
    if (!window.location.pathname.startsWith('/admin')) {
      console.log('[AdminContext] Not on admin route, skipping auth check');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminContext] Checking auth at:', `${API_BASE}/admin/me`);
      const response = await axios.get(`${API_BASE}/admin/me`, {
        withCredentials: true
      });
      console.log('[AdminContext] Auth response:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('[AdminContext] Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    // Only check auth on admin routes
    if (window.location.pathname.startsWith('/admin')) {
      checkAuth();
    }
  }, [checkAuth]);

  const login = useCallback(async (username, password) => {
    console.log('[AdminContext] Login attempt for:', username);
    const response = await axios.post(
      `${API_BASE}/admin/login`,
      { username, password },
      { withCredentials: true }
    );
    console.log('[AdminContext] Login response:', response.data);
    setUser(response.data.user);
    return response.data;
  }, [API_BASE]);

  const logout = useCallback(async () => {
    await axios.post(`${API_BASE}/admin/logout`, {}, { withCredentials: true });
    setUser(null);
  }, [API_BASE]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    checkAuth
  }), [user, loading, login, logout, checkAuth]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
