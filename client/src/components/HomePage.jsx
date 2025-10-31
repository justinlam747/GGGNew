import React from "react";
import { useGameData } from "../context/GameContext.jsx";
import Navbar from "./Navbar";
import Hero from "./Hero";
import GameGrid from "./GameGrid";
import FeaturedGame from "./FeaturedGames.jsx";
import About from "./About";
import Showcase from "./Showcase";
import { HeroSkeleton } from "./SkeletonLoader";
import Footer from "./Footer.jsx";

const HomePage = () => {
  const { gameData, groupData, totalData, gameImages, loading } = useGameData();

  // Show skeleton while initial data is loading
  if (loading) {
    return <HeroSkeleton />;
  }

  return (
    <div className="bg-black w-full">
      <Navbar />

      {/* Staggered fade-in sections */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <Hero data={gameData} gameImages={gameImages} />
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <FeaturedGame />
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <Showcase />
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '450ms' }}>
        <About groupData={groupData} totalData={totalData} />
      </div>

      <Footer />
    </div>
  );
};

export default HomePage;
