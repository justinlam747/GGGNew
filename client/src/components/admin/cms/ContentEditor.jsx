import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { getApiBaseUrl } from '../../../utils/api';

const ContentEditor = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const API_BASE = getApiBaseUrl();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/cms/content`, {
        withCredentials: true
      });
      const data = response.data.data || [];
      setContent(data);
      if (data.length > 0 && !selectedSection) {
        setSelectedSection(data[0].section_key);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (sectionKey, updates) => {
    try {
      setSaving(true);
      await axios.put(`${API_BASE}/api/cms/content/${sectionKey}`, updates, {
        withCredentials: true
      });
      fetchContent();
      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white">
        Loading content...
      </div>
    );
  }

  const currentContent = content.find(c => c.section_key === selectedSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Website Content</h2>
        <p className="text-white/50 text-sm">
          Edit content sections for your website
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar - Section List */}
        <div className="col-span-1">
          <div className="bg-neutral-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Sections</h3>
            <div className="space-y-1">
              {content.map(section => (
                <button
                  key={section.section_key}
                  onClick={() => setSelectedSection(section.section_key)}
                  className={`
                    w-full text-left px-3 py-2 rounded transition-colors
                    ${selectedSection === section.section_key
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/75'
                    }
                  `}
                >
                  {section.title || section.section_key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Editor */}
        <div className="col-span-3">
          {currentContent && (
            <ContentSectionEditor
              section={currentContent}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Content Section Editor Component
const ContentSectionEditor = ({ section, onSave, saving }) => {
  const [formData, setFormData] = useState({
    title: section.title || '',
    content: section.content || '{}',
    metadata: section.metadata || '{}',
    is_active: section.is_active === 1
  });

  const [contentObj, setContentObj] = useState({});
  const [metadataObj, setMetadataObj] = useState({});

  useEffect(() => {
    try {
      setContentObj(typeof formData.content === 'string' ? JSON.parse(formData.content) : formData.content);
    } catch (e) {
      setContentObj({});
    }

    try {
      setMetadataObj(typeof formData.metadata === 'string' ? JSON.parse(formData.metadata) : formData.metadata);
    } catch (e) {
      setMetadataObj({});
    }
  }, [formData.content, formData.metadata]);

  const handleContentChange = (key, value) => {
    const updated = { ...contentObj, [key]: value };
    setContentObj(updated);
    setFormData({ ...formData, content: JSON.stringify(updated) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(section.section_key, formData);
  };

  return (
    <div className="bg-neutral-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{section.title || section.section_key}</h3>
          <p className="text-white/50 text-sm">Section: {section.section_key}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            Active
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-black text-white border border-white/20 rounded p-2"
          />
        </div>

        <div>
          <label className="block text-white text-sm font-medium mb-3">
            Content Fields
          </label>
          <div className="space-y-3 bg-black/30 p-4 rounded">
            {Object.keys(contentObj).length === 0 ? (
              <p className="text-white/50 text-sm">No content fields defined</p>
            ) : (
              Object.entries(contentObj).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-white/75 text-sm mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  {typeof value === 'string' && value.length < 100 ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleContentChange(key, e.target.value)}
                      className="w-full bg-black text-white border border-white/20 rounded p-2"
                    />
                  ) : (
                    <textarea
                      value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      onChange={(e) => handleContentChange(key, e.target.value)}
                      className="w-full bg-black text-white border border-white/20 rounded p-2"
                      rows="4"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Raw JSON Content (Advanced)
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full bg-black text-white border border-white/20 rounded p-2 font-mono text-sm"
            rows="6"
          />
        </div>

        <div className="pt-4 border-t border-white/10">
          <Button
            type="submit"
            className="bg-white text-black"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContentEditor;
