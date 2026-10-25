import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/treehedron/about")({
  head: () => ({
    meta: [
      { title: "About — TREEHEDRON" },
      { name: "description", content: "Mission, philosophy, principles, and the institution behind TREEHEDRON." },
    ],
  }),
  component: AboutPage,
});

const PRINCIPLES = [
  { title: "Nature is the model", desc: "We study natural systems not as resources to extract, but as designs to learn from." },
  { title: "Mathematics is the language", desc: "Precision is non-negotiable. Every system we build is grounded in mathematical rigor." },
  { title: "Intelligence is a tool", desc: "AI is not the goal. Understanding is the goal. Intelligence serves understanding." },
  { title: "Engineering is the bridge", desc: "Ideas without implementation are dreams. We build what we believe." },
  { title: "Honesty about time", desc: "We distinguish what exists, what is building, what is research, and what is vision." },
  { title: "Institutional thinking", desc: "We are not building a startup. We are building an institution designed to last generations." },
];

function AboutPage() {
  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Institution</span>
          <h1 className="th-page-title">About</h1>
          <p className="th-page-subtitle">The identity behind the architecture.</p>
        </motion.div>
      </section>

      <section className="th-section">
        <div className="th-section-inner th-read">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="th-vision-block"
          >
            <span className="th-section-kicker">Mission</span>
            <h2 className="th-vision-title">Build intelligent systems for a multidimensional world.</h2>
            <p className="th-vision-body">
              TREEHEDRON exists to connect the intelligence of machines with the wisdom of nature, the precision of mathematics, and the discipline of engineering. We believe the most important work of this century will happen at these intersections — and we intend to be the institution that defines how it is done.
            </p>
          </motion.div>

          <div className="th-principles">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="th-principle-card"
              >
                <h3 className="th-principle-title">{p.title}</h3>
                <p className="th-principle-desc">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </TreehedronLayout>
  );
}
