import React from "react";

export const HeroSkeleton = () => (
  <div className="relative h-screen w-full bg-black flex items-center justify-center">
    <div className="animate-pulse space-y-8 flex flex-col items-center">
      {/* Title skeleton */}
      <div className="space-y-3">
        <div className="h-24 w-96 bg-gray-800 rounded-lg" />
        <div className="h-24 w-96 bg-gray-800 rounded-lg" />
        <div className="h-24 w-96 bg-gray-800 rounded-lg" />
      </div>
      {/* Button skeleton */}
      <div className="h-12 w-64 bg-gray-800 rounded-full mt-8" />
    </div>
  </div>
);

export const GameGridSkeleton = () => (
  <section className="relative min-h-screen bg-black text-white py-16">
    <div className="mx-auto w-11/12 sm:w-5/6 lg:w-4/5">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-3xl bg-gray-900 overflow-hidden"
          >
            {/* Image skeleton */}
            <div className="h-56 md:h-60 lg:h-96 bg-gray-800" />

            {/* Content skeleton */}
            <div className="p-5 space-y-3">
              <div className="h-6 bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-800 rounded w-1/2" />
              <div className="h-4 bg-gray-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const ShowcaseSkeleton = () => (
  <section className="relative min-h-screen bg-[rgb(2,2,2)] text-white py-16">
    <div className="mx-auto w-11/12 sm:w-5/6 lg:w-4/5 grid gap-10 lg:grid-cols-2 animate-pulse">
      {/* Video carousel skeleton */}
      <div className="relative min-h-[70svh] bg-gray-900 rounded-3xl" />

      {/* Stats panel skeleton */}
      <div className="rounded-3xl bg-gray-900 p-6 space-y-4">
        <div className="h-12 bg-gray-800 rounded w-2/3 mx-auto" />
        <div className="h-6 bg-gray-800 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto" />
      </div>
    </div>
  </section>
);

export const AboutSkeleton = () => (
  <section className="relative min-h-screen bg-[rgb(2,2,2)] text-white py-12">
    <div className="mx-auto w-11/12 sm:w-5/6 lg:w-4/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {/* Overview card */}
      <div className="sm:col-span-2 rounded-3xl bg-gray-900 p-6 md:p-8 space-y-3">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded" />
        <div className="h-4 bg-gray-800 rounded w-5/6" />
      </div>

      {/* Stats card */}
      <div className="rounded-3xl bg-gray-900 p-6 md:p-8 space-y-4">
        <div className="h-8 bg-gray-800 rounded w-2/3" />
        <div className="h-6 bg-gray-800 rounded" />
        <div className="h-6 bg-gray-800 rounded" />
        <div className="h-6 bg-gray-800 rounded" />
      </div>

      {/* Roadmap card */}
      <div className="rounded-3xl bg-gray-900 p-6 md:p-8 space-y-3">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded" />
      </div>

      {/* Image card */}
      <div className="sm:col-span-2 rounded-3xl bg-gray-900 aspect-[16/7]" />
    </div>
  </section>
);
