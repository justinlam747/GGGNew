import React from "react";
import { useGameData } from "../context/GameContext.jsx";
import { Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import GameGrid from "./GameGrid";
import Footer from "./Footer";

const GameDetail = () => {
  const { gameData, gameImages, loading } = useGameData();

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading games...</div>
      </div>
    );
  }

  if (!gameData || !gameImages) {
    return <Navigate to="/" />;
  }

  return (
    <div className="bg-black min-h-screen">
      <Navbar />
      <GameGrid data={{ games: gameData, images: gameImages }} />
      <Footer />
    </div>
  );
};

export default GameDetail;
