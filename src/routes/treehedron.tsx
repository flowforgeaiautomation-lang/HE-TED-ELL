import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ClientOnly } from "@/components/treehedron/ClientOnly";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";
import { TreehedronScene } from "@/components/treehedron/TreehedronScene";

const BRANCHES = [
  { label: "Intelligence", desc: "AI agents, data systems, reasoning engines.", to: "/intelligence", icon: "◈" },
  { label: "Earth", desc: "Planetary intelligence, forests, climate, biodiversity.", to: "/treehedron/domains/earth", icon: "🌍" },
  { label: "Science", desc: "Scientific computation, simulation, discovery.", to: "/treehedron/domains/science", icon: "🔬" },
  { label: "Industry", desc: "Automation, manufacturing, digital twins, logistics.", to: "/treehedron/domains/industry", icon: "🏭" },
  { label: "Robotics", desc: "Intelligence in motion — from software to machines.", to: "/treehedron/domains/robotics", icon: "🤖" },
  { label: "Space", desc: "Satellite intelligence, Earth observation, exploration.", to: "/treehedron/domains/space", icon: "🚀" },
];

export const Route = createFileRoute("/treehedron")({
  head: () => ({
    meta: [
      { title: "TREEHEDRON — Build What Comes Next" },
      { name: "description", content: "Nature × Mathematics × Intelligence × Engineering. Building intelligent systems for a multidimensional world." },
      { property: "og:title", content: "TREEHEDRON" },
      { property: "og:description", content: "Building intelligent systems for a multidimensional world." },
    ],
  }),
  component: TreehedronHome,
});

function TreehedronHome() {
  return (
    <TreehedronLayout>
      {/* Hero */}
      <section className="th-hero">
        <div className="th-hero-canvas">
          <ClientOnly fallback={<div className="th-hero-fallback" />}>
            <TreehedronScene />
          </ClientOnly>
        </div>
        <div className="th-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
            className="text-center"
          >
            <div className="th-hero-kicker">NATURE × MATHEMATICS × INTELLIGENCE × ENGINEERING</div>
            <h1 className="th-hero-title">TREEHEDRON</h1>
            <p className="th-hero-subtitle">
              Building intelligent systems for a multidimensional world.
            </p>
            <div className="th-hero-cta">
              <Link to="/vision" className="th-btn-primary">Enter the Universe</Link>
              <Link to="/intelligence" className="th-btn-secondary">Explore Intelligence</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* One System. Many Dimensions. */}
      <section className="th-section">
        <div className="th-section-inner">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="th-section-heading"
          >
            <span className="th-section-kicker">Architecture</span>
            <h2 className="th-section-title">One System. Many Dimensions.</h2>
          </motion.div>
          <div className="th-branches-grid">
            {BRANCHES.map((branch, i) => (
              <motion.div
                key={branch.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link to={branch.to} className="th-branch-card">
                  <div className="th-branch-icon">{branch.icon}</div>
                  <h3 className="th-branch-title">{branch.label}</h3>
                  <p className="th-branch-desc">{branch.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="th-section th-section-philosophy">
        <div className="th-section-inner th-narrow">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="th-philosophy-line">NATURE IS A SYSTEM.</div>
            <div className="th-philosophy-line">INTELLIGENCE IS A TOOL.</div>
            <div className="th-philosophy-line">ENGINEERING GIVES IT FORM.</div>
            <div className="th-philosophy-line th-philosophy-accent">TREEHEDRON CONNECTS THEM.</div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="th-section th-section-cta">
        <div className="th-section-inner th-narrow text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="th-cta-title"
          >
            Build what comes next.
          </motion.h2>
          <Link to="/vision" className="th-btn-primary th-cta-btn">Begin</Link>
        </div>
      </section>
    </TreehedronLayout>
  );
}
