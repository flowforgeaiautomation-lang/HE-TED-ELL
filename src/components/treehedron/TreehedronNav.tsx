import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Vision", to: "/vision" },
  { label: "Intelligence", to: "/intelligence" },
  { label: "Platform", to: "/platform" },
  { label: "Domains", to: "/domains" },
  { label: "About", to: "/treehedron/about" },
  { label: "Contact", to: "/treehedron/contact" },
];

export function TreehedronNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "th-bg-glass"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
          <Link to="/treehedron" className="th-nav-logo">
            <span className="th-logo-mark">TREEHEDRON</span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="th-nav-link"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            className="lg:hidden th-nav-link"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="fixed inset-0 z-60 th-bg-solid flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4">
              <span className="th-logo-mark">TREEHEDRON</span>
              <button
                className="th-nav-link"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-col gap-2 px-6 pt-8">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  <Link
                    to={item.to}
                    className="th-mobile-link"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
