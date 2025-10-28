import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Hero = ({ data, gameImages }) => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      id="hero"
      className="relative  w-full  bg-[rgb(2,2,2)] text-white"
    >
      {/* soft center spotlight */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[80vmin] rounded-full opacity-[0.12] blur-3xl bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),rgba(255,255,255,0.0))]" />
      </div>

      {/* subtle film grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundSize: "160px 160px",
        }}
      />
      {/* top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-0" />

      {/* content */}
      <div
        className={[
          "relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-6 text-center transition-all duration-700",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        ].join(" ")}
      >
        {/* headline */}
        <h1 className="font-extrabold tracking-tight leading-[0.9] text-[15vw] sm:text-[12vw] md:text-[9vw] lg:text-[7.5vw]">
          <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(255,255,255,0.15)]">
            GLAZING
          </span>
          <br />
          <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(255,255,255,0.15)]">
            GORILLA
          </span>
          <br />
          <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(255,255,255,0.15)]">
            GAMES
          </span>
        </h1>

        {/* subcopy */}

        {/* glass pill CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {/* CTA */}
          <button
            onClick={() =>
              navigate("/about", { state: { gameData: data, gameImages } })
            }
            className="rounded-full border border-white/10 bg-white/10 px-7 py-3 text-base md:text-lg font-semibold backdrop-blur-md
               shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_25px_rgba(0,0,0,0.45)]
               hover:bg-white/15 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_35px_rgba(0,0,0,0.55)]
               active:scale-[0.98] transition-all duration-300"
          >
            Explore Our Games
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
