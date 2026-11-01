import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { TreehedronLayout } from "@/components/treehedron/TreehedronLayout";

export const Route = createFileRoute("/treehedron/contact")({
  head: () => ({
    meta: [
      { title: "Contact — TREEHEDRON" },
      { name: "description", content: "Connect with TREEHEDRON — enterprise, research, partnerships, developers, media." },
    ],
  }),
  component: ContactPage,
});

const CATEGORIES = ["Enterprise", "Research", "Partnerships", "Developers", "Media", "Careers", "General"];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState("General");

  return (
    <TreehedronLayout>
      <section className="th-page-hero">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="th-section-kicker">Connect</span>
          <h1 className="th-page-title">Contact</h1>
          <p className="th-page-subtitle">Reach the people behind TREEHEDRON.</p>
        </motion.div>
      </section>

      <section className="th-section">
        <div className="th-section-inner th-narrow">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="th-contact-success"
            >
              <h2 className="th-page-title th-text-sm">Message received.</h2>
              <p className="th-vision-body mt-4">
                We will respond from the appropriate team within 48 hours. Thank you for reaching out to TREEHEDRON.
              </p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="th-contact-form"
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
            >
              <div className="th-form-group">
                <label className="th-form-label">Category</label>
                <div className="th-category-pills">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`th-pill ${category === cat ? "th-pill-active" : ""}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="th-form-group">
                <label className="th-form-label">Name</label>
                <input type="text" required className="th-form-input" placeholder="Your name" />
              </div>
              <div className="th-form-group">
                <label className="th-form-label">Email</label>
                <input type="email" required className="th-form-input" placeholder="you@organization.com" />
              </div>
              <div className="th-form-group">
                <label className="th-form-label">Message</label>
                <textarea required rows={5} className="th-form-input th-form-textarea" placeholder="Tell us what you're working on, what you need, or what you want to explore." />
              </div>
              <button type="submit" className="th-btn-primary th-form-submit">Send message</button>
            </motion.form>
          )}
        </div>
      </section>
    </TreehedronLayout>
  );
}
