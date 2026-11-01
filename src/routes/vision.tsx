import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/vision")({
  head: () => ({
    meta: [
      { title: "Vision — TREEHEDRON" },
      { name: "description", content: "Why TREEHEDRON exists: connecting digital intelligence with physical and natural systems." },
    ],
  }),
  component: VisionPage,
});

const SECTIONS = [
  { kicker: "The Idea", title: "Nature + Mathematics + Intelligence + Engineering", body: "TREEHEDRON was founded on a simple premise: the most important systems of the future will sit at the intersection of natural wisdom, mathematical precision, computational intelligence, and disciplined engineering. We do not pick one. We connect all four." },
  { kicker: "The Problem", title: "Humanity's systems are increasingly interconnected", body: "Climate, energy, agriculture, health, industry, and information are no longer separate domains. A decision in one ripples through all. Yet our tools for understanding these connections remain fragmented, slow, and shallow." },
  { kicker: "The Approach", title: "Connect digital intelligence with physical and natural systems", body: "We build intelligence that does not live only in servers. It reaches into forests, factories, fields, and skies — turning data into understanding, understanding into decisions, and decisions into action in the real world." },
  { kicker: "The Architecture", title: "Roots → Trunk → Branches → Ecosystem", body: "Like a tree, TREEHEDRON grows from a foundation upward. Roots: data and infrastructure. Trunk: the intelligence core. Branches: domains where that intelligence acts. Leaves: products and applications. Fruit: research, discoveries, and impact." },
  { kicker: "The Long-term Vision", title: "The complete TREEHEDRON universe", body: "We are building toward a future where TREEHEDRON's intelligence touches every major system humans depend on — from the soil beneath our feet to the satellites above. Not a product. Not a platform. An institution." },
];

function VisionPage() {
  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Why we exist</span>
          <h1 className="th-page-title">Vision</h1>
          <p className="th-page-subtitle">A foundational manifesto, not a sales page.</p>
        </motion.div>
      </section>
      <section className="th-section">
        <div className="th-section-inner th-read">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.kicker}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="th-vision-block"
            >
              <span className="th-section-kicker">{s.kicker}</span>
              <h2 className="th-vision-title">{s.title}</h2>
              <p className="th-vision-body">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </TreehedronLayout>
  );
}
