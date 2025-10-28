import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Star, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { useGameData } from '../../../context/GameContext';

const GamesManager = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get refetch function from GameContext
  const { refetch } = useGameData();

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/cms/games`, {
        withCredentials: true
      });
      setGames(response.data.data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (gameData) => {
    try {
      await axios.post(`${API_BASE}/api/cms/games`, gameData, {
        withCredentials: true
      });
      fetchGames();
      setShowAddModal(false);
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after adding game');
    } catch (error) {
      console.error('Error adding game:', error);
      alert(error.response?.data?.error || 'Failed to add game');
    }
  };

  const handleUpdateGame = async (id, updates) => {
    try {
      await axios.put(`${API_BASE}/api/cms/games/${id}`, updates, {
        withCredentials: true
      });
      fetchGames();
      setEditingGame(null);
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after updating game');
    } catch (error) {
      console.error('Error updating game:', error);
      alert('Failed to update game');
    }
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      await axios.delete(`${API_BASE}/api/cms/games/${id}`, {
        withCredentials: true
      });
      fetchGames();
      // Auto-refresh landing page data
      refetch();
      console.log('✅ Landing page data refreshed after deleting game');
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game');
    }
  };

  const toggleActive = (game) => {
    handleUpdateGame(game.id, { is_active: !game.is_active });
  };

  const toggleFeatured = (game) => {
    handleUpdateGame(game.id, { is_featured: !game.is_featured });
  };

  const handleRefreshData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Triggering data refresh from CMS...');
      await axios.post(`${API_BASE}/proxy/refresh`, {}, { withCredentials: true });
      // Also refetch landing page data
      refetch();
      alert('✅ Data refreshed! Landing page will show updated games.');
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('❌ Failed to refresh data: ' + (error.response?.data?.message || error.message));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading games...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Games</h2>
          <p className="text-white/50 text-sm">
            {games.length} total games • Toggle active/inactive to show/hide on landing page
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="bg-neutral-800 text-white hover:bg-neutral-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Landing Page'}
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Game
          </Button>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-neutral-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white font-medium">Game</th>
              <th className="text-left p-4 text-white font-medium">Universe ID</th>
              <th className="text-center p-4 text-white font-medium">Order</th>
              <th className="text-center p-4 text-white font-medium">Status</th>
              <th className="text-center p-4 text-white font-medium">Featured</th>
              <th className="text-right p-4 text-white font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-8 text-white/50">
                  No games found. Add your first game to get started.
                </td>
              </tr>
            ) : (
              games.map(game => (
                <tr key={game.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-4">
                    <div>
                      <div className="text-white font-medium">{game.name}</div>
                      {game.description && (
                        <div className="text-white/50 text-sm">{game.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-white/75">{game.universe_id}</td>
                  <td className="p-4 text-center text-white/75">{game.display_order}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleActive(game)}
                      className={`px-3 py-1 rounded text-sm ${
                        game.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {game.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleFeatured(game)}
                      className="text-white/50 hover:text-yellow-500 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${game.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`}
                      />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingGame(game)}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGame(game.id)}
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
      {(showAddModal || editingGame) && (
        <GameModal
          game={editingGame}
          onClose={() => {
            setShowAddModal(false);
            setEditingGame(null);
          }}
          onSave={editingGame ? handleUpdateGame : handleAddGame}
        />
      )}
    </div>
  );
};

// Game Modal Component
const GameModal = ({ game, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    universe_id: game?.universe_id || '',
    name: game?.name || '',
    description: game?.description || '',
    display_order: game?.display_order || 0,
    is_featured: game?.is_featured || false,
    thumbnail_url: game?.thumbnail_url || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (game) {
      onSave(game.id, formData);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">
          {game ? 'Edit Game' : 'Add Game'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Universe ID *
            </label>
            <input
              type="number"
              value={formData.universe_id}
              onChange={(e) => setFormData({ ...formData, universe_id: e.target.value })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
              required
              disabled={!!game}
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Game Name *
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Thumbnail URL
            </label>
            <input
              type="text"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-white text-sm">Featured on homepage</label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-white text-black flex-1">
              {game ? 'Update' : 'Add'} Game
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

export default GamesManager;
