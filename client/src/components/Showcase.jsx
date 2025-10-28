import React, { useState, useRef, useEffect } from "react";
import { FaTiktok } from "react-icons/fa";
import { BiLogoInstagramAlt } from "react-icons/bi";
import { FaYoutube } from "react-icons/fa";

// direct file import (Vite/CRA will hash & serve this)
import Trailer from "../assets/vid3.mp4";

const VIDEO_DATA = {
  src: Trailer,
  href: "https://www.tiktok.com/@glazinggorillagames",
  views: "24M",
};

export default function TikTokCarousel() {
  const videoRef = useRef(null);
  const sectionRef = useRef(null);

  // Pause video when section is out of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          videoRef.current?.pause();
        } else {
          videoRef.current?.play().catch(e => console.log('Video play failed:', e));
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="tiktok-carousel"
      className="
        relative isolate w-full
        bg-[rgb(2,2,2)] text-white

        pb-16

      "
    >
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-end">
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

      <div className="relative z-10 mx-auto w-11/12 sm:w-5/6 lg:w-4/5 grid gap-10 lg:grid-cols-2">
        {/* LEFT: Single video display */}
        <div className="relative">
          <div
            className="
              relative mx-auto w-full
              min-h-[70svh] sm:min-h-[72svh]
              max-h-[820px]
              aspect-[9/16] sm:aspect-[9/16]
            "
          >
            <a
              href={VIDEO_DATA.href}
              target="_blank"
              rel="noopener noreferrer"
              className="
                block relative w-full h-full rounded-3xl aspect-[9/16]
                shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]
                bg-[radial-gradient(120%_120%_at_50%_0%,#0c0c0c_0%,#0a0a0a_45%,#070707_100%)]
                transition-transform duration-300 hover:scale-[1.02]
                overflow-hidden
              "
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover rounded-3xl p-[1px]"
                src={VIDEO_DATA.src}
                loop
                muted
                playsInline
                preload="metadata"
              />

              {/* Views label */}
              <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs sm:text-sm px-2 py-1 rounded-md">
                {VIDEO_DATA.views} views
              </div>
            </a>
          </div>
        </div>

        {/* RIGHT: Stat + links */}
        {/* RIGHT: 70+ Million panel — match About Bento */}
        <aside
          className={[
            "relative rounded-3xl p-6 ",
            "bg-[radial-gradient(120%_120%_at_50%_0%,#0b0b0b_0%,#0a0a0a_45%,#070707_100%)]",
            "ring-1 ring-white/5",
            "before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none",
            "before:bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.06),transparent_60%)]",
            "overflow-hidden grid place-items-center text-center",
          ].join(" ")}
        >
          {/* inner ring to match cards */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />

          <div className="relative z-10 space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-none">
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                115+ Million
              </span>
            </h1>
            <h2 className="text-sm sm:text-base text-white/80 tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
              Media Views
            </h2>
            <p className="text-xs sm:text-sm text-white/65 max-w-sm mx-auto">
              Across TikTok, Instagram, and YouTube. High-retention, short-form
              content for gamers.
            </p>

            <div className="flex justify-center  items-center gap-4 mt-4">
              <a
                href="https://www.tiktok.com/@glazinggorillagames?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl"
              >
                <FaTiktok />
              </a>
              <a
                href="https://www.instagram.com/glazinggorillagames/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl"
              >
                <BiLogoInstagramAlt />
              </a>
              <a
                href="https://www.youtube.com/@GlazingGorillaGames"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl"
              >
                <FaYoutube />
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* optional: faint backdrop—kept under content and not clipping siblings */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.06] mix-blend-screen" />
    </section>
  );
}
