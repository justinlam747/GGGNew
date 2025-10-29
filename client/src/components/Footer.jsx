import React from "react";
import { FaTiktok, FaYoutube, FaInstagram } from "react-icons/fa";
import logo from "../assets/ggg.svg";
import C1 from "../assets/C1.png";

const Footer = () => {
  return (
    <footer className="bg-[#000] text-gray-300 mx-4 sm:mx-8 md:mx-16 lg:mx-32 mt-10 sm:mt-16 md:mt-20">
      {/* ---------- Middle Banner Section ---------- */}
      <div className="flex justify-between flex-col">
        <div
          className="relative bg-gradient-to-r from-black to-[#0d0d0d] text-white rounded-2xl sm:rounded-3xl border py-8 sm:py-10 border-neutral-900 mx-2 sm:mx-4 mt-[-40px] sm:mt-[-60px] shadow-xl overflow-hidden banner-with-bg"
          style={{
            backgroundImage: `url(${C1})`,
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative z-10 p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 5px rgba(255,255,255,0.3), 0 0 100px rgba(255,255,255,0.2)' }}>Join our Roblox Group!</h2>
              
              <p className="text-sm sm:text-base text-gray-400 mt-2">
                Get free content in most of our games!
              </p>
              <a
                className="mt-4 rounded-xl border border-white/10 bg-white/10 px-5 py-2 sm:px-7 sm:py-3 text-sm sm:text-base md:text-lg font-semibold backdrop-blur-md
  shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_25px_rgba(0,0,0,0.45)]
  hover:bg-white/15 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_35px_rgba(0,0,0,0.55)]
  active:scale-[0.98] transition-all duration-300 inline-block"
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                }}
                href="https://www.roblox.com/communities/17206753/Glazing-Gorilla-Games#!/about"
                target="_blank"
                rel="noopener noreferrer"
              >
                Click Now!
              </a>
            </div>
          </div>
          {/* Point glow behind text */}
          <div className="pointer-events-none absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-white/20 rounded-full blur-[80px] z-0" style={{ transform: 'translate(-50%, -50%) translateZ(0)', willChange: 'auto' }} />
        </div>
      </div>

      {/* ---------- Footer Links Section ---------- */}
      <div className="bg-black text-gray-400 pt-10 sm:pt-12 md:pt-16 pb-6 sm:pb-8 md:pb-10 px-4 sm:px-6 md:px-20">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 sm:gap-4">
          {/* Company Info */}
          <div className="flex flex-col items-center sm:items-start relative isolate overflow-visible">
            <div className="relative overflow-visible">
              <img src={logo} alt="GGG Logo" className="h-24 sm:h-28 md:h-32 lg:h-40 relative z-10" style={{ filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.6)) drop-shadow(0 0 60px rgba(255,255,255,0.4))', transform: 'translateZ(0)', willChange: 'auto' }} />
              <div className="pointer-events-none absolute top-1/2 left-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-white/15 rounded-full blur-[60px] -z-10" style={{ transform: 'translate(-50%, -50%) translateZ(0)', willChange: 'auto' }} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-x-6">
            {/* Social */}
            <div className="relative isolate overflow-visible text-center sm:text-left">
              <h4 className="text-white font-semibold mb-3 relative z-10 text-base sm:text-lg" style={{ textShadow: '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.4)', willChange: 'auto' }}>Social</h4>
              <ul className="space-y-2 relative z-10 text-sm sm:text-base">
                <li>
                  <a
                    href="https://www.tiktok.com/@glazinggorillagames?lang=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center justify-center sm:justify-start gap-2 transition-colors duration-200"
                    style={{ textShadow: '0 0 15px rgba(255,255,255,0.4)', willChange: 'auto' }}
                  >
                    <FaTiktok size={18} /> Tiktok
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/glazinggorillagames/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center justify-center sm:justify-start gap-2 transition-colors duration-200"
                    style={{ textShadow: '0 0 15px rgba(255,255,255,0.4)', willChange: 'auto' }}
                  >
                    <FaInstagram size={18} /> Instagram
                  </a>
                </li>

                <li>
                  <a
                    href="https://www.youtube.com/@GlazingGorillaGames"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center justify-center sm:justify-start gap-2 transition-colors duration-200"
                    style={{ textShadow: '0 0 15px rgba(255,255,255,0.4)', willChange: 'auto' }}
                  >
                    <FaYoutube size={18} /> YouTube
                  </a>
                </li>
              </ul>
              {/* Radial glow behind social section */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 w-48 h-48 bg-white/15 rounded-full blur-[50px] -z-10" style={{ transform: 'translate(-50%, -50%) translateZ(0)', willChange: 'auto' }} />
            </div>

            {/* Legal */}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 sm:mt-8 mx-auto pt-4 sm:pt-6 text-center text-gray-500 text-xs sm:text-sm" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)' }}>
          © 2025 GGG. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
