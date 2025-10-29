import React from "react";
import ggg from "../assets/gggloading.png";

const BentoCard = ({ title, children, className = "" }) => (
  <div
    className={[
      "relative rounded-3xl p-6 md:p-8",
      "bg-[radial-gradient(120%_120%_at_50%_0%,#0b0b0b_0%,#0a0a0a_45%,#070707_100%)]",
      "ring-1 ring-white/5",
      "before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none before:bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.08),transparent_60%)]",
      "overflow-hidden transition-transform duration-300 hover:-translate-y-0.5",
      className,
    ].join(" ")}
    style={{
      willChange: 'transform',
      transform: 'translateZ(0)',
      contain: 'paint',
    }}
  >
    {/* inner ring (stays inside the card) */}
    <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
    {title && (
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
        <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </span>
      </h3>
    )}
    {children}
  </div>
);

const StatRow = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-gray-300">{label}</span>
    <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
      {value}
    </span>
  </div>
);

const About = ({ totalData }) => {
  return (
    <section
      id="about"
      className="
    relative isolate w-full
    min-h-[100svh] md:min-h-screen   /* real mobile viewport */
    bg-[rgb(2,2,2)] text-white
    py-12 tracking-tight select-none
    flex items-center
    overflow-visible md:overflow-hidden /* don't crop on mobile */
  "
      style={{ contain: 'layout style paint' }}
    >
      {/* soft center spotlight (z-0, isolated to this section) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-start"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="size-[80vmin] rounded-full opacity-[0.12] blur-3xl bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),rgba(255,255,255,0.0))]" />
      </div>

      {/* subtle film grain (z-0) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] mix-blend-screen"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundSize: "160px 160px",
          transform: 'translateZ(0)',
        }}
      />

      {/* content (z-10 so it sits above section backgrounds) */}
      <div className="relative z-10 mx-auto w-11/12 sm:w-5/6 lg:w-4/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Overview */}
        <BentoCard
          title="Comprehensive Overview"
          className="sm:col-span-2 flex flex-col justify-center"
        >
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl">
            Founded in 2022,{" "}
            <span className="text-white/90">Glazing Gorillas</span> ships
            stylized games like <span className="text-white/90">Consume</span>.
            Explore live metrics, growth, and upcoming titles at a glance.
          </p>
        </BentoCard>

        {/* Stats */}
        <BentoCard title="Key Stats">
          <div className="space-y-4">
            <StatRow
              label="Total Visits"
              value={
                totalData?.totalVisits != null
                  ? totalData.totalVisits.toLocaleString()
                  : "—"
              }
            />
            <StatRow
              label="Total Group Members"
              value={
                totalData?.totalMembers != null
                  ? totalData.totalMembers.toLocaleString()
                  : "—"
              }
            />
            <StatRow
              label="Current CCUs"
              value={
                totalData?.totalPlaying != null
                  ? totalData.totalPlaying.toLocaleString()
                  : "—"
              }
            />
          </div>

          {/* Mini bar chart */}
        </BentoCard>

        {/* Roadmap */}
        <BentoCard
          title="Game Acquisition"
          className="flex flex-col justify-center"
        >
          <p className="text-gray-400">
            <span className="text-white">Coming soon.</span>
          </p>
        </BentoCard>

        {/* Image */}

        <BentoCard
          title="In-House Development"
          className="sm:col-span-2 flex flex-col justify-center"
        >
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl">
            We handle every aspect of development in-house. From game
            scripting and systems design to 3D modeling, animation, and visual
            direction. Every asset, line of code, and piece of content is
            crafted by our team, ensuring a consistent style and creative
            freedom across all our projects. 
          </p>
        </BentoCard>
      </div>
    </section>
  );
};

export default About;
