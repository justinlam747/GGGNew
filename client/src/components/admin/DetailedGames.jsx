import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import DetailedLineChart from './charts/DetailedLineChart';
import { Button } from '../ui/button';
import { getApiBaseUrl } from '../../utils/api';

// Helper to convert time range to dates
const getDateRange = (range) => {
  const end = new Date().toISOString();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
};

const DetailedGames = () => {
  const [selectedGame, setSelectedGame] = useState('all'); // Single selection (game ID or 'all')
  const [timeRange, setTimeRange] = useState('7d');
  const [gamesList, setGamesList] = useState([]);
  const [allGamesStats, setAllGamesStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('playing'); // Single metric selector

  const API_BASE = getApiBaseUrl();

  // Fetch games list from CMS
  useEffect(() => {
    fetchGamesList();
  }, []);

  const fetchGamesList = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/cms/games`, { withCredentials: true });
      if (response.data.success) {
        const games = response.data.data.map(game => ({
          id: game.universe_id,
          name: game.name,
          is_active: game.is_active
        }));
        setGamesList(games);
      }
    } catch (error) {
      console.error('Error fetching games list from CMS:', error);
    }
  };

  // Fetch all games current stats for the table
  useEffect(() => {
    fetchAllGamesStats();
  }, []);

  const fetchAllGamesStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/analytics/overview`, { withCredentials: true });
      setAllGamesStats(response.data.topGames || []);
    } catch (error) {
      console.error('Error fetching all games stats:', error);
    }
  };

  // Fetch chart data when selection or time range changes
  useEffect(() => {
    fetchChartData();
  }, [selectedGame, timeRange]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      if (selectedGame === 'all') {
        // Overall view - fetch aggregated data
        const hours = timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : timeRange === '90d' ? 2160 : 8760;
        const response = await axios.get(`${API_BASE}/admin/analytics/history?hours=${hours}`, { withCredentials: true });
        setChartData(response.data);
      } else {
        // Fetch data for selected game
        const { start, end } = getDateRange(timeRange);
        const response = await axios.get(
          `${API_BASE}/admin/analytics/games?universeId=${selectedGame}&startDate=${start}&endDate=${end}`,
          { withCredentials: true }
        );
        setChartData(response.data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchGamesList();
    fetchAllGamesStats();
    fetchChartData();
  };

  // Calculate overall KPIs
  const overallKPIs = {
    totalPlaying: allGamesStats.reduce((sum, g) => sum + (g.playing || 0), 0),
    totalVisits: allGamesStats.reduce((sum, g) => sum + (g.visits || 0), 0),
    totalFavorites: allGamesStats.reduce((sum, g) => sum + (g.favorites || 0), 0),
    totalLikes: allGamesStats.reduce((sum, g) => sum + (g.likes || 0), 0),
    avgPlaying: allGamesStats.length > 0 ? Math.round(allGamesStats.reduce((sum, g) => sum + (g.playing || 0), 0) / allGamesStats.length) : 0,
    activeGames: allGamesStats.filter(g => g.playing > 0).length
  };

  const metricLabels = {
    playing: 'Current Players vs Time',
    visits: 'Total Visits vs Time',
    favorites: 'Favorites vs Time'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Games Analytics</h1>
          <p className="text-white/50 mt-1">Comprehensive analytics and KPI tracking for all games</p>
        </div>
        <Button onClick={handleRefresh} className="bg-white text-black">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

    {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-white bg-neutral-900 rounded-lg">
          <div className="text-lg">Loading chart data...</div>
        </div>
      ) : (
        <div className="bg-neutral-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">
            {selectedGame === 'all'
              ? `Overall ${metricLabels[metric]} (All Games)`
              : `${gamesList.find(g => g.id === parseInt(selectedGame))?.name || 'Game'} - ${metricLabels[metric]}`}
          </h2>
          <DetailedLineChart
            data={chartData}
            selectedGame={selectedGame === 'all' ? null : selectedGame}
            metric={metric}
          />
        </div>
      )}
      {/* Overall KPIs */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">Overall KPIs</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Playing</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalPlaying.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Visits</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalVisits.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Favorites</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalFavorites.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Likes</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalLikes.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Avg Playing</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.avgPlaying.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Active Games</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.activeGames}</div>
          </div>
        </div>
      </div>

      {/* Game Selection & Controls */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Game Selector */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Select Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-black text-white border border-white/20 rounded px-4 py-2"
            >
              <option value="all">All Games (Overall)</option>
              {gamesList.map(game => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Time Range</label>
            <div className="flex gap-2">
              {['7d', '30d', '90d', '1y'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded ${
                    timeRange === range
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white/20'
                  }`}
                >
                  {range === '7d' && '7 Days'}
                  {range === '30d' && '30 Days'}
                  {range === '90d' && '90 Days'}
                  {range === '1y' && '1 Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selector */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Show Graph Of</label>
            <div className="flex flex-col gap-2">
              {['playing', 'visits', 'favorites'].map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-4 py-2 rounded text-left ${
                    metric === m
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white/20'
                  }`}
                >
                  {metricLabels[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default DetailedGames;
