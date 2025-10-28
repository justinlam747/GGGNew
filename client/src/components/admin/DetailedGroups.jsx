import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown } from 'lucide-react';
import DetailedGroupChart from './charts/DetailedGroupChart';

// Helper to convert time range to dates
const getDateRange = (range) => {
  const end = new Date().toISOString();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
};

const DetailedGroups = () => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [groupsList, setGroupsList] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

  // Fetch groups list from CMS
  useEffect(() => {
    const fetchGroupsList = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/cms/groups`, { withCredentials: true });
        if (response.data.success) {
          const groups = response.data.data.map(group => ({
            id: group.group_id,
            name: group.name,
            is_active: group.is_active
          }));
          setGroupsList(groups);
        }
      } catch (error) {
        console.error('Error fetching groups list from CMS:', error);
      }
    };
    fetchGroupsList();
  }, [API_BASE]);

  // Fetch data when selection changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (selectedGroup) {
          // Fetch specific group data using analytics endpoint
          const { start, end } = getDateRange(timeRange);
          const statsRes = await axios.get(
            `${API_BASE}/admin/analytics/groups?groupId=${selectedGroup}&startDate=${start}&endDate=${end}`,
            { withCredentials: true }
          );

          // Transform data for charts
          const stats = statsRes.data;
          setGroupStats({
            memberCount: stats[stats.length - 1]?.memberCount || 0,
            name: stats[0]?.name || ''
          });
          setChartData(stats);

          // Calculate comparison with previous period
          if (stats.length >= 2) {
            const latest = stats[stats.length - 1];
            const previous = stats[0];
            setComparison({
              memberChange: latest.memberCount - previous.memberCount
            });
          }
        } else {
          // Fetch overall stats from analytics overview
          const overviewRes = await axios.get(`${API_BASE}/admin/analytics/overview`, { withCredentials: true });
          setOverallStats({
            total_members: overviewRes.data.current.totalMembers
          });
          setChartData([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedGroup, timeRange]);

  const handleGroupChange = (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId === 'all' ? null : parseInt(groupId));
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const renderOverallStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Total Members</div>
        <div className="text-2xl font-bold text-white">
          {overallStats?.total_members?.toLocaleString() || 0}
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Average Group Size</div>
        <div className="text-2xl font-bold text-white">
          {Math.round(overallStats?.avg_group_size || 0).toLocaleString()}
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Total Groups</div>
        <div className="text-2xl font-bold text-white">
          {overallStats?.total_groups || 0}
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Largest Group</div>
        <div className="text-2xl font-bold text-white">
          {overallStats?.largest_group?.toLocaleString() || 0}
        </div>
        <div className="text-xs text-white/50 mt-1">members</div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Fastest Growing</div>
        <div className="text-2xl font-bold text-white">
          {overallStats?.fastest_growing || 'N/A'}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-500">
            +{overallStats?.fastest_growing_count?.toLocaleString() || 0} members
          </span>
        </div>
      </div>

      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Total Member Growth</div>
        <div className="text-2xl font-bold text-white">
          {overallStats?.fastest_growing_count?.toLocaleString() || 0}
        </div>
        <div className="text-xs text-white/50 mt-1">last 24 hours</div>
      </div>
    </div>
  );

  const renderGroupStats = () => {
    const latestStats = groupStats && groupStats.length > 0 ? groupStats[0] : null;
    const oldestStats = groupStats && groupStats.length > 0 ? groupStats[groupStats.length - 1] : null;
    const totalGrowth = latestStats && oldestStats ? latestStats.members - oldestStats.members : 0;
    const avgDailyGrowth = groupStats && groupStats.length > 1
      ? Math.round(totalGrowth / (groupStats.length - 1))
      : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Current Members</div>
          <div className="text-2xl font-bold text-white">
            {latestStats?.members?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Member Growth (24h)</div>
          <div className="text-2xl font-bold text-white">
            {latestStats?.members?.toLocaleString() || 0}
          </div>
          {comparison?.difference?.members_1d !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {comparison.difference.members_1d >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${comparison.difference.members_1d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {comparison.difference.members_1d >= 0 ? '+' : ''}
                {comparison.difference.members_1d.toLocaleString()} from yesterday
              </span>
            </div>
          )}
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Member Growth (7d)</div>
          <div className="text-2xl font-bold text-white">
            {latestStats?.members?.toLocaleString() || 0}
          </div>
          {comparison?.difference?.members_7d !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {comparison.difference.members_7d >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${comparison.difference.members_7d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {comparison.difference.members_7d >= 0 ? '+' : ''}
                {comparison.difference.members_7d.toLocaleString()} from 7 days ago
              </span>
            </div>
          )}
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Group Name</div>
          <div className="text-2xl font-bold text-white">
            {latestStats?.entity_name || 'N/A'}
          </div>
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Total Growth</div>
          <div className="text-2xl font-bold text-white">
            {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toLocaleString()}
          </div>
          <div className="text-xs text-white/50 mt-1">in selected period</div>
        </div>

        <div className="bg-neutral-900 p-6 rounded-lg">
          <div className="text-sm font-medium text-white mb-2">Average Daily Growth</div>
          <div className="text-2xl font-bold text-white">
            {avgDailyGrowth >= 0 ? '+' : ''}{avgDailyGrowth.toLocaleString()}
          </div>
          <div className="text-xs text-white/50 mt-1">members per day</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Detailed Groups Analytics</h1>
          <p className="text-white/50 mt-1">In-depth statistics and trends for your groups</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-white text-sm font-medium mb-2">Select Group</label>
          <select
            value={selectedGroup || 'all'}
            onChange={handleGroupChange}
            className="w-full bg-black text-white border border-white p-2"
          >
            <option value="all">All Groups (Overall)</option>
            {groupsList.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-white text-sm font-medium mb-2">Time Range</label>
          <div className="flex gap-2">
            {['7d', '1m', '1y', 'all'].map(range => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-4 py-2 ${
                  timeRange === range
                    ? 'bg-white text-black'
                    : 'bg-black text-white border border-white'
                }`}
              >
                {range === '7d' && '7 Days'}
                {range === '1m' && '1 Month'}
                {range === '1y' && '1 Year'}
                {range === 'all' && 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-white">
          <div className="text-lg">Loading statistics...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedGroup ? renderGroupStats() : renderOverallStats()}

          {/* Line Chart */}
          {selectedGroup && chartData.length > 0 && (
            <div className="bg-neutral-900 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Member Growth Over Time</h2>
              <DetailedGroupChart data={chartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailedGroups;
