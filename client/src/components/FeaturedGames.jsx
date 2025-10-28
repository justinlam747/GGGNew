import React from "react";
import GameGrid from "./GameGrid";
import { useGameData } from "../context/GameContext.jsx";

const FeaturedGames = () => {
  const { gameData, groupData, totalData, gameImages, loading } = useGameData();

  // Sort games by most playing right now and get top 3
  const topGames = gameData
    ? [...gameData].sort((a, b) => (b.playing || 0) - (a.playing || 0)).slice(0, 3)
    : [];

  return (
   <div>
    
      <GameGrid className="bg-none" data={{ games: topGames, images: gameImages }} />
    </div>
  );
};

export default FeaturedGames;
