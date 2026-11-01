/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 50:"#f8f9fa",100:"#f1f3f5",200:"#e9ecef",300:"#dee2e6",400:"#ced4da",500:"#adb5bd",600:"#6c757d",700:"#495057",800:"#343a40",900:"#212529",950:"#0d0f12" },
        brand: { 50:"#fff8f0",100:"#ffecd9",200:"#ffd5b3",300:"#ffb380",400:"#ff8c42",500:"#ff6b1a",600:"#e8540a",700:"#c04006",800:"#9a3308",900:"#7a2a08" },
        accent: { 50:"#f0f7ff",100:"#d9ecff",200:"#b3d4ff",300:"#80b5ff",400:"#4d96ff",500:"#1a77ff",600:"#0058e0",700:"#0044b0",800:"#003380",900:"#00225a" },
        success: { 50:"#f0fdf4",100:"#dcfce7",200:"#bbf7d0",300:"#86efac",400:"#4ade80",500:"#22c55e",600:"#16a34a",700:"#15803d",800:"#166534",900:"#14532d" },
        warning: { 50:"#fffbeb",100:"#fef3c7",200:"#fde68a",300:"#fcd34d",400:"#fbbf24",500:"#f59e0b",600:"#d97706",700:"#b45309",800:"#92400e",900:"#78350f" },
        error: { 50:"#fef2f2",100:"#fee2e2",200:"#fecaca",300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c",800:"#991b1b",900:"#7f1d1d" },
      },
      fontFamily: { serif:["Georgia","Times New Roman","serif"], sans:["-apple-system","BlinkMacSystemFont","Inter","Segoe UI","Roboto","sans-serif"] },
      animation: {
        "fade-in":"fadeIn 0.4s ease-out","fade-up":"fadeUp 0.5s ease-out","fade-down":"fadeDown 0.5s ease-out",
        "slide-in":"slideIn 0.4s ease-out","scale-in":"scaleIn 0.35s ease-out","shimmer":"shimmer 1.5s linear infinite",
        "float":"float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:{ "0%":{opacity:"0"},"100%":{opacity:"1"} },
        fadeUp:{ "0%":{opacity:"0",transform:"translateY(16px)"},"100%":{opacity:"1",transform:"translateY(0)"} },
        fadeDown:{ "0%":{opacity:"0",transform:"translateY(-16px)"},"100%":{opacity:"1",transform:"translateY(0)"} },
        slideIn:{ "0%":{opacity:"0",transform:"translateX(-16px)"},"100%":{opacity:"1",transform:"translateX(0)"} },
        scaleIn:{ "0%":{opacity:"0",transform:"scale(0.96)"},"100%":{opacity:"1",transform:"scale(1)"} },
        shimmer:{ "0%":{backgroundPosition:"-200% 0"},"100%":{backgroundPosition:"200% 0"} },
        float:{ "0%,100%":{transform:"translateY(0)"},"50%":{transform:"translateY(-6px)"} },
      },
    },
  },
  plugins: [],
};
