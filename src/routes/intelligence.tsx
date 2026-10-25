import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "Intelligence — TREEHEDRON" },
      { name: "description", content: "AI agents, data systems, reasoning engines. The intelligence core of TREEHEDRON." },
    ],
  }),
  component: IntelligencePage,
});

const PIPELINE = ["Data", "Context", "Models", "Agents", "Reasoning", "Decisions", "Action"];
const CAPABILITIES = [
  { title: "AI Agents", desc: "Autonomous systems that perceive, reason, and act within defined domains." },
  { title: "Research Intelligence", desc: "Tools that accelerate scientific discovery and literature synthesis." },
  { title: "Automation", desc: "Connecting intelligence to physical and digital workflows." },
  { title: "Knowledge Systems", desc: "Structured representations of information that scale with understanding." },
  { title: "Decision Systems", desc: "From data to recommendation to verified action." },
  { title: "Machine Intelligence", desc: "Models that learn from nature, not just from data." },
];

function IntelligencePage() {
  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">First Pillar</span>
          <h1 className="th-page-title">Intelligence</h1>
          <p className="th-page-subtitle">The core from which everything grows.</p>
        </motion.div>
      </section>

      {/* Pipeline visualization */}
      <section className="th-section">
        <div className="th-section-inner">
          <div className="th-pipeline">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="th-pipeline-step"
              >
                <span className="th-pipeline-label">{step}</span>
                {i < PIPELINE.length - 1 && <span className="th-pipeline-arrow">↓</span>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="th-section">
        <div className="th-section-inner">
          <div className="th-cards-grid">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="th-info-card"
              >
                <h3 className="th-card-title">{cap.title}</h3>
                <p className="th-card-body">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </TreehedronLayout>
  );
}
