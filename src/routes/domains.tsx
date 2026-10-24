import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "Domains — TREEHEDRON" },
      { name: "description", content: "The TREEHEDRON domain map — where intelligence acts in the real world." },
    ],
  }),
  component: DomainsPage,
});

const DOMAINS = [
  { name: "Earth", icon: "🌍", to: "/treehedron/domains/earth", desc: "Planetary intelligence — forests, water, climate, biodiversity, agriculture." },
  { name: "Science", icon: "🔬", to: "/treehedron/domains/science", desc: "Scientific computing, simulation, mathematical modelling, discovery." },
  { name: "Industry", icon: "🏭", to: "/treehedron/domains/industry", desc: "Industrial intelligence, automation, manufacturing, logistics, digital twins." },
  { name: "Health", icon: "🧬", to: "/treehedron/domains/health", desc: "Computational biology, genomics, protein modelling, drug discovery." },
  { name: "Education", icon: "🎓", to: "/treehedron/domains/education", desc: "Intelligent learning, personalized knowledge systems, research tools." },
  { name: "Energy", icon: "⚡", to: "/treehedron/domains/energy", desc: "Energy intelligence, forecasting, renewable optimization, grid management." },
  { name: "Robotics", icon: "🤖", to: "/treehedron/domains/robotics", desc: "AI brain → machine body. Intelligence in motion, from software to hardware." },
  { name: "Space", icon: "🚀", to: "/treehedron/domains/space", desc: "Satellite intelligence, Earth observation, mission software, planetary modelling." },
];

function DomainsPage() {
  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Where intelligence acts</span>
          <h1 className="th-page-title">Domains</h1>
          <p className="th-page-subtitle">Each domain is a branch of the same architecture.</p>
        </motion.div>
      </section>

      <section className="th-section">
        <div className="th-section-inner">
          <div className="th-domains-grid">
            {DOMAINS.map((domain, i) => (
              <motion.div
                key={domain.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <Link to={domain.to} className="th-domain-card">
                  <span className="th-domain-icon">{domain.icon}</span>
                  <h3 className="th-domain-name">{domain.name}</h3>
                  <p className="th-domain-desc">{domain.desc}</p>
                  <span className="th-domain-enter">Enter →</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </TreehedronLayout>
  );
}
