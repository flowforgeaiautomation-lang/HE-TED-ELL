import { Link } from "@tanstack/react-router";

const FOOTER_SECTIONS = [
  {
    title: "Universe",
    links: [
      { label: "Vision", to: "/vision" },
      { label: "Intelligence", to: "/intelligence" },
      { label: "Platform", to: "/platform" },
      { label: "Systems", to: "/treehedron/systems" },
    ],
  },
  {
    title: "Domains",
    links: [
      { label: "Earth", to: "/treehedron/domains/earth" },
      { label: "Science", to: "/treehedron/domains/science" },
      { label: "Industry", to: "/treehedron/domains/industry" },
      { label: "Space", to: "/treehedron/domains/space" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/treehedron/about" },
      { label: "TREE(3)", to: "/treehedron/tree3" },
      { label: "Journal", to: "/treehedron/journal" },
      { label: "Contact", to: "/treehedron/contact" },
    ],
  },
];

export function TreehedronFooter() {
  return (
    <footer className="th-footer">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr]">
          <div>
            <div className="th-logo-mark th-footer-logo">TREEHEDRON</div>
            <p className="th-footer-tagline mt-4 max-w-sm">
              Nature × Mathematics × Intelligence × Engineering.
              Building intelligent systems for a multidimensional world.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="th-footer-heading">{section.title}</h4>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className="th-footer-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="th-footer-bottom">
          <span>© 2026 TREEHEDRON</span>
          <span className="th-footer-divider" />
          <span>Build what comes next.</span>
        </div>
      </div>
    </footer>
  );
}
