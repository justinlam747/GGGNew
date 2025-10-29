import { memo } from "react";
import { useGameData } from "../context/GameContext.jsx";

const FeaturedGames = () => {
  const { gameData, gameImages, loading } = useGameData();

  const getImageForGame = (universeId) => {
    const imageEntry = gameImages?.find((img) => img.id === universeId);
    return imageEntry?.media?.[0]?.imageUrl || "";
  };

  // Get all games
  const allGames = gameData || [];

  // Duplicate the games array to create seamless infinite scroll
  const duplicatedGames = [...allGames, ...allGames, ...allGames];

  if (loading || !gameData) {
    return (
      <section className="relative py-16 text-white">
        <div className="mx-auto w-11/12 sm:w-5/6 lg:w-4/5 text-center">
          Loading games...
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-12 text-white overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[80vmin] rounded-full opacity-[0.12] blur-3xl bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),rgba(255,255,255,0))]" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundSize: "160px 160px",
        }}
      />

      {/* Carousel Container - Only show 3 cards at a time */}
      <div className="relative mx-auto" style={{ maxWidth: '1080px' }}>
        {/* Gradient fade on left */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />

        {/* Gradient fade on right */}
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        {/* Scrolling wrapper */}
        <div className="overflow-hidden w-full">
          <div className="carousel-track gap-6 px-6">
            {duplicatedGames.map((game, index) => (
              <GameCard
                key={`${game.universeId}-${index}`}
                image={getImageForGame(game.universeId)}
                title={game.name}
                visits={game.visits?.toLocaleString() ?? "N/A"}
                players={game.playing?.toLocaleString() ?? "N/A"}
                rootPlaceId={game.rootPlaceId}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const GameCard = memo(({ image, title, visits, players, rootPlaceId }) => {
  const gameUrl = rootPlaceId
    ? `https://www.roblox.com/games/${rootPlaceId}/${title.replace(/\s+/g, '-')}`
    : null;

  return (
    <a
      href={gameUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-3xl block flex-shrink-0 w-80 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none before:bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.07),transparent_65%)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full rounded-t-3xl w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-5">
        <h3 className="text-lg font-semibold mb-1">
          <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {title}
          </span>
        </h3>

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-200">
          <span className="relative inline-flex items-center">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          </span>
          <span className="text-gray-300">
            Playing: <span className="text-white/90">{players}</span>
          </span>
        </div>

        <div className="mt-1 text-sm text-gray-300">
          Visits: <span className="text-white/90">{visits}</span>
        </div>
      </div>
    </a>
  );
});

export default FeaturedGames;
