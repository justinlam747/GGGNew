import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';
import DetailedGroupChart from './charts/DetailedGroupChart';
import { Button } from '../ui/button';

// Helper to convert time range to dates
const getDateRange = (range) => {
  const end = new Date().toISOString();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
};

const DetailedGroups = () => {
  const [selectedGroup, setSelectedGroup] = useState('all'); // Single selection (group ID or 'all')
  const [timeRange, setTimeRange] = useState('7d');
  const [groupsList, setGroupsList] = useState([]);
  const [allGroupsStats, setAllGroupsStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

  // Fetch groups list from CMS
  useEffect(() => {
    fetchGroupsList();
  }, []);

  const fetchGroupsList = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/cms/groups`, { withCredentials: true });
      if (response.data.success) {
        const groups = response.data.data.map(group => ({
          id: group.group_id,
          name: group.name,
          is_active: group.is_active,
          member_count: group.member_count || 0
        }));
        setGroupsList(groups);
        setAllGroupsStats(groups);
      }
    } catch (error) {
      console.error('Error fetching groups list from CMS:', error);
    }
  };

  // Fetch all groups current stats
  useEffect(() => {
    if (groupsList.length > 0) {
      fetchAllGroupsStats();
    }
  }, [groupsList]);

  const fetchAllGroupsStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/analytics/overview`, { withCredentials: true });
      // Use groups data from overview endpoint
      if (response.data.groups && response.data.groups.length > 0) {
        setAllGroupsStats(response.data.groups);
      } else {
        // Fallback to groupsList from CMS if overview doesn't have groups yet
        setAllGroupsStats(groupsList);
      }
    } catch (error) {
      console.error('Error fetching all groups stats:', error);
      // Fallback to groupsList on error
      setAllGroupsStats(groupsList);
    }
  };

  // Fetch chart data when selection or time range changes
  useEffect(() => {
    if (groupsList.length > 0) {
      fetchChartData();
    }
  }, [selectedGroup, timeRange, groupsList]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      if (selectedGroup === 'all') {
        // Overall view - fetch all groups aggregate data
        const { start, end } = getDateRange(timeRange);
        const promises = groupsList.map(group =>
          axios.get(
            `${API_BASE}/admin/analytics/groups?groupId=${group.id}&startDate=${start}&endDate=${end}`,
            { withCredentials: true }
          ).catch(err => ({ data: [] })) // Handle errors gracefully
        );
        const results = await Promise.all(promises);
        const allData = results.map(res => res.data).flat();
        setChartData(allData);
      } else {
        // Fetch data for selected group
        const { start, end } = getDateRange(timeRange);
        const response = await axios.get(
          `${API_BASE}/admin/analytics/groups?groupId=${selectedGroup}&startDate=${start}&endDate=${end}`,
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
    fetchGroupsList();
    fetchAllGroupsStats();
    fetchChartData();
  };

  // Calculate overall KPIs
  const overallKPIs = {
    totalMembers: allGroupsStats.reduce((sum, g) => sum + (g.member_count || 0), 0),
    avgMembers: allGroupsStats.length > 0 ? Math.round(allGroupsStats.reduce((sum, g) => sum + (g.member_count || 0), 0) / allGroupsStats.length) : 0,
    totalGroups: allGroupsStats.length,
    largestGroup: Math.max(...allGroupsStats.map(g => g.member_count || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Groups Analytics</h1>
          <p className="text-white/50 mt-1">Comprehensive analytics and member tracking for all groups</p>
        </div>
        <Button onClick={handleRefresh} className="bg-white text-black">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-white bg-neutral-900 rounded-lg">
          <div className="text-lg">Loading chart data...</div>
        </div>
      ) : (
        <div className="bg-neutral-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">
            {selectedGroup === 'all'
              ? 'Overall Members Trend (All Groups)'
              : `${groupsList.find(g => g.id === parseInt(selectedGroup))?.name || 'Group'} - Member Growth`}
          </h2>
          <DetailedGroupChart
            data={chartData}
            selectedGroup={selectedGroup === 'all' ? null : selectedGroup}
          />
        </div>
      )}

      {/* Overall KPIs */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-white mb-4">Overall KPIs</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Members</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalMembers.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Avg Members</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.avgMembers.toLocaleString()}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Total Groups</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.totalGroups}</div>
          </div>
          <div className="bg-black p-4 rounded-lg">
            <div className="text-sm text-white/50 mb-1">Largest Group</div>
            <div className="text-2xl font-bold text-white">{overallKPIs.largestGroup.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Group Selection & Controls */}
      <div className="bg-neutral-900 p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group Selector */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">Select Group</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-black text-white border border-white/20 rounded px-4 py-2"
            >
              <option value="all">All Groups (Overall)</option>
              {groupsList.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
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
        </div>

        <div className="mt-4">
          <label className="block text-white text-sm font-medium mb-2">
            Graph Metric: Group Members vs Time
          </label>
          <p className="text-white/50 text-sm">Showing member growth over time for selected group</p>
        </div>
      </div>

      {/* Chart */}
      
    </div>
  );
};

export default DetailedGroups;
