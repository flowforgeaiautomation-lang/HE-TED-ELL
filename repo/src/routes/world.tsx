import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, X, Globe2 } from "lucide-react";

export const Route = createFileRoute("/world")({
  component: WorldPage,
});

const continents = [
  {
    name: "Asia", countries: ["China", "India", "Japan", "South Korea", "Indonesia", "Vietnam", "Thailand", "Singapore", "Malaysia", "Philippines", "Mongolia", "Nepal", "Bhutan", "Bangladesh", "Sri Lanka", "Maldives", "Myanmar", "Laos", "Cambodia", "North Korea", "Pakistan", "Afghanistan", "Iran", "Iraq", "Jordan", "Israel", "Lebanon", "Syria", "Turkey", "Cyprus", "Georgia", "Armenia", "Azerbaijan", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan"], countryCount: 48
  },
  {
    name: "Europe", countries: ["France", "Germany", "Italy", "Spain", "United Kingdom", "Portugal", "Netherlands", "Belgium", "Luxembourg", "Switzerland", "Austria", "Hungary", "Czech Republic", "Slovakia", "Poland", "Lithuania", "Latvia", "Estonia", "Finland", "Sweden", "Norway", "Denmark", "Iceland", "Ireland", "Greece", "Croatia", "Serbia", "Bosnia and Herzegovina", "Slovenia", "North Macedonia", "Albania", "Bulgaria", "Romania", "Moldova", "Ukraine", "Belarus", "Russia", "Montenegro", "Kosovo"], countryCount: 44
  },
  {
    name: "Africa", countries: ["Nigeria", "Ethiopia", "Egypt", "South Africa", "Kenya", "Tanzania", "Morocco", "Algeria", "Tunisia", "Ghana", "Ivory Coast", "Senegal", "Cameroon", "Uganda", "Rwanda", "Burundi", "Mozambique", "Zimbabwe", "Botswana", "Namibia", "Angola", "Zambia", "Malawi", "Lesotho", "Eswatini", "Madagascar", "Mauritius", "Seychelles", "Comoros", "Djibouti", "Somalia", "Eritrea", "Sudan", "South Sudan", "Chad", "Central African Republic", "Republic of the Congo", "Democratic Republic of the Congo", "Gabon", "Equatorial Guinea", "São Tomé and Príncipe", "Cape Verde", "Gambia", "Sierra Leone", "Liberia", "Guinea", "Guinea-Bissau", "Mali", "Burkina Faso", "Niger", "Benin", "Togo"], countryCount: 54
  },
  {
    name: "North America", countries: ["United States", "Canada", "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama", "Cuba", "Dominican Republic", "Haiti", "Jamaica", "Trinidad and Tobago", "Barbados", "Saint Lucia", "Grenada", "Saint Vincent and the Grenadines", "Antigua and Barbuda", "Saint Kitts and Nevis", "Dominica", "Bahamas"], countryCount: 23
  },
  {
    name: "South America", countries: ["Brazil", "Argentina", "Peru", "Colombia", "Chile", "Ecuador", "Venezuela", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname", "French Guiana"], countryCount: 12
  },
  {
    name: "Oceania", countries: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Solomon Islands", "Vanuatu", "Samoa", "Tonga", "Tuvalu", "Kiribati", "Marshall Islands", "Palau", "Nauru", "Federated States of Micronesia"], countryCount: 14
  },
  {
    name: "Antarctica", countries: [], countryCount: 0
  },
];

const rankings = [
  { title: "Most Innovative Countries", items: ["Japan", "South Korea", "Germany", "Switzerland", "Sweden"] },
  { title: "Most Visited Countries", items: ["France", "Spain", "United States", "Italy", "Turkey"] },
  { title: "Richest Countries", items: ["Luxembourg", "Singapore", "Ireland", "Qatar", "Switzerland"] },
  { title: "Fastest Growing Economies", items: ["India", "China", "Vietnam", "Indonesia", "Philippines"] },
  { title: "Most Sustainable Countries", items: ["Iceland", "Denmark", "Sweden", "Norway", "Finland"] },
];

const discoverCollections = [
  { title: "Hidden Places Of Earth", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1000&auto=format&fit=crop" },
  { title: "Most Beautiful Rivers", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop" },
  { title: "Greatest Ancient Civilizations", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1000&auto=format&fit=crop" },
  { title: "Largest Forests", image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1000&auto=format&fit=crop" },
];

const todayDiscoveryFacts = [
  "Home to the world's oldest continuously inhabited city: Varanasi, India (over 3,000+ years",
  "Invented the number zero and decimal system",
  "Has 38 UNESCO World Heritage Sites",
  "World's largest producer of milk",
  "More than 19,500 languages spoken",
  "Largest democracy on Earth with 900 million+ voters",
  "Invented chess (Chaturanga) around 6th century",
  "World's highest cricket team won 1983 & 2011 World Cups",
  "Bollywood produces 2,000+ films yearly",
  "Home to Bengal tigers, Asiatic lions",
];

function WorldPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [selectedContinent, setSelectedContinent] = useState<typeof continents[0] | null>(null);

  const filterText = (text: string, query: string) =>
    text.toLowerCase().includes(query.toLowerCase().trim());

  const allCountries = continents.flatMap((c) => c.countries);

  const filteredContinents = searchQuery.trim()
    ? continents.filter((c) =>
        filterText(c.name, searchQuery) ||
        c.countries.some((country) => filterText(country, searchQuery))
      )
    : continents;

  const filteredCountries = searchQuery.trim()
    ? allCountries.filter((c) => filterText(c, searchQuery)).sort()
    : [];

  const filteredRankings = searchQuery.trim()
    ? rankings.filter(
        (r) =>
          filterText(r.title, searchQuery) ||
          r.items.some((item) => filterText(item, searchQuery))
      )
    : rankings;

  const filteredCollections = searchQuery.trim()
    ? discoverCollections.filter((c) => filterText(c.title, searchQuery))
    : discoverCollections;

  const nextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % todayDiscoveryFacts.length);
  };

  const prevFact = () => {
    setCurrentFactIndex((prev) => (prev - 1 + todayDiscoveryFacts.length) % todayDiscoveryFacts.length);
  };

  return (
    <div className="container-edit py-10 md:py-16">
      {/* Header */}
      <header className="text-center pb-16 border-b rule">
        <div className="kicker">World</div>
        <h1 className="display-1 mt-3">Explore humanity, discovery, history, nature, science, innovation, and important events from every corner of Earth.</h1>
        <div className="mt-10 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search countries, cities, cultures, discoveries, news, wildlife..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-transparent border border-rule text-lg font-serif outline-none focus:border-foreground"
            />
          </div>
        </div>
      </header>

      {/* Search Results (if query exists) */}
      {searchQuery.trim() && filteredCountries.length > 0 && (
        <section className="py-12 border-b rule">
          <div className="text-center mb-10">
            <div className="kicker">Search Results</div>
            <p className="font-serif text-lg mt-2">Found {filteredCountries.length} matching countries</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCountries.map((country) => (
              <Link
                key={country}
                to="/search"
                search={{ q: country }}
                className="border border-rule p-4 text-left font-serif hover:bg-foreground hover:text-background transition"
              >
                {country}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Continents */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Explore By Continent</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContinents.map((continent) => (
          <button
            key={continent.name}
            onClick={() => setSelectedContinent(continent)}
            className="p-6 border border-rule text-left hover:bg-foreground hover:text-background transition text-left"
          >
            <div className="font-serif text-2xl mb-2">{continent.name}</div>
            <div className="text-sm text-muted-foreground hover:text-background/70">{continent.countryCount} Countries</div>
          </button>
          ))}
        </div>
      </section>

      {/* Global Rankings */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Global Rankings</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRankings.map((ranking) => (
            <div key={ranking.title} className="border border-rule p-6">
              <h3 className="font-serif text-xl mb-4">{ranking.title}</h3>
              <ol className="space-y-2 font-serif">
                {ranking.items.map((item, i) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-6">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Discover Earth Collections */}
      <section className="py-12 border-b rule">
        <div className="text-center mb-10">
          <div className="kicker">Discover Earth</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCollections.map((collection) => (
            <button key={collection.title} className="group text-left">
              <div className="aspect-video bg-muted/30 border border-rule overflow-hidden">
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                />
              </div>
              <div className="mt-4 font-serif text-xl">{collection.title}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Today's Discovery */}
      <section className="py-12">
        <div className="text-center mb-10">
          <div className="kicker">Today's Discovery</div>
        </div>
        <div className="border border-rule p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <div className="aspect-square bg-muted/30 border border-rule overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=1000&auto=format&fit=crop"
                  alt="India"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="kicker">India</div>
              <h2 className="display-1 mt-3">The World's Largest Democracy</h2>
              <div className="mt-6 font-serif text-lg">
                <p className="mb-4">Amazing Fact {currentFactIndex + 1} of {todayDiscoveryFacts.length}:</p>
                <div className="min-h-[100px flex items-center">
                  <p className="leading-relaxed">{todayDiscoveryFacts[currentFactIndex]}</p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={prevFact} className="border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition">← Previous</button>
                  <button onClick={nextFact} className="border border-rule px-4 py-2 text-sm hover:bg-foreground hover:text-background transition">Next →</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continent Popup */}
      {selectedContinent && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-rule max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b rule">
              <h2 className="font-serif text-3xl">{selectedContinent.name}</h2>
              <button onClick={() => setSelectedContinent(null)} className="p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {selectedContinent.countries.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedContinent.countries.map((country) => (
                    <Link
                      key={country}
                      to="/search"
                      search={{ q: country }}
                      onClick={() => setSelectedContinent(null)}
                      className="font-serif text-lg border border-rule px-3 py-2 hover:bg-foreground hover:text-background transition"
                    >
                      {country}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="font-serif text-lg text-muted-foreground">
                  No sovereign nations — a continent dedicated to science and exploration.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
