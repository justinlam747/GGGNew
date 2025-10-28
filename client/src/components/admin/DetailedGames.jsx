import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import DetailedLineChart from './charts/DetailedLineChart';
import { Button } from '../ui/button';

// Helper to convert time range to dates
const getDateRange = (range) => {
  const end = new Date().toISOString();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
};

const DetailedGames = () => {
  const [selectedGames, setSelectedGames] = useState([]); // Multiple selection
  const [timeRange, setTimeRange] = useState('7d');
  const [gamesList, setGamesList] = useState([]);
  const [allGamesStats, setAllGamesStats] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('playing'); // playing, visits, favorites, likes

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

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
  }, [selectedGames, timeRange]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      if (selectedGames.length === 0) {
        // Overall view - fetch aggregated data
        const hours = timeRange === '7d' ? 168 : timeRange === '30d' ? 720 : timeRange === '90d' ? 2160 : 8760;
        const response = await axios.get(`${API_BASE}/admin/analytics/history?hours=${hours}`, { withCredentials: true });
        setChartData({ overall: response.data });
      } else {
        // Fetch data for each selected game
        const { start, end } = getDateRange(timeRange);
        const promises = selectedGames.map(gameId =>
          axios.get(
            `${API_BASE}/admin/analytics/games?universeId=${gameId}&startDate=${start}&endDate=${end}`,
            { withCredentials: true }
          )
        );
        const results = await Promise.all(promises);
        const data = {};
        results.forEach((res, index) => {
          data[selectedGames[index]] = res.data;
        });
        setChartData(data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGameSelection = (gameId) => {
    setSelectedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const selectAllGames = () => {
    setSelectedGames(gamesList.map(g => g.id));
  };

  const clearSelection = () => {
    setSelectedGames([]);
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

      {/* All Games Table */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">All Games</h2>
          <div className="flex gap-2">
            <Button onClick={selectAllGames} className="bg-neutral-800 text-white text-sm px-3 py-1">
              Select All
            </Button>
            <Button onClick={clearSelection} className="bg-neutral-800 text-white text-sm px-3 py-1">
              Clear
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white font-medium">Select</th>
                <th className="text-left p-3 text-white font-medium">Game Name</th>
                <th className="text-right p-3 text-white font-medium">Playing Now</th>
                <th className="text-right p-3 text-white font-medium">Total Visits</th>
                <th className="text-right p-3 text-white font-medium">Favorites</th>
                <th className="text-right p-3 text-white font-medium">Likes</th>
                <th className="text-right p-3 text-white font-medium">Universe ID</th>
              </tr>
            </thead>
            <tbody>
              {allGamesStats.map((game) => (
                <tr key={game.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedGames.includes(game.id)}
                      onChange={() => toggleGameSelection(game.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 text-white font-medium">{game.name}</td>
                  <td className="p-3 text-right text-white">{(game.playing || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white">{(game.visits || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white">{(game.favorites || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white">{(game.likes || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white/50">{game.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-white/50 text-sm mt-4">
          {selectedGames.length > 0
            ? `${selectedGames.length} game${selectedGames.length > 1 ? 's' : ''} selected for chart comparison`
            : 'Select games to compare on charts below'}
        </p>
      </div>

      {/* Time Range & Metric Selection */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">Metric</label>
            <div className="flex gap-2">
              {['playing', 'visits', 'favorites', 'likes'].map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-4 py-2 rounded capitalize ${
                    metric === m
                      ? 'bg-white text-black'
                      : 'bg-black text-white border border-white/20'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-white bg-neutral-900 rounded-lg">
          <div className="text-lg">Loading chart data...</div>
        </div>
      ) : (
        <div className="bg-neutral-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">
            {selectedGames.length === 0
              ? `Overall ${metric.charAt(0).toUpperCase() + metric.slice(1)} Trend`
              : `${metric.charAt(0).toUpperCase() + metric.slice(1)} Comparison`}
          </h2>
          <DetailedLineChart
            data={chartData}
            selectedGames={selectedGames}
            gamesList={gamesList}
            metric={metric}
          />
        </div>
      )}
    </div>
  );
};

export default DetailedGames;
