import React, { useEffect, useRef, useState } from "react";
import GGG from "../assets/ggg.svg";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navbarRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setInView(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    if (navbarRef.current) observer.observe(navbarRef.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const handleNavClick = (label) => {
    if (location.pathname === "/") {
      document.getElementById(label)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: label } });
    }
  };

  return (
    <nav ref={navbarRef} className="absolute text-gray-100 w-full z-20">
      <div className="flex justify-center items-center gap-6">
        <button
          onClick={() => navigate("/")}
          className={[
            "transition-all duration-700 ease-out",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          ].join(" ")}
          style={{
            willChange: !hasAnimated ? 'opacity, transform' : 'auto',
            transform: 'translateZ(0)',
          }}
          aria-label="Go home"
        >
          <img
            src={GGG}
            className="h-24 lg:h-30 p-5 object-cover glow-img"
            alt="GGG Logo"
          />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
