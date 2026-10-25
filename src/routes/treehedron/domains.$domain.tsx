import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/treehedron/domains/$domain")({
  head: () => ({
    meta: [
      { title: "Domain — TREEHEDRON" },
      { name: "description", content: "A TREEHEDRON domain — where intelligence meets the physical world." },
    ],
  }),
  component: DomainDetailPage,
});

const DOMAIN_DATA: Record<string, { title: string; icon: string; subtitle: string; sections: { title: string; desc: string }[] }> = {
  earth: {
    title: "Earth",
    icon: "🌍",
    subtitle: "Planetary intelligence for forests, water, climate, and biodiversity.",
    sections: [
      { title: "Earth Intelligence", desc: "Systems that understand the planet as a single living organism — not separate datasets." },
      { title: "Forests & Biodiversity", desc: "Monitoring ecosystem health, species populations, and habitat connectivity at scale." },
      { title: "Water & Agriculture", desc: "Intelligent management of water resources and agricultural systems." },
      { title: "Climate Systems", desc: "Modelling, forecasting, and understanding climate dynamics and their cascading effects." },
      { title: "Environmental Intelligence", desc: "Turning environmental data into actionable understanding for decision-makers." },
    ],
  },
  science: {
    title: "Science",
    icon: "🔬",
    subtitle: "Scientific computation, simulation, and AI for research.",
    sections: [
      { title: "Scientific Computing", desc: "Infrastructure for large-scale computation across scientific disciplines." },
      { title: "Simulation", desc: "Computational models of physical, chemical, and biological systems." },
      { title: "Mathematical Modelling", desc: "From pure mathematics to applied modelling of real-world phenomena." },
      { title: "AI for Research", desc: "Tools that accelerate literature review, hypothesis generation, and experimental design." },
      { title: "Computational Discovery", desc: "Finding patterns and structures in data that humans alone cannot reach." },
    ],
  },
  industry: {
    title: "Industry",
    icon: "🏭",
    subtitle: "Connecting AI to the physical economy.",
    sections: [
      { title: "Industrial Intelligence", desc: "Embedding understanding into every layer of industrial operations." },
      { title: "Automation", desc: "Intelligent automation that adapts to changing conditions, not rigid scripts." },
      { title: "Digital Twins", desc: "Virtual replicas of physical systems that update and learn in real time." },
      { title: "Supply Chains", desc: "Predictive optimization of logistics, procurement, and distribution." },
      { title: "Predictive Systems", desc: "Anticipating failures, demand, and opportunities before they arrive." },
    ],
  },
  health: {
    title: "Health & Bio",
    icon: "🧬",
    subtitle: "Computational biology, genomics, and drug discovery.",
    sections: [
      { title: "Computational Biology", desc: "Modelling biological systems at molecular, cellular, and organism levels." },
      { title: "Genomics Infrastructure", desc: "Tools for processing, understanding, and acting on genomic data at scale." },
      { title: "Protein Modelling", desc: "Predicting and designing protein structures and interactions." },
      { title: "Drug Discovery Computation", desc: "Accelerating the path from target identification to clinical candidate." },
      { title: "Agricultural Biotechnology", desc: "Applying biological intelligence to food systems and sustainability." },
    ],
  },
  education: {
    title: "Education",
    icon: "🎓",
    subtitle: "Intelligent learning and personalized knowledge systems.",
    sections: [
      { title: "Intelligent Learning", desc: "Systems that adapt to each learner's pace, background, and goals." },
      { title: "Scientific Education", desc: "Tools that make complex science accessible without dumbing it down." },
      { title: "Personalized Knowledge", desc: "Knowledge systems that structure information around the individual, not the curriculum." },
      { title: "Research Tools", desc: "Giving students and researchers the same intelligence infrastructure as professionals." },
      { title: "Educational AI", desc: "AI that teaches, tutors, and accelerates understanding — not just answers." },
    ],
  },
  energy: {
    title: "Energy",
    icon: "⚡",
    subtitle: "Intelligence for the energy transition.",
    sections: [
      { title: "Energy Intelligence", desc: "Understanding energy systems as interconnected networks, not isolated assets." },
      { title: "Forecasting", desc: "Predicting generation, demand, and market dynamics with high accuracy." },
      { title: "Renewable Optimization", desc: "Maximizing the output and efficiency of renewable energy infrastructure." },
      { title: "Grid Intelligence", desc: "Smart grid management that balances stability, cost, and sustainability." },
      { title: "Industrial Energy", desc: "Reducing energy intensity of manufacturing and industrial processes." },
    ],
  },
  robotics: {
    title: "Robotics",
    icon: "🤖",
    subtitle: "AI brain → machine body. Intelligence in motion.",
    sections: [
      { title: "Intelligence", desc: "The cognitive layer — perception, reasoning, planning, and decision-making." },
      { title: "Perception", desc: "Sensors and systems that let machines understand their environment." },
      { title: "Planning & Control", desc: "Translating intent into safe, precise physical action." },
      { title: "Physical Action", desc: "The bridge from digital intelligence to real-world manipulation." },
      { title: "Autonomous Systems", desc: "Machines that operate independently within defined safety boundaries." },
    ],
  },
  space: {
    title: "Space",
    icon: "🚀",
    subtitle: "Intelligence beyond Earth. A long-term research domain.",
    sections: [
      { title: "Satellite Intelligence", desc: "Turning satellite data into understanding of Earth and space." },
      { title: "Earth Observation", desc: "Continuous, intelligent monitoring of the planet from above." },
      { title: "Mission Software", desc: "Autonomous systems for spacecraft operations and mission control." },
      { title: "Space Data", desc: "Infrastructure for the massive data streams from space-based systems." },
      { title: "Planetary Modelling", desc: "Computational models of planets, atmospheres, and orbital systems." },
    ],
  },
};

function DomainDetailPage() {
  const { domain } = Route.useParams();
  const data = DOMAIN_DATA[domain] ?? DOMAIN_DATA.earth;

  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Domain</span>
          <div className="th-page-icon">{data.icon}</div>
          <h1 className="th-page-title">{data.title}</h1>
          <p className="th-page-subtitle">{data.subtitle}</p>
        </motion.div>
      </section>
      <section className="th-section">
        <div className="th-section-inner th-read">
          {data.sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="th-domain-section"
            >
              <h2 className="th-domain-section-title">{s.title}</h2>
              <p className="th-domain-section-desc">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </TreehedronLayout>
  );
}
