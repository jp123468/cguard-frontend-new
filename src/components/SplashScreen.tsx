import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Oculta el splash después de 2.5 segundos
    const timer = setTimeout(() => setFadeOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Logo y texto */}
      <div className="flex flex-col items-center">
        <img
          src="../../assets/logo/logo.png" // 👈 cambia esta ruta por la de tu logo
          alt="GuardsPro Logo"
          className="w-40 select-none"
        />

        {/* <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0c2245] tracking-tight">
            Guards<span className="text-[#ff5722]">Pro</span>
          </h1>
        </div> */}

        {/* Tres puntos animados */}
        <div className="flex space-x-2 mt-5">
          <span className="w-3 h-3 bg-[#FE6F05] rounded-full animate-bounce [animation-delay:-0.10s]" />
          <span className="w-3 h-3 bg-[#FE6F05] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-3 h-3 bg-[#FE6F05] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
