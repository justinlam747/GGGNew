import GameGrid from "./GameGrid";
import { useGameData } from "../context/GameContext.jsx";

const FeaturedGames = () => {
  const { gameData, gameImages } = useGameData();

  // Sort games by most playing right now and get top 3
  const topGames = gameData
    ? [...gameData].sort((a, b) => (b.playing || 0) - (a.playing || 0)).slice(0, 3)
    : [];

  return (
    <div className="relative">
      {/* Vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)'
        }}
      />

      <GameGrid className="bg-none" data={{ games: topGames, images: gameImages }} />
    </div>
  );
};

export default FeaturedGames;
