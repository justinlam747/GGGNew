/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        scanlines:
          'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><line x1="0" y1="1" x2="2" y2="1" stroke="white" stroke-width="0.5" opacity="0.1" /></svg>\')',
      },

      dropShadow: {
        glow: [
          "0 0px 20px rgba(255,255, 255, 0.35)",
          "0 0px 65px rgba(255, 255,255, 0.2)",
        ],
      },
    },
  },
  plugins: [],
};
