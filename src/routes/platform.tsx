import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/platform")({
  head: () => ({
    meta: [
      { title: "Platform — TREEHEDRON" },
      { name: "description", content: "TREEHEDRON OS — the platform connecting data, models, agents, tools, humans, and physical systems." },
    ],
  }),
  component: PlatformPage,
});

const LAYERS = [
  { name: "Data", desc: "Ingestion, storage, and structured representation of information from any source." },
  { name: "Models", desc: "Computational models that encode understanding — from ML to simulation to mathematical." },
  { name: "Agents", desc: "Autonomous entities that use models to perceive, reason, and act within constraints." },
  { name: "Tools", desc: "Interfaces and APIs that let humans and machines direct agent activity." },
  { name: "Humans", desc: "Decision authority, oversight, and domain expertise — integrated, not replaced." },
  { name: "Physical Systems", desc: "The real-world infrastructure where decisions become actions and impact." },
];

function PlatformPage() {
  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Operating System</span>
          <h1 className="th-page-title">TREEHEDRON Platform</h1>
          <p className="th-page-subtitle">Data → Models → Agents → Tools → Humans → Physical systems.</p>
        </motion.div>
      </section>

      <section className="th-section">
        <div className="th-section-inner">
          <div className="th-stack">
            {LAYERS.map((layer, i) => (
              <motion.div
                key={layer.name}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="th-stack-layer"
              >
                <div className="th-stack-number">{String(i + 1).padStart(2, "0")}</div>
                <div className="th-stack-content">
                  <h3 className="th-stack-name">{layer.name}</h3>
                  <p className="th-stack-desc">{layer.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </TreehedronLayout>
  );
}
