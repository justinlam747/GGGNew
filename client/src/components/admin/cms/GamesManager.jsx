import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useGameData } from '../../../context/GameContext';
import { getApiBaseUrl } from '../../../utils/api';

const GamesManager = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);

  // Get refetch function from GameContext
  const { refetch } = useGameData();

  const API_BASE = getApiBaseUrl();

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
      // Trigger server-side data refresh from Roblox
      await axios.post(`${API_BASE}/proxy/refresh`, {}, { withCredentials: true });
      // Also refetch landing page data
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
      // Trigger server-side data refresh from Roblox
      await axios.post(`${API_BASE}/proxy/refresh`, {}, { withCredentials: true });
      // Also refetch landing page data
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
      // Trigger server-side data refresh from Roblox
      await axios.post(`${API_BASE}/proxy/refresh`, {}, { withCredentials: true });
      // Also refetch landing page data
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
            {games.length} total games • Changes auto-sync to landing page
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-white text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Game
        </Button>
      </div>

      {/* Games Table */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-white font-medium">Game</th>
              <th className="text-left p-4 text-white font-medium">Universe ID</th>
              <th className="text-center p-4 text-white font-medium">Status</th>
              <th className="text-right p-4 text-white font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-8 text-white/50">
                  No games found. Add your first game to get started.
                </td>
              </tr>
            ) : (
              games.map(game => (
                <tr key={game.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-4">
                    <div className="text-white font-medium">{game.name}</div>
                  </td>
                  <td className="p-4 text-white/75">{game.universe_id}</td>
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
    thumbnail_url: game?.thumbnail_url || ''
  });
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const API_BASE = getApiBaseUrl();

  // Auto-fetch game name when universe ID is entered
  const handleUniverseIdChange = async (universeId) => {
    setFormData({ ...formData, universe_id: universeId });
    setFetchError('');

    // Auto-fetch game data for any universe ID entry
    if (universeId && universeId.length > 0) {
      try {
        setFetching(true);
        // Use proxy endpoint to avoid CORS issues
        const response = await axios.get(`${API_BASE}/api/cms/proxy/game-info/${universeId}`, {
          withCredentials: true
        });
        const gameData = response.data.data;

        if (gameData) {
          setFormData(prev => ({
            ...prev,
            name: gameData.name || ''
          }));
        } else {
          setFetchError('Game not found. Please check the Universe ID.');
        }
      } catch (error) {
        console.error('Error fetching game data:', error);
        setFetchError('Failed to fetch game data.');
      } finally {
        setFetching(false);
      }
    }
  };

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
      <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              onChange={(e) => handleUniverseIdChange(e.target.value)}
              className="w-full bg-black text-white border border-white/20 rounded p-2"
              required
              disabled={fetching}
            />
            {fetching && (
              <p className="text-blue-400 text-sm mt-1">Fetching game data...</p>
            )}
            {fetchError && (
              <p className="text-red-400 text-sm mt-1">{fetchError}</p>
            )}
          </div>

          {formData.name && (
            <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
              <p className="text-green-400 text-sm font-medium">{game ? 'Current Game' : 'Game Found!'}</p>
              <p className="text-white mt-1">{formData.name}</p>
              {game && (
                <p className="text-white/50 text-xs mt-1">Change the Universe ID above to update this game</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="bg-white text-black flex-1" disabled={fetching || (!game && !formData.name)}>
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
