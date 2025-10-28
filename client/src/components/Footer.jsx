import React from "react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";
import logo from "../assets/ggg.svg";
import C1 from "../assets/C1.png";

const Footer = () => {
  return (
    <footer className="bg-[#000] text-gray-300 mx-32 mt-20">
      {/* ---------- Middle Banner Section ---------- */}
      <div className="flex justify-between flex-col">
        <div
          className="relative bg-gradient-to-r from-black to-[#0d0d0d] text-white rounded-3xl border py-10 border-neutral-900 mx-4 mt-[-60px] shadow-xl overflow-hidden"
          style={{
            backgroundImage: `url(${C1})`,
            backgroundSize: "50% 100%",
            backgroundPosition: "right center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative z-10 p-12 md:p-16 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h2 className="text-3xl font-semibold">Join our Roblox Group!</h2>
              <p className="text-gray-400 mt-2">
                Get free content in most of our games!
              </p>
              <a
                className="mt-4 rounded-xl border border-white/10 bg-white/10 px-7 py-3 text-base md:text-lg font-semibold backdrop-blur-md
  shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_25px_rgba(0,0,0,0.45)]
  hover:bg-white/15 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_35px_rgba(0,0,0,0.55)]
  active:scale-[0.98] transition-all duration-300 inline-block"
                href="https://www.roblox.com/communities/17206753/Glazing-Gorilla-Games#!/about"
                target="_blank"
                rel="noopener noreferrer"
              >
                Click Now!
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Footer Links Section ---------- */}
      <div className="bg-black text-gray-400 pt-16 pb-10 px-6 md:px-20">
        <div className="flex justify-between ">
          {/* Company Info */}
          <div className="flex flex-col  items-start">
            
              <img src={logo} alt="GGG Logo" className="h-40 " />
          </div>
          <div className="flex flex-col-1 gap-x-6">
            {/* Social */}
            <div>
              <h4 className="text-white font-semibold mb-3">Social</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://www.tiktok.com/@glazinggorillagames?lang=en"
                    target="_blank"
                    className="hover:text-white flex items-center gap-2"
                  >
                    <FaTiktok /> Tiktok
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/glazinggorillagames/"
                    target="_blank"
                    className="hover:text-white flex items-center gap-2"
                  >
                    <FaInstagram /> Instagram
                  </a>
                </li>

                <li>
                  <a
                    href="https://www.youtube.com/@GlazingGorillaGames"
                    target="_blank"
                    className="hover:text-white flex items-center gap-2"
                  >
                    <FaYoutube /> YouTube
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
          </div>
        </div>

        {/* Bottom bar */}
        <div className=" mt-3 mx-auto pt-6 text-center text-gray-500 text-sm">
          © 2025 GGG. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
