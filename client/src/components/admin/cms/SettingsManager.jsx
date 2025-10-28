import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';
import { Button } from '../../ui/button';

const SettingsManager = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/cms/settings`, {
        withCredentials: true
      });
      setSettings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (settingKey, value) => {
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/api/cms/settings/${settingKey}`, {
        setting_value: value
      }, {
        withCredentials: true
      });
      fetchSettings();
      alert('Setting saved successfully!');
    } catch (error) {
      console.error('Error saving setting:', error);
      alert('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (settingKey, newValue) => {
    setSettings(settings.map(s =>
      s.setting_key === settingKey
        ? { ...s, setting_value: newValue }
        : s
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
        <p className="text-white/50 text-sm">
          Configure platform behavior and preferences
        </p>
      </div>

      {/* Settings List */}
      <div className="grid gap-4">
        {settings.map(setting => (
          <div
            key={setting.setting_key}
            className="bg-neutral-900 p-6 rounded-lg"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-medium capitalize">
                    {setting.setting_key.replace(/_/g, ' ')}
                  </h3>
                  <span className="px-2 py-1 bg-white/10 text-white/50 text-xs rounded">
                    {setting.setting_type}
                  </span>
                </div>
                {setting.description && (
                  <p className="text-white/50 text-sm mb-4">
                    {setting.description}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  {setting.setting_type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="checkbox"
                        checked={setting.setting_value === 'true'}
                        onChange={(e) => handleUpdate(setting.setting_key, e.target.checked ? 'true' : 'false')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {setting.setting_value === 'true' ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : setting.setting_type === 'number' ? (
                    <input
                      type="number"
                      value={setting.setting_value}
                      onChange={(e) => handleUpdate(setting.setting_key, e.target.value)}
                      className="bg-black text-white border border-white/20 rounded p-2 w-32"
                    />
                  ) : (
                    <input
                      type="text"
                      value={setting.setting_value}
                      onChange={(e) => handleUpdate(setting.setting_key, e.target.value)}
                      className="bg-black text-white border border-white/20 rounded p-2 flex-1"
                    />
                  )}

                  <Button
                    onClick={() => handleSave(setting.setting_key, setting.setting_value)}
                    className="bg-white text-black"
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>

                <div className="mt-2 text-white/30 text-xs">
                  Last updated: {new Date(setting.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="text-center p-12 text-white/50">
          No settings found
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
