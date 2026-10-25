import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { canonicalUrl, SITE_NAME, SITE_LOGO } from "@/lib/seo";

export const Route = createFileRoute("/information")({
  head: () => ({
    meta: [
      { title: "Information & Policies — The United Hell" },
      { name: "description", content: "Transparency. Editorial Standards. Policies. Trust. A guide to how The United Hell operates, creates content, protects users, and maintains editorial integrity." },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "Information & Policies — The United Hell" },
      { property: "og:description", content: "Transparency. Editorial Standards. Policies. Trust." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/information") },
      { property: "og:image", content: SITE_LOGO },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Information & Policies — The United Hell" },
      { name: "twitter:description", content: "Transparency. Editorial Standards. Policies. Trust." },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/information") },
    ],
  }),
  component: InformationPage,
});

const sections = [
  { id: "about", title: "About The United Hell" },
  { id: "editorial", title: "Editorial Principles" },
  { id: "corrections", title: "Corrections Policy" },
  { id: "copyright", title: "Copyright Policy" },
  { id: "terms", title: "Terms of Service" },
  { id: "privacy", title: "Privacy Policy" },
  { id: "community", title: "Community Guidelines" },
  { id: "advertising", title: "Advertising & Sponsorships" },
  { id: "careers", title: "Careers" },
  { id: "contact", title: "Contact" },
  { id: "legal", title: "Legal Notice" },
];

function InformationPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(sections.map((s) => s.id)));

  const toggleSection = (id: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenSections(newOpen);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container-edit py-10 md:py-16">
      {/* Header */}
      <header className="text-center pb-16 border-b rule">
        <div className="kicker">Information</div>
        <h1 className="display-1 mt-3">Transparency. Editorial Standards. Policies. Trust.</h1>
        <p className="dek mt-6 max-w-3xl mx-auto">
          A guide to how The United Hell operates, creates content, protects users, and maintains editorial integrity.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 pt-12">
        {/* Sticky TOC (desktop) */}
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="sticky top-32">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollTo(section.id)}
                  className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition"
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 max-w-3xl mx-auto lg:mx-0">
          {/* Section 1 */}
          <Section
            id="about"
            title="About The United Hell"
            isOpen={openSections.has("about")}
            onToggle={() => toggleSection("about")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              The United Hell is an independent discovery and knowledge platform dedicated to helping people understand the world through science, technology, history, nature, wildlife, culture, business, innovation, exploration, and human achievement.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Our mission is to transform information into understanding through clear, trustworthy, and accessible storytelling.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              Email: <a href="mailto:theunitedhell@gmail.com" className="text-foreground underline hover:no-underline">theunitedhell@gmail.com</a>
            </p>
          </Section>

          {/* Section 2 */}
          <Section
            id="editorial"
            title="Editorial Principles"
            isOpen={openSections.has("editorial")}
            onToggle={() => toggleSection("editorial")}
          >
            <ul className="font-serif text-lg leading-relaxed space-y-3">
              <li>Accuracy before speed.</li>
              <li>Knowledge before noise.</li>
              <li>Context before opinion.</li>
              <li>Curiosity before assumptions.</li>
              <li>Quality before quantity.</li>
            </ul>
            <p className="font-serif text-lg leading-relaxed mt-6">
              We aim to present information that is useful, educational, inspiring, and meaningful.
            </p>
          </Section>

          {/* Section 5 */}
          <Section
            id="corrections"
            title="Corrections Policy"
            isOpen={openSections.has("corrections")}
            onToggle={() => toggleSection("corrections")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              Accuracy matters.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              If an error is identified, corrections may be applied to published content.
            </p>
            <p className="font-serif text-lg leading-relaxed mt-4">
              Updated articles display revision information whenever applicable.
            </p>
          </Section>

          {/* Section 6 */}
          <Section
            id="copyright"
            title="Copyright Policy"
            isOpen={openSections.has("copyright")}
            onToggle={() => toggleSection("copyright")}
          >
            <p className="font-serif text-lg leading-relaxed">
              All original content, designs, branding, visual assets, and editorial material are protected by applicable copyright laws.
            </p>
            <p className="font-serif text-lg leading-relaxed mt-4">
              Unauthorized reproduction, redistribution, or commercial use may be prohibited without permission.
            </p>
          </Section>

          {/* Section 7 */}
          <Section
            id="terms"
            title="Terms of Service"
            isOpen={openSections.has("terms")}
            onToggle={() => toggleSection("terms")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              By using this platform, users agree to use the service lawfully and responsibly.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              Users must not misuse the platform, interfere with operations, attempt unauthorized access, distribute harmful content, or violate applicable laws.
            </p>
          </Section>

          {/* Section 8 */}
          <Section
            id="privacy"
            title="Privacy Policy"
            isOpen={openSections.has("privacy")}
            onToggle={() => toggleSection("privacy")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              We respect user privacy and are committed to protecting your personal data.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              <strong>Data Collection:</strong> We may collect anonymous usage data such as pages visited, time spent, browser type, and device information. If you create an account, we store your email address and reading preferences.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              <strong>Google AdSense & Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this and other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the internet.
            </p>
            <ul className="font-serif text-lg leading-relaxed space-y-2 mb-4 pl-6 list-disc">
              <li>Google may use the DoubleClick DART cookie to serve ads based on prior visits.</li>
              <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" className="text-foreground underline hover:no-underline" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</li>
              <li>Third-party vendors and ad networks may also use cookies for ad serving. You can opt out at <a href="https://www.aboutads.info/choices/" className="text-foreground underline hover:no-underline" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.</li>
            </ul>
            <p className="font-serif text-lg leading-relaxed mb-4">
              <strong>Analytics:</strong> We use Google Analytics and Microsoft Clarity to understand site usage. These tools collect anonymous, aggregated data.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              <strong>Data Retention:</strong> Anonymous usage data is retained for up to 14 months. Account data is retained until account deletion is requested.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              <strong>Your Rights:</strong> You may request access to, correction of, or deletion of your personal data by contacting us at theunitedhell@gmail.com.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              We do not knowingly sell personal information to third parties.
            </p>
          </Section>

          {/* Section 9 */}
          <Section
            id="community"
            title="Community Guidelines"
            isOpen={openSections.has("community")}
            onToggle={() => toggleSection("community")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              Users should:
            </p>
            <ul className="font-serif text-lg leading-relaxed space-y-2 mb-6">
              <li>Be respectful.</li>
              <li>Avoid harassment.</li>
              <li>Avoid hate speech.</li>
              <li>Avoid misinformation.</li>
              <li>Avoid spam.</li>
              <li>Avoid illegal activity.</li>
            </ul>
            <p className="font-serif text-lg leading-relaxed">
              Constructive discussion is encouraged.
            </p>
          </Section>

          {/* Section 10 */}
          <Section
            id="advertising"
            title="Advertising & Sponsorships"
            isOpen={openSections.has("advertising")}
            onToggle={() => toggleSection("advertising")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              Sponsored content and advertisements will be clearly identified whenever applicable.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              Editorial independence remains separate from advertising relationships.
            </p>
          </Section>

          {/* Section 11 */}
          <Section
            id="careers"
            title="Careers"
            isOpen={openSections.has("careers")}
            onToggle={() => toggleSection("careers")}
          >
            <p className="font-serif text-lg leading-relaxed">
              We welcome talented individuals passionate about knowledge, discovery, technology, design, research, and storytelling.
            </p>
            <p className="font-serif text-lg leading-relaxed mt-4">
              Future opportunities may be announced here.
            </p>
          </Section>

          {/* Section 12 */}
          <Section
            id="contact"
            title="Contact"
            isOpen={openSections.has("contact")}
            onToggle={() => toggleSection("contact")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              General Inquiries
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Partnerships
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Advertising
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Corrections
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Press
            </p>
            <p className="font-serif text-lg leading-relaxed">
              Support
            </p>
            <div className="mt-8 border-t rule pt-8">
              <p className="kicker mb-4">Get in touch</p>
              <input
                type="email"
                placeholder="Your email"
                className="w-full bg-transparent border border-rule px-4 py-3 font-serif text-lg outline-none focus:border-foreground"
              />
              <textarea
                placeholder="Your message"
                rows={6}
                className="w-full bg-transparent border border-rule px-4 py-3 font-serif text-lg mt-4 outline-none focus:border-foreground"
              />
              <button className="mt-6 border border-foreground px-6 py-3 text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition">
                Send message
              </button>
            </div>
          </Section>

          {/* Section 13 */}
          <Section
            id="legal"
            title="Legal Notice"
            isOpen={openSections.has("legal")}
            onToggle={() => toggleSection("legal")}
          >
            <p className="font-serif text-lg leading-relaxed mb-4">
              Information provided on this platform is intended for informational and educational purposes.
            </p>
            <p className="font-serif text-lg leading-relaxed mb-4">
              Users should verify important decisions through official sources.
            </p>
            <p className="font-serif text-lg leading-relaxed">
              The United Hell makes reasonable efforts to maintain accuracy but cannot guarantee completeness or suitability for every use case.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
  isOpen,
  onToggle,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section id={id} className="py-10 border-b rule">
      <div
        onClick={onToggle}
        className="flex items-center justify-between cursor-pointer"
      >
        <h2 className="display-3">{title}</h2>
        <button className="lg:hidden text-2xl">
          {isOpen ? "−" : "+"}
        </button>
      </div>
      {(isOpen) && (
        <div className="mt-6">{children}</div>
      )}
    </section>
  );
}
