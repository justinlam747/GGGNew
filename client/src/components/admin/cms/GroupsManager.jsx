import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../ui/button';
import { useGameData } from '../../../context/GameContext';
import { getApiBaseUrl } from '../../../utils/api';

const GroupsManager = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // Get refetch function from GameContext
  const { refetch } = useGameData();

  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/cms/groups`, {
        withCredentials: true
      });
      setGroups(response.data.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (groupData) => {
    try {
      await axios.post(`${API_BASE}/api/cms/groups`, groupData, {
        withCredentials: true
      });
      fetchGroups();
      setShowAddModal(false);
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after adding group');
    } catch (error) {
      console.error('Error adding group:', error);
      alert(error.response?.data?.error || 'Failed to add group');
    }
  };

  const handleUpdateGroup = async (id, updates) => {
    try {
      await axios.put(`${API_BASE}/api/cms/groups/${id}`, updates, {
        withCredentials: true
      });
      fetchGroups();
      setEditingGroup(null);
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after updating group');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group');
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await axios.delete(`${API_BASE}/api/cms/groups/${id}`, {
        withCredentials: true
      });
      fetchGroups();
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after deleting group');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const toggleActive = (group) => {
    handleUpdateGroup(group.id, { is_active: !group.is_active });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading groups...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Groups</h2>
          <p className="text-white/50 text-sm">
            {groups.length} total groups
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Groups Table */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white font-medium">Group</th>
              <th className="text-left p-4 text-white font-medium">Group ID</th>
              <th className="text-center p-4 text-white font-medium">Status</th>
              <th className="text-right p-4 text-white font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-8 text-white/50">
                  No groups found. Add your first group to get started.
                </td>
              </tr>
            ) : (
              groups.map(group => (
                <tr key={group.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-4">
                    <div>
                      <div className="text-white font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-white/50 text-sm">{group.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-white/75">{group.group_id}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleActive(group)}
                      className={`px-3 py-1 rounded text-sm ${
                        group.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {group.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-2 text-white/50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGroup) && (
        <GroupModal
          group={editingGroup}
          onClose={() => {
            setShowAddModal(false);
            setEditingGroup(null);
          }}
          onSave={editingGroup ? handleUpdateGroup : handleAddGroup}
        />
      )}
    </div>
  );
};

// Group Modal Component
const GroupModal = ({ group, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    group_id: group?.group_id || '',
    name: group?.name || '',
    description: group?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (group) {
      onSave(group.id, formData);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-white mb-6">
          {group ? 'Edit Group' : 'Add Group'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Group ID *
            </label>
            <input
              type="number"
              value={formData.group_id}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
              required
              disabled={!!group}
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
              required
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
              rows="3"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-white text-black flex-1">
              {group ? 'Update' : 'Add'} Group
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="bg-neutral-800 text-white flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupsManager;
