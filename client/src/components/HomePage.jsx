import React, { Suspense, lazy } from "react";
import { useGameData } from "../context/GameContext.jsx";
import Navbar from "./Navbar";
import Hero from "./Hero";
import GameGrid from "./GameGrid";
import FeaturedGame from "./FeaturedGames.jsx";
import { HeroSkeleton, ShowcaseSkeleton, AboutSkeleton, GameGridSkeleton } from "./SkeletonLoader";
import Footer from "./Footer.jsx";

// Lazy load below-the-fold components
const About = lazy(() => import("./About"));
const Showcase = lazy(() => import("./Showcase"));

const HomePage = () => {
  const { gameData, groupData, totalData, gameImages, loading } = useGameData();

  // Show skeleton while initial data is loading
  if (loading) {
    return <HeroSkeleton />;
  }

  return (
    <div className="bg-black w-full">
      <Navbar />
      <Hero data={gameData} gameImages={gameImages} />

      <FeaturedGame />

     
     

      <Suspense fallback={<ShowcaseSkeleton />}>
        <Showcase />
      </Suspense>

      

      <Suspense fallback={<AboutSkeleton />}>
        <About groupData={groupData} totalData={totalData} />
      </Suspense>

      <Footer />

    </div>
  );
};

export default HomePage;
