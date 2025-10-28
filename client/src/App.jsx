import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { AdminProvider } from "./context/AdminContext.jsx";
import { DashboardProvider } from "./context/DashboardContext.jsx";
import HomePage from "./components/HomePage.jsx";
import GameDetail from "./components/GameDetail.jsx";

// Import admin components directly (no lazy loading for instant navigation)
import AdminLogin from "./components/admin/Login.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import AdminDashboard from "./components/admin/Dashboard.jsx";
import DetailedGames from "./components/admin/DetailedGames.jsx";
import DetailedGroups from "./components/admin/DetailedGroups.jsx";
import CMS from "./components/admin/CMS.jsx";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes - wrapped with GameProvider */}
        <Route path="/" element={
          <GameProvider>
            <HomePage />
          </GameProvider>
        } />
        <Route path="/about" element={
          <GameProvider>
            <GameDetail />
          </GameProvider>
        } />

        {/* Admin Routes - wrapped with GameProvider, AdminProvider and DashboardProvider */}
        <Route path="/admin/*" element={
          <GameProvider>
            <AdminProvider>
              <DashboardProvider>
                <Routes>
                  <Route path="login" element={<AdminLogin />} />
                  <Route path="/" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="games/detailed" element={<DetailedGames />} />
                    <Route path="groups/detailed" element={<DetailedGroups />} />
                    <Route path="cms" element={<CMS />} />
                  </Route>
                </Routes>
              </DashboardProvider>
            </AdminProvider>
          </GameProvider>
        } />
      </Routes>
    </Router>
  );
};

export default App;
