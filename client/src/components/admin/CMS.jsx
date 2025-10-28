import React, { useState } from 'react';
import { Settings, Gamepad2, Users, FileText } from 'lucide-react';
import GamesManager from './cms/GamesManager';
import GroupsManager from './cms/GroupsManager';
import ContentEditor from './cms/ContentEditor';
import SettingsManager from './cms/SettingsManager';

const CMS = () => {
  const [activeTab, setActiveTab] = useState('games');

  const tabs = [
    { id: 'games', label: 'Games', icon: Gamepad2, component: GamesManager },
    { id: 'groups', label: 'Groups', icon: Users, component: GroupsManager },
    { id: 'content', label: 'Content', icon: FileText, component: ContentEditor },
    { id: 'settings', label: 'Settings', icon: Settings, component: SettingsManager }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Content Management</h1>
        <p className="text-white/50 mt-1">
          Manage games, groups, and website content
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/50 hover:text-white/75'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default CMS;
