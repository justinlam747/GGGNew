import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useDashboard } from '../../context/DashboardContext';
import PieChart from './charts/PieChart';
import { getApiBaseUrl } from '../../utils/api';

const Dashboard = () => {
  const { overview, loading, refresh, lastFetch } = useDashboard();
  const [pieMetric, setPieMetric] = useState('visits'); // visits, playing, or favorites
  const [refreshingLandingPage, setRefreshingLandingPage] = useState(false);
  const API_BASE = getApiBaseUrl();

  const handleRefresh = () => {
    refresh();
  };

  const handleRefreshLandingPage = async () => {
    setRefreshingLandingPage(true);
    try {
      const response = await fetch(`${API_BASE}/proxy/refresh`, {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Landing page refreshed:', data);
      alert('Landing page data refreshed successfully!');
      // Also refresh dashboard data to show updated stats
      refresh();
    } catch (error) {
      console.error('Error refreshing landing page:', error);
      alert('Failed to refresh landing page data');
    } finally {
      setRefreshingLandingPage(false);
    }
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    // TODO: Fetch data for selected time range
    console.log('Time range changed to:', range);
  };

  // Format last fetch time
  const getLastFetchTime = () => {
    if (!lastFetch) return 'Never';
    const seconds = Math.floor((Date.now() - lastFetch) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  // Prepare data for PieChart based on selected metric
  const pieData = overview?.topGames.map(game => ({
    name: game.name,
    value: game[pieMetric] || 0
  })) || [];

  const metricLabels = {
    playing: 'Current Players',
    visits: 'Total Visits',
    favorites: 'Favorites'
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">
            Overview of your gaming platform analytics
          </p>
          {lastFetch && (
            <p className="text-white/30 text-sm mt-1">
              Last updated: {getLastFetchTime()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshLandingPage}
            className="bg-black p-4 text-white"
            disabled={refreshingLandingPage}
          >
           
            {refreshingLandingPage ? 'Refreshing...' : 'Refresh Landing Page'}
          </Button>
          <Button onClick={handleRefresh} className="bg-white text-black">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {!overview ? (
        <div className="text-center py-12">
          <p className="text-white text-lg mb-4">No data available</p>
          <p className="text-white/50 text-sm">Click "Refresh Data" to load statistics</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 p-6 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">
                Current Players
              </div>
              <div className="text-2xl font-bold text-white">
                {overview.current.totalPlaying.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs ${overview.changes24h.playing >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {overview.changes24h.playing >= 0 ? '+' : ''}
                  {overview.changes24h.playing.toLocaleString()} from 24h ago
                </span>
              </div>
            </div>

            <div className="bg-neutral-900 p-6 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">
                Total Visits
              </div>
              <div className="text-2xl font-bold text-white">
                {overview.current.totalVisits.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs ${overview.changes24h.visits >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {overview.changes24h.visits >= 0 ? '+' : ''}
                  {overview.changes24h.visits.toLocaleString()} from 24h ago
                </span>
              </div>
            </div>

            <div className="bg-neutral-900 p-6 rounded-lg">
              <div className="text-sm font-medium text-white mb-2">
                Total Members
              </div>
              <div className="text-2xl font-bold text-white">
                {overview.current.totalMembers.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs ${overview.changes24h.members >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {overview.changes24h.members >= 0 ? '+' : ''}
                  {overview.changes24h.members.toLocaleString()} from 24h ago
                </span>
              </div>
            </div>
          </div>



          {/* Pie Chart - Game Contributions */}
          <div className="bg-neutral-900 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Game Contributions to {metricLabels[pieMetric]}</h2>
              <div className="flex gap-2">
                {['visits', 'playing', 'favorites'].map(metric => (
                  <button
                    key={metric}
                    onClick={() => setPieMetric(metric)}
                    className={`px-4 py-2 rounded text-sm ${
                      pieMetric === metric
                        ? 'bg-white text-black'
                        : 'bg-black text-white border border-white/20'
                    }`}
                  >
                    {metricLabels[metric]}
                  </button>
                ))}
              </div>
            </div>
            <PieChart data={pieData} metric={pieMetric} />
          </div>

          {/* Top Games Table */}
          <div className="bg-neutral-900 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">Top 5 Games</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-white font-medium">Game</th>
                    <th className="text-right p-2 text-white font-medium">Players</th>
                    <th className="text-right p-2 text-white font-medium">Visits</th>
                    <th className="text-right p-2 text-white font-medium">Universe ID</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topGames.map((game) => (
                    <tr key={game.id}>
                      <td className="p-2 text-white font-medium">{game.name}</td>
                      <td className="p-2 text-right">
                        <span className="text-white">
                          {game.playing.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-2 text-right text-white">
                        {game.visits.toLocaleString()}
                      </td>
                      <td className="p-2 text-right text-white/50">
                        {game.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
