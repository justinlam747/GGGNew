import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const GameContext = createContext();

export const useGameData = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  // Use relative URLs in production, localhost in development
  const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5001';

  console.log('🔧 API_BASE:', API_BASE, 'PROD:', import.meta.env.PROD);

  const [gameData, setGameData] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [totalData, setTotalData] = useState(null);
  const [gameImages, setGameImages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGameData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching landing page data from CMS...');
      const response = await axios.get(`${API_BASE}/api/public/landing-data`);
      const { gameData, groupData, totalData, gameImages, source } = response.data;

      console.log(`✅ Loaded ${gameData?.length || 0} games from ${source || 'unknown'}`);

      setGameData(gameData);
      setGroupData(groupData);
      setTotalData(totalData);
      setGameImages(gameImages);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching game data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Fetch only once on mount
  useEffect(() => {
    fetchGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    gameData,
    groupData,
    totalData,
    gameImages,
    loading,
    error,
    refetch: fetchGameData,
  }), [gameData, groupData, totalData, gameImages, loading, error, fetchGameData]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
