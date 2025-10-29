import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import {
  LayoutDashboard,
  Gamepad2,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import ggg from "../../assets/ggg.svg";

const AdminLayout = () => {
  const { user, loading, logout } = useAdmin();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainRef = React.useRef(null);

  // Trigger smooth fade-in animation and scroll to top on route change
  useEffect(() => {
    setIsTransitioning(true);

    // Smooth scroll to top
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    const timer = setTimeout(() => setIsTransitioning(false), 20);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/games/detailed', icon: TrendingUp, label: 'Detailed Games' },
    { path: '/admin/groups/detailed', icon: Users, label: 'Detailed Groups' },
    { path: '/admin/cms', icon: Settings, label: 'CMS' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-black
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          willChange: sidebarOpen ? 'transform' : 'auto',
          transform: 'translateZ(0)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6">
            <img src={ggg} alt="GGG Logo" className="h-14 mt-5" />
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? 'bg-neutral-950 border border-neutral-900 text-white font-medium'
                        : 'text-white hover:bg-neutral-950/50'
                    }
                  `}
                  style={{
                    willChange: 'background-color, border-color',
                    transform: 'translateZ(0)'
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="h-px bg-white/10 mx-4" />

          {/* User Info & Logout */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarFallback className="bg-white text-black">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.username}
                </p>
                <p className="text-xs text-white/50">Administrator</p>
              </div>
            </div>
            <Button
              
              className="w-full justify-start bg-black text-white"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-black flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-white/50">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-6 bg-black"
          style={{
            transform: 'translateZ(0)',
            contain: 'layout style',
            scrollBehavior: 'smooth'
          }}
        >
          <div
            className={`transition-all duration-300 ease-out ${
              isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
            style={{
              willChange: isTransitioning ? 'opacity, transform' : 'auto',
              transform: 'translateZ(0)'
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
