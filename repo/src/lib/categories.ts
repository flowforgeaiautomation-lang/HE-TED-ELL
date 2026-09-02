export type Category = {
  slug: string;
  label: string;
  description: string;
  icon: string;
};

export type CategorySection = {
  title: string;
  categories: Category[];
};

export const CATEGORIES: Category[] = [
  { slug: "all", label: "All", description: "", icon: "grid" },
  
  // 🔥 TRENDING & NEWS
  { slug: "trending-now", label: "Trending Now", description: "", icon: "trending-up" },
  { slug: "breaking-news", label: "Breaking News", description: "", icon: "newspaper" },
  { slug: "viral-stories", label: "Viral Stories", description: "", icon: "zap" },
  { slug: "most-discussed", label: "Most Discussed", description: "", icon: "message-square" },
  { slug: "most-shared", label: "Most Shared", description: "", icon: "share-2" },
  { slug: "most-viewed", label: "Most Viewed", description: "", icon: "eye" },
  { slug: "most-saved", label: "Most Saved", description: "", icon: "bookmark" },
  { slug: "daily-briefing", label: "Daily Briefing", description: "", icon: "calendar" },
  { slug: "weekly-highlights", label: "Weekly Highlights", description: "", icon: "calendar-days" },
  { slug: "monthly-highlights", label: "Monthly Highlights", description: "", icon: "calendar-check" },

  // 🌍 WORLD & DISCOVERY
  { slug: "discovery", label: "Discovery", description: "", icon: "globe" },
  { slug: "world-discovery", label: "World Discovery", description: "", icon: "globe" },
  { slug: "amazing-places", label: "Amazing Places", description: "", icon: "map-pin" },
  { slug: "hidden-places", label: "Hidden Places", description: "", icon: "compass" },
  { slug: "countries", label: "Countries", description: "", icon: "flag" },
  { slug: "cities", label: "Cities", description: "", icon: "building" },
  { slug: "islands", label: "Islands", description: "", icon: "wave-square" },
  { slug: "natural-wonders", label: "Natural Wonders", description: "", icon: "mountain" },
  { slug: "travel", label: "Travel", description: "", icon: "plane" },
  { slug: "adventure", label: "Adventure", description: "", icon: "mountain-snow" },
  { slug: "exploration", label: "Exploration", description: "", icon: "binoculars" },
  { slug: "world", label: "World", description: "", icon: "globe-2" },

  // 🏛 POLITICS & GOVERNANCE
  { slug: "politics", label: "Politics", description: "", icon: "landmark" },
  { slug: "elections", label: "Elections", description: "", icon: "vote" },
  { slug: "government", label: "Government", description: "", icon: "building-2" },
  { slug: "public-policy", label: "Public Policy", description: "", icon: "file-text" },
  { slug: "geopolitics", label: "Geopolitics", description: "", icon: "globe-americas" },
  { slug: "international-relations", label: "International Relations", description: "", icon: "handshake" },
  { slug: "diplomacy", label: "Diplomacy", description: "", icon: "users-round" },
  { slug: "global-affairs", label: "Global Affairs", description: "", icon: "earth" },

  // 💰 MONEY & SUCCESS
  { slug: "success-stories", label: "Success Stories", description: "", icon: "trophy" },
  { slug: "billionaires", label: "Billionaires", description: "", icon: "diamond" },
  { slug: "entrepreneurs", label: "Entrepreneurs", description: "", icon: "lightbulb" },
  { slug: "startups", label: "Startups", description: "", icon: "rocket" },
  { slug: "investing", label: "Investing", description: "", icon: "trending-up" },
  { slug: "markets", label: "Markets", description: "", icon: "line-chart" },
  { slug: "economics", label: "Economics", description: "", icon: "bar-chart-3" },
  { slug: "wealth-creation", label: "Wealth Creation", description: "", icon: "coin" },
  { slug: "personal-finance", label: "Personal Finance", description: "", icon: "wallet" },
  { slug: "business-leaders", label: "Business Leaders", description: "", icon: "crown" },
  { slug: "success", label: "Success", description: "", icon: "trending-up" },

  // 🚀 TECHNOLOGY & AI
  { slug: "technology", label: "Technology", description: "", icon: "cpu" },
  { slug: "artificial-intelligence", label: "Artificial Intelligence", description: "", icon: "brain-circuit" },
  { slug: "robotics", label: "Robotics", description: "", icon: "bot" },
  { slug: "future-technology", label: "Future Technology", description: "", icon: "sparkles" },
  { slug: "quantum-computing", label: "Quantum Computing", description: "", icon: "atom" },
  { slug: "cybersecurity", label: "Cybersecurity", description: "", icon: "shield" },
  { slug: "software", label: "Software", description: "", icon: "code-2" },
  { slug: "hardware", label: "Hardware", description: "", icon: "hard-drive" },
  { slug: "innovation", label: "Innovation", description: "", icon: "zap" },
  { slug: "digital-transformation", label: "Digital Transformation", description: "", icon: "refresh-cw" },
  { slug: "technology-ai", label: "Technology & AI", description: "", icon: "cpu" },

  // 🌌 SPACE & THE UNIVERSE
  { slug: "space", label: "Space", description: "", icon: "globe-2" },
  { slug: "astronomy", label: "Astronomy", description: "", icon: "telescope" },
  { slug: "cosmology", label: "Cosmology", description: "", icon: "sparkles" },
  { slug: "space-missions", label: "Space Missions", description: "", icon: "rocket" },
  { slug: "rocket-science", label: "Rocket Science", description: "", icon: "rocket" },
  { slug: "exoplanets", label: "Exoplanets", description: "", icon: "circle-dotted" },
  { slug: "black-holes", label: "Black Holes", description: "", icon: "circle" },
  { slug: "future-space-exploration", label: "Future Space Exploration", description: "", icon: "sparkles" },

  // 🔬 SCIENCE
  { slug: "science", label: "Science", description: "", icon: "flask-conical" },
  { slug: "physics", label: "Physics", description: "", icon: "atom" },
  { slug: "chemistry", label: "Chemistry", description: "", icon: "flask-round" },
  { slug: "biology", label: "Biology", description: "", icon: "dna" },
  { slug: "genetics", label: "Genetics", description: "", icon: "dna" },
  { slug: "neuroscience", label: "Neuroscience", description: "", icon: "brain" },
  { slug: "medicine", label: "Medicine", description: "", icon: "stethoscope" },
  { slug: "research", label: "Research", description: "", icon: "search" },
  { slug: "scientific-discoveries", label: "Scientific Discoveries", description: "", icon: "lightbulb" },
  { slug: "breakthroughs", label: "Breakthroughs", description: "", icon: "zap" },

  // 🦁 WILDLIFE & NATURE
  { slug: "wildlife", label: "Wildlife", description: "", icon: "paw" },
  { slug: "nature", label: "Nature", description: "", icon: "tree-pine" },
  { slug: "endangered-species", label: "Endangered Species", description: "", icon: "shield-alert" },
  { slug: "animal-kingdom", label: "Animal Kingdom", description: "", icon: "bird" },
  { slug: "forests", label: "Forests", description: "", icon: "tree-pine" },
  { slug: "national-parks", label: "National Parks", description: "", icon: "tree-pine" },
  { slug: "biodiversity", label: "Biodiversity", description: "", icon: "leaf" },
  { slug: "conservation", label: "Conservation", description: "", icon: "leaf" },
  { slug: "marine-life", label: "Marine Life", description: "", icon: "fish" },

  // 🌊 OCEANS
  { slug: "ocean-exploration", label: "Ocean Exploration", description: "", icon: "anchor" },
  { slug: "deep-sea-mysteries", label: "Deep Sea Mysteries", description: "", icon: "wrench" },
  { slug: "marine-science", label: "Marine Science", description: "", icon: "wave-square" },
  { slug: "underwater-discoveries", label: "Underwater Discoveries", description: "", icon: "search" },
  { slug: "coral-reefs", label: "Coral Reefs", description: "", icon: "flower-2" },
  { slug: "ocean-wildlife", label: "Ocean Wildlife", description: "", icon: "fish" },

  // 🏛 HISTORY
  { slug: "history", label: "History", description: "", icon: "history" },
  { slug: "ancient-civilizations", label: "Ancient Civilizations", description: "", icon: "pyramid" },
  { slug: "archaeology", label: "Archaeology", description: "", icon: "pickaxe" },
  { slug: "ancient-india", label: "Ancient India", description: "", icon: "om" },
  { slug: "ancient-egypt", label: "Ancient Egypt", description: "", icon: "pyramid" },
  { slug: "ancient-rome", label: "Ancient Rome", description: "", icon: "column-2" },
  { slug: "historical-figures", label: "Historical Figures", description: "", icon: "user" },
  { slug: "historical-mysteries", label: "Historical Mysteries", description: "", icon: "search" },

  // 🗿 MYSTERIES
  { slug: "unsolved-mysteries", label: "Unsolved Mysteries", description: "", icon: "search" },
  { slug: "lost-civilizations", label: "Lost Civilizations", description: "", icon: "mountain" },
  { slug: "ancient-secrets", label: "Ancient Secrets", description: "", icon: "key" },
  { slug: "strange-phenomena", label: "Strange Phenomena", description: "", icon: "sparkles" },
  { slug: "historical-enigmas", label: "Historical Enigmas", description: "", icon: "search" },
  { slug: "curiosity-stories", label: "Curiosity Stories", description: "", icon: "lightbulb" },

  // 📚 BOOKS & KNOWLEDGE
  { slug: "books", label: "Books", description: "", icon: "book-open" },
  { slug: "book-summaries", label: "Book Summaries", description: "", icon: "file-text" },
  { slug: "authors", label: "Authors", description: "", icon: "pen-tool" },
  { slug: "literature", label: "Literature", description: "", icon: "book" },
  { slug: "classic-books", label: "Classic Books", description: "", icon: "book" },
  { slug: "modern-books", label: "Modern Books", description: "", icon: "book" },
  { slug: "reading-lists", label: "Reading Lists", description: "", icon: "list" },
  { slug: "knowledge-vault", label: "Knowledge Vault", description: "", icon: "database" },
  { slug: "research-summaries", label: "Research Summaries", description: "", icon: "file-text" },
  { slug: "explainers", label: "Explainers", description: "", icon: "help-circle" },

  // 🎨 CULTURE & ARTS
  { slug: "culture", label: "Culture", description: "", icon: "palette" },
  { slug: "art", label: "Art", description: "", icon: "palette" },
  { slug: "photography", label: "Photography", description: "", icon: "camera" },
  { slug: "architecture", label: "Architecture", description: "", icon: "building-2" },
  { slug: "museums", label: "Museums", description: "", icon: "building" },
  { slug: "heritage", label: "Heritage", description: "", icon: "building-2" },
  { slug: "languages", label: "Languages", description: "", icon: "languages" },

  // 🎬 ENTERTAINMENT
  { slug: "entertainment", label: "Entertainment", description: "", icon: "film" },
  { slug: "movies", label: "Movies", description: "", icon: "film" },
  { slug: "web-series", label: "Web Series", description: "", icon: "tv" },
  { slug: "music", label: "Music", description: "", icon: "music" },
  { slug: "celebrities", label: "Celebrities", description: "", icon: "star" },
  { slug: "influencers", label: "Influencers", description: "", icon: "user" },
  { slug: "pop-culture", label: "Pop Culture", description: "", icon: "music" },
  { slug: "internet-culture", label: "Internet Culture", description: "", icon: "globe" },
  { slug: "gaming", label: "Gaming", description: "", icon: "gamepad-2" },
  { slug: "esports", label: "Esports", description: "", icon: "trophy" },
  { slug: "streaming", label: "Streaming", description: "", icon: "play-circle" },

  // 🏏 SPORTS
  { slug: "cricket", label: "Cricket", description: "", icon: "baseball" },
  { slug: "football", label: "Football", description: "", icon: "football" },
  { slug: "olympics", label: "Olympics", description: "", icon: "trophy" },
  { slug: "athletes", label: "Athletes", description: "", icon: "user" },
  { slug: "sports-science", label: "Sports Science", description: "", icon: "flask-conical" },
  { slug: "major-events", label: "Major Events", description: "", icon: "calendar" },

  // 🏥 HEALTH
  { slug: "health", label: "Health", description: "", icon: "heart" },
  { slug: "fitness", label: "Fitness", description: "", icon: "activity" },
  { slug: "nutrition", label: "Nutrition", description: "", icon: "apple" },
  { slug: "longevity", label: "Longevity", description: "", icon: "clock" },
  { slug: "medical-innovation", label: "Medical Innovation", description: "", icon: "zap" },
  { slug: "wellness", label: "Wellness", description: "", icon: "sparkles" },

  // 👥 HUMANITY
  { slug: "society", label: "Society", description: "", icon: "users" },
  { slug: "communities", label: "Communities", description: "", icon: "users-round" },
  { slug: "human-behavior", label: "Human Behavior", description: "", icon: "brain" },
  { slug: "psychology", label: "Psychology", description: "", icon: "brain" },
  { slug: "relationships", label: "Relationships", description: "", icon: "heart" },
  { slug: "demographics", label: "Demographics", description: "", icon: "users" },

  // 🕉 PHILOSOPHY & SPIRITUALITY
  { slug: "philosophy", label: "Philosophy", description: "", icon: "book-open" },
  { slug: "ethics", label: "Ethics", description: "", icon: "scale" },
  { slug: "spirituality", label: "Spirituality", description: "", icon: "sparkles" },
  { slug: "astrology", label: "Horoscope & Astrology", description: "", icon: "sparkles" },
  { slug: "horoscope", label: "Horoscope", description: "", icon: "sparkles" },
  { slug: "palmistry", label: "Palmistry", description: "", icon: "hand" },
  { slug: "numerology", label: "Numerology", description: "", icon: "hash" },
  { slug: "vedic-astrology", label: "Vedic Astrology", description: "", icon: "om" },
  { slug: "wisdom", label: "Wisdom", description: "", icon: "lightbulb" },
  { slug: "meditation", label: "Meditation", description: "", icon: "lotus" },
  { slug: "ancient-traditions", label: "Ancient Traditions", description: "", icon: "book" },

  // 📚 EDUCATION
  { slug: "education", label: "Education", description: "", icon: "graduation-cap" },
  { slug: "learning", label: "Learning", description: "", icon: "book-open" },
  { slug: "study-skills", label: "Study Skills", description: "", icon: "book" },
  { slug: "scholarships", label: "Scholarships", description: "", icon: "award" },
  { slug: "exams", label: "Exams", description: "", icon: "file-text" },
  { slug: "careers", label: "Careers", description: "", icon: "briefcase" },

  // 💼 CAREERS & OPPORTUNITIES
  { slug: "jobs", label: "Jobs", description: "", icon: "briefcase" },
  { slug: "government-jobs", label: "Government Jobs", description: "", icon: "building-2" },
  { slug: "internships", label: "Internships", description: "", icon: "user" },
  { slug: "fellowships", label: "Fellowships", description: "", icon: "award" },
  { slug: "grants", label: "Grants", description: "", icon: "file-text" },
  { slug: "funding", label: "Funding", description: "", icon: "coin" },
  { slug: "competitions", label: "Competitions", description: "", icon: "trophy" },
  { slug: "skill-development", label: "Skill Development", description: "", icon: "wrench" },

  // ⚡ ENERGY
  { slug: "renewable-energy", label: "Renewable Energy", description: "", icon: "sun" },
  { slug: "nuclear-energy", label: "Nuclear Energy", description: "", icon: "atom" },
  { slug: "energy-innovation", label: "Energy Innovation", description: "", icon: "zap" },
  { slug: "future-energy", label: "Future Energy", description: "", icon: "zap" },

  // 🌱 ENVIRONMENT
  { slug: "climate", label: "Climate", description: "", icon: "cloud" },
  { slug: "sustainability", label: "Sustainability", description: "", icon: "leaf" },
  { slug: "green-technology", label: "Green Technology", description: "", icon: "leaf" },
  { slug: "environmental-protection", label: "Environmental Protection", description: "", icon: "shield" },

  // 🏙 CITIES & MEGAPROJECTS
  { slug: "smart-cities", label: "Smart Cities", description: "", icon: "building-2" },
  { slug: "future-cities", label: "Future Cities", description: "", icon: "building" },
  { slug: "infrastructure", label: "Infrastructure", description: "", icon: "building" },
  { slug: "megaprojects", label: "Megaprojects", description: "", icon: "building-2" },
  { slug: "urban-development", label: "Urban Development", description: "", icon: "building" },

  // 🚄 TRANSPORTATION
  { slug: "aviation", label: "Aviation", description: "", icon: "plane" },
  { slug: "railways", label: "Railways", description: "", icon: "train" },
  { slug: "ships", label: "Ships", description: "", icon: "ship" },
  { slug: "electric-vehicles", label: "Electric Vehicles", description: "", icon: "car" },
  { slug: "autonomous-vehicles", label: "Autonomous Vehicles", description: "", icon: "car" },

  // 👑 LUXURY
  { slug: "luxury-travel", label: "Luxury Travel", description: "", icon: "plane" },
  { slug: "luxury-architecture", label: "Luxury Architecture", description: "", icon: "building" },
  { slug: "luxury-brands", label: "Luxury Brands", description: "", icon: "diamond" },
  { slug: "luxury-lifestyle", label: "Luxury Lifestyle", description: "", icon: "crown" },
  { slug: "luxury-experiences", label: "Luxury Experiences", description: "", icon: "sparkles" },

  // 🔮 FUTURE OF HUMANITY
  { slug: "future", label: "Future", description: "", icon: "sparkles" },
  { slug: "future-of-ai", label: "Future of AI", description: "", icon: "brain-circuit" },
  { slug: "future-of-work", label: "Future of Work", description: "", icon: "briefcase" },
  { slug: "future-of-education", label: "Future of Education", description: "", icon: "graduation-cap" },
  { slug: "future-of-civilization", label: "Future of Civilization", description: "", icon: "globe" },
  { slug: "future-predictions", label: "Future Predictions", description: "", icon: "clock" },

  // 📖 STORIES
  { slug: "human-stories", label: "Human Stories", description: "", icon: "user" },
  { slug: "inspirational-stories", label: "Inspirational Stories", description: "", icon: "sparkles" },
  { slug: "extraordinary-people", label: "Extraordinary People", description: "", icon: "star" },
  { slug: "against-all-odds", label: "Against All Odds", description: "", icon: "trophy" },
  { slug: "life-journeys", label: "Life Journeys", description: "", icon: "map" },

  // ⭐ CURIOSITY
  { slug: "curiosity", label: "Curiosity", description: "", icon: "star" },
  { slug: "amazing-facts", label: "Amazing Facts", description: "", icon: "lightbulb" },
  { slug: "mind-blowing-facts", label: "Mind-Blowing Facts", description: "", icon: "zap" },
  { slug: "did-you-know", label: "Did You Know?", description: "", icon: "help-circle" },
  { slug: "rare-discoveries", label: "Rare Discoveries", description: "", icon: "search" },
  { slug: "unexpected-knowledge", label: "Unexpected Knowledge", description: "", icon: "sparkles" },

  // 🌏 INDIA
  { slug: "india", label: "India", description: "", icon: "map-pin" },
  { slug: "indian-innovation", label: "Indian Innovation", description: "", icon: "lightbulb" },
  { slug: "indian-startups", label: "Indian Startups", description: "", icon: "rocket" },
  { slug: "indian-history", label: "Indian History", description: "", icon: "history" },
  { slug: "indian-culture", label: "Indian Culture", description: "", icon: "palette" },
  { slug: "indian-science", label: "Indian Science", description: "", icon: "flask-conical" },
  { slug: "indian-wildlife", label: "Indian Wildlife", description: "", icon: "paw" },
  { slug: "indian-discoveries", label: "Indian Discoveries", description: "", icon: "sparkles" },

  // 🎖️ SPECIAL COLLECTIONS
  { slug: "editors-picks", label: "Editor's Picks", description: "", icon: "star" },
  { slug: "most-important-today", label: "Most Important Today", description: "", icon: "calendar" },
  { slug: "most-important-this-week", label: "Most Important This Week", description: "", icon: "calendar-days" },
  { slug: "most-important-this-month", label: "Most Important This Month", description: "", icon: "calendar-check" },
  { slug: "most-important-this-year", label: "Most Important This Year", description: "", icon: "calendar" },
  { slug: "hidden-gems", label: "Hidden Gems", description: "", icon: "diamond" },
  { slug: "rising-trends", label: "Rising Trends", description: "", icon: "trending-up" },
  { slug: "future-signals", label: "Future Signals", description: "", icon: "signal" },
  { slug: "global-rankings", label: "Global Rankings", description: "", icon: "trophy" },
  { slug: "worlds-greatest", label: "World's Greatest", description: "", icon: "crown" },

  // 🍲 FOOD & CULINARY CULTURE
  { slug: "food-culinary-culture", label: "Food & Culinary Culture", description: "", icon: "utensils" },
  { slug: "world-foods", label: "World Foods", description: "", icon: "globe" },
  { slug: "indian-foods", label: "Indian Foods", description: "", icon: "map-pin" },
  { slug: "traditional-recipes", label: "Traditional Recipes", description: "", icon: "book" },
  { slug: "food-science", label: "Food Science", description: "", icon: "flask-conical" },
  { slug: "rare-foods", label: "Rare Foods", description: "", icon: "gem" },
  { slug: "culinary-history", label: "Culinary History", description: "", icon: "history" },

  // 🏗 ENGINEERING & INVENTIONS
  { slug: "engineering-inventions", label: "Engineering & Inventions", description: "", icon: "wrench" },
  { slug: "greatest-inventions", label: "Greatest Inventions", description: "", icon: "lightbulb" },
  { slug: "engineering-marvels", label: "Engineering Marvels", description: "", icon: "building-2" },
  { slug: "mega-machines", label: "Mega Machines", description: "", icon: "gear" },
  { slug: "industrial-innovations", label: "Industrial Innovations", description: "", icon: "factory" },
  { slug: "manufacturing", label: "Manufacturing", description: "", icon: "wrench" },

  // 👑 LEADERS & ICONS
  { slug: "leaders-icons", label: "Leaders & Icons", description: "", icon: "crown" },
  { slug: "world-leaders", label: "World Leaders", description: "", icon: "users-round" },
  { slug: "historical-leaders", label: "Historical Leaders", description: "", icon: "user" },
  { slug: "scientists", label: "Scientists", description: "", icon: "flask-conical" },
  { slug: "inventors", label: "Inventors", description: "", icon: "lightbulb" },
  { slug: "visionaries", label: "Visionaries", description: "", icon: "eye" },
  { slug: "change-makers", label: "Change Makers", description: "", icon: "zap" },

  // 🐉 MYTHOLOGY & LEGENDS
  { slug: "mythology-legends", label: "Mythology & Legends", description: "", icon: "dragon" },
  { slug: "indian-mythology", label: "Indian Mythology", description: "", icon: "om" },
  { slug: "greek-mythology", label: "Greek Mythology", description: "", icon: "columns" },
  { slug: "egyptian-mythology", label: "Egyptian Mythology", description: "", icon: "pyramid" },
  { slug: "folklore", label: "Folklore", description: "", icon: "book" },
  { slug: "legends", label: "Legends", description: "", icon: "star" },
  { slug: "ancient-stories", label: "Ancient Stories", description: "", icon: "scroll" },

  // 💎 RARE & EXTRAORDINARY
  { slug: "rare-extraordinary", label: "Rare & Extraordinary", description: "", icon: "gem" },
  { slug: "worlds-rarest-things", label: "World's Rarest Things", description: "", icon: "diamond" },
  { slug: "rare-animals", label: "Rare Animals", description: "", icon: "paw" },
  { slug: "rare-places", label: "Rare Places", description: "", icon: "map-pin" },
  { slug: "rare-artifacts", label: "Rare Artifacts", description: "", icon: "scroll" },

  // 🏆 RANKINGS
  { slug: "rankings", label: "Rankings", description: "", icon: "trophy" },
  { slug: "richest-people", label: "Richest People", description: "", icon: "dollar-sign" },
  { slug: "largest-companies", label: "Largest Companies", description: "", icon: "building-2" },
  { slug: "biggest-cities", label: "Biggest Cities", description: "", icon: "building" },
  { slug: "strongest-economies", label: "Strongest Economies", description: "", icon: "trending-up" },
  { slug: "tallest-buildings", label: "Tallest Buildings", description: "", icon: "building-2" },
  { slug: "greatest-universities", label: "Greatest Universities", description: "", icon: "graduation-cap" },

  // 📈 DATA & VISUAL INTELLIGENCE
  { slug: "data-visual-intelligence", label: "Data & Visual Intelligence", description: "", icon: "bar-chart-3" },
  { slug: "global-statistics", label: "Global Statistics", description: "", icon: "bar-chart-3" },
  { slug: "country-rankings", label: "Country Rankings", description: "", icon: "trophy" },
  { slug: "economic-data", label: "Economic Data", description: "", icon: "line-chart" },
  { slug: "population-trends", label: "Population Trends", description: "", icon: "users" },
  { slug: "climate-data", label: "Climate Data", description: "", icon: "cloud" },

  // 🌎 WORLD EXPLORER
  { slug: "world-explorer", label: "World Explorer", description: "", icon: "globe-2" },
  { slug: "continents", label: "Continents", description: "", icon: "map" },
  { slug: "asia", label: "Asia", description: "", icon: "map-pin" },
  { slug: "europe", label: "Europe", description: "", icon: "map-pin" },
  { slug: "africa", label: "Africa", description: "", icon: "map-pin" },
  { slug: "north-america", label: "North America", description: "", icon: "map-pin" },
  { slug: "south-america", label: "South America", description: "", icon: "map-pin" },
  { slug: "oceania", label: "Oceania", description: "", icon: "map-pin" },
  { slug: "antarctica", label: "Antarctica", description: "", icon: "map-pin" },

  // 🔥 STORY EVOLUTION
  { slug: "story-evolution", label: "Story Evolution", description: "", icon: "history" },
];

export const CATEGORY_SECTIONS: CategorySection[] = [
  { title: "TRENDING & NEWS",
  categories: CATEGORIES.filter(c => ["trending-now", "breaking-news", "viral-stories", "most-discussed", "most-shared", "most-viewed", "most-saved", "daily-briefing", "weekly-highlights", "monthly-highlights"].includes(c.slug)),
  },
  { title: "WORLD & DISCOVERY",
  categories: CATEGORIES.filter(c => ["discovery", "world-discovery", "amazing-places", "hidden-places", "countries", "cities", "islands", "natural-wonders", "travel", "adventure", "exploration"].includes(c.slug)),
  },
  { title: "POLITICS & GOVERNANCE",
  categories: CATEGORIES.filter(c => ["politics", "elections", "government", "public-policy", "geopolitics", "international-relations", "diplomacy", "global-affairs"].includes(c.slug)),
  },
  { title: "MONEY & SUCCESS",
  categories: CATEGORIES.filter(c => ["success-stories", "billionaires", "entrepreneurs", "startups", "investing", "markets", "economics", "wealth-creation", "personal-finance", "business-leaders"].includes(c.slug)),
  },
  { title: "TECHNOLOGY & AI",
  categories: CATEGORIES.filter(c => ["technology", "artificial-intelligence", "robotics", "future-technology", "quantum-computing", "cybersecurity", "software", "hardware", "innovation", "digital-transformation"].includes(c.slug)),
  },
  { title: "SPACE & THE UNIVERSE",
  categories: CATEGORIES.filter(c => ["space", "astronomy", "cosmology", "space-missions", "rocket-science", "exoplanets", "black-holes", "future-space-exploration"].includes(c.slug)),
  },
  { title: "SCIENCE",
  categories: CATEGORIES.filter(c => ["science", "physics", "chemistry", "biology", "genetics", "neuroscience", "medicine", "research", "scientific-discoveries", "breakthroughs"].includes(c.slug)),
  },
  { title: "WILDLIFE & NATURE",
  categories: CATEGORIES.filter(c => ["wildlife", "nature", "endangered-species", "animal-kingdom", "forests", "national-parks", "biodiversity", "conservation", "marine-life"].includes(c.slug)),
  },
  { title: "OCEANS",
  categories: CATEGORIES.filter(c => ["ocean-exploration", "deep-sea-mysteries", "marine-science", "underwater-discoveries", "coral-reefs", "ocean-wildlife"].includes(c.slug)),
  },
  { title: "HISTORY",
  categories: CATEGORIES.filter(c => ["history", "ancient-civilizations", "archaeology", "ancient-india", "ancient-egypt", "ancient-rome", "historical-figures", "historical-mysteries"].includes(c.slug)),
  },
  { title: "MYSTERIES",
  categories: CATEGORIES.filter(c => ["unsolved-mysteries", "lost-civilizations", "ancient-secrets", "strange-phenomena", "historical-enigmas", "curiosity-stories"].includes(c.slug)),
  },
  { title: "BOOKS & KNOWLEDGE",
  categories: CATEGORIES.filter(c => ["books", "book-summaries", "authors", "literature", "classic-books", "modern-books", "reading-lists", "knowledge-vault", "research-summaries", "explainers"].includes(c.slug)),
  },
  { title: "CULTURE & ARTS",
  categories: CATEGORIES.filter(c => ["culture", "art", "photography", "architecture", "museums", "heritage", "languages"].includes(c.slug)),
  },
  { title: "ENTERTAINMENT",
  categories: CATEGORIES.filter(c => ["entertainment", "movies", "web-series", "music", "celebrities", "influencers", "pop-culture", "internet-culture", "gaming", "esports", "streaming"].includes(c.slug)),
  },
  { title: "SPORTS",
  categories: CATEGORIES.filter(c => ["cricket", "football", "olympics", "athletes", "sports-science", "major-events"].includes(c.slug)),
  },
  { title: "HEALTH",
  categories: CATEGORIES.filter(c => ["health", "fitness", "nutrition", "longevity", "medical-innovation", "wellness"].includes(c.slug)),
  },
  { title: "HUMANITY",
  categories: CATEGORIES.filter(c => ["society", "communities", "human-behavior", "psychology", "relationships", "demographics"].includes(c.slug)),
  },
  { title: "PHILOSOPHY & SPIRITUALITY",
  categories: CATEGORIES.filter(c => ["philosophy", "ethics", "spirituality", "astrology", "horoscope", "palmistry", "numerology", "vedic-astrology", "wisdom", "meditation", "ancient-traditions"].includes(c.slug)),
  },
  { title: "EDUCATION",
  categories: CATEGORIES.filter(c => ["education", "learning", "study-skills", "scholarships", "exams", "careers"].includes(c.slug)),
  },
  { title: "CAREERS & OPPORTUNITIES",
  categories: CATEGORIES.filter(c => ["jobs", "government-jobs", "internships", "fellowships", "grants", "funding", "competitions", "skill-development"].includes(c.slug)),
  },
  { title: "ENERGY",
  categories: CATEGORIES.filter(c => ["renewable-energy", "nuclear-energy", "energy-innovation", "future-energy"].includes(c.slug)),
  },
  { title: "ENVIRONMENT",
  categories: CATEGORIES.filter(c => ["climate", "sustainability", "green-technology", "environmental-protection"].includes(c.slug)),
  },
  { title: "CITIES & MEGAPROJECTS",
  categories: CATEGORIES.filter(c => ["smart-cities", "future-cities", "infrastructure", "megaprojects", "urban-development"].includes(c.slug)),
  },
  { title: "TRANSPORTATION",
  categories: CATEGORIES.filter(c => ["aviation", "railways", "ships", "electric-vehicles", "autonomous-vehicles"].includes(c.slug)),
  },
  { title: "LUXURY",
  categories: CATEGORIES.filter(c => ["luxury-travel", "luxury-architecture", "luxury-brands", "luxury-lifestyle", "luxury-experiences"].includes(c.slug)),
  },
  { title: "FUTURE OF HUMANITY",
  categories: CATEGORIES.filter(c => ["future", "future-of-ai", "future-of-work", "future-of-education", "future-of-civilization", "future-predictions"].includes(c.slug)),
  },
  { title: "STORIES",
  categories: CATEGORIES.filter(c => ["human-stories", "inspirational-stories", "extraordinary-people", "against-all-odds", "life-journeys"].includes(c.slug)),
  },
  { title: "CURIOSITY",
  categories: CATEGORIES.filter(c => ["curiosity", "amazing-facts", "mind-blowing-facts", "did-you-know", "rare-discoveries", "unexpected-knowledge"].includes(c.slug)),
  },
  { title: "INDIA",
  categories: CATEGORIES.filter(c => ["india", "indian-innovation", "indian-startups", "indian-history", "indian-culture", "indian-science", "indian-wildlife", "indian-discoveries"].includes(c.slug)),
  },
  { title: "SPECIAL COLLECTIONS",
  categories: CATEGORIES.filter(c => ["editors-picks", "most-important-today", "most-important-this-week", "most-important-this-month", "most-important-this-year", "hidden-gems", "rising-trends", "future-signals", "global-rankings", "worlds-greatest"].includes(c.slug)),
  },
  { title: "FOOD & CULINARY CULTURE",
  categories: CATEGORIES.filter(c => ["food-culinary-culture", "world-foods", "indian-foods", "traditional-recipes", "food-science", "rare-foods", "culinary-history"].includes(c.slug)),
  },
  { title: "ENGINEERING & INVENTIONS",
  categories: CATEGORIES.filter(c => ["engineering-inventions", "greatest-inventions", "engineering-marvels", "mega-machines", "industrial-innovations", "manufacturing"].includes(c.slug)),
  },
  { title: "LEADERS & ICONS",
  categories: CATEGORIES.filter(c => ["leaders-icons", "world-leaders", "historical-leaders", "scientists", "inventors", "visionaries", "change-makers"].includes(c.slug)),
  },
  { title: "MYTHOLOGY & LEGENDS",
  categories: CATEGORIES.filter(c => ["mythology-legends", "indian-mythology", "greek-mythology", "egyptian-mythology", "folklore", "legends", "ancient-stories"].includes(c.slug)),
  },
  { title: "RARE & EXTRAORDINARY",
  categories: CATEGORIES.filter(c => ["rare-extraordinary", "worlds-rarest-things", "rare-animals", "rare-places", "rare-discoveries", "rare-artifacts"].includes(c.slug)),
  },
  { title: "RANKINGS",
  categories: CATEGORIES.filter(c => ["rankings", "richest-people", "largest-companies", "biggest-cities", "strongest-economies", "tallest-buildings", "greatest-universities"].includes(c.slug)),
  },
  { title: "DATA & VISUAL INTELLIGENCE",
  categories: CATEGORIES.filter(c => ["data-visual-intelligence", "global-statistics", "country-rankings", "economic-data", "population-trends", "climate-data"].includes(c.slug)),
  },
  { title: "WORLD EXPLORER",
  categories: CATEGORIES.filter(c => ["world-explorer", "continents", "asia", "europe", "africa", "north-america", "south-america", "oceania", "antarctica"].includes(c.slug)),
  },
  { title: "STORY EVOLUTION",
  categories: CATEGORIES.filter(c => ["story-evolution"].includes(c.slug)),
  },
];

export const HOMEPAGE_CATEGORIES: Category[] = [
  { slug: "trending-now", label: "Trending Now", description: "", icon: "trending-up" },
  { slug: "discovery", label: "Discovery", description: "", icon: "globe" },
  { slug: "curiosity", label: "Curiosity", description: "", icon: "star" },
  { slug: "success", label: "Success", description: "", icon: "trending-up" },
  { slug: "technology-ai", label: "Technology & AI", description: "", icon: "cpu" },
  { slug: "wildlife", label: "Wildlife", description: "", icon: "paw" },
  { slug: "space", label: "Space", description: "", icon: "globe-2" },
  { slug: "history", label: "History", description: "", icon: "history" },
  { slug: "entertainment", label: "Entertainment", description: "", icon: "film" },
  { slug: "books", label: "Books", description: "", icon: "book-open" },
  { slug: "world", label: "World", description: "", icon: "globe-2" },
  { slug: "future", label: "Future", description: "", icon: "sparkles" },
];

export const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

export function categoryLabel(slug: string): string {
  return CATEGORY_BY_SLUG[slug]?.label ?? slug;
}

const HOMEPAGE_CATEGORY_ALIASES: Record<string, string[]> = {
  success: ["success-stories", "billionaires", "entrepreneurs", "startups", "business-leaders", "wealth-creation"],
  "technology-ai": ["technology", "artificial-intelligence", "robotics", "future-technology", "cybersecurity", "innovation"],
  discovery: ["discovery", "world-discovery", "amazing-places", "hidden-places", "countries", "travel", "exploration", "world"],
  future: ["future", "future-of-ai", "future-of-work", "future-of-education", "future-of-civilization", "future-predictions"],
};

const TRENDING_CATEGORY_ALIASES = new Set([
  "trending-now",
  "breaking-news",
  "viral-stories",
  "most-discussed",
  "most-shared",
  "most-viewed",
  "most-saved",
  "daily-briefing",
  "weekly-highlights",
  "monthly-highlights",
  "editors-picks",
  "most-important-today",
  "most-important-this-week",
  "most-important-this-month",
  "most-important-this-year",
  "hidden-gems",
  "rising-trends",
  "future-signals",
  "global-rankings",
  "worlds-greatest",
]);

export function relatedCategorySlugs(slug?: string): string[] {
  if (!slug || slug === "all") return [];
  if (TRENDING_CATEGORY_ALIASES.has(slug)) return [];
  const section = CATEGORY_SECTIONS.find((s) => s.categories.some((c) => c.slug === slug));
  const related = [slug, ...(HOMEPAGE_CATEGORY_ALIASES[slug] ?? []), ...(section?.categories.map((c) => c.slug) ?? [])];
  return [...new Set(related.filter((s) => s !== "all"))];
}

export const FEATURED_SLOTS: { slot: string; label: string; kicker: string }[] = [
  { slot: "discovery", label: "Discovery of the Day", kicker: "Discovery" },
  { slot: "science", label: "Science Breakthrough", kicker: "Science" },
  { slot: "success", label: "Success Story", kicker: "Success" },
  { slot: "space", label: "From Beyond Earth", kicker: "Space" },
  { slot: "wildlife", label: "Wildlife", kicker: "Wildlife" },
  { slot: "technology", label: "Technology", kicker: "Technology" },
  { slot: "history", label: "History", kicker: "History" },
  { slot: "future", label: "Future Technology", kicker: "Future" },
];

export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  JP: { name: "Japan", flag: "🇯🇵" },
  GR: { name: "Greece", flag: "🇬🇷" },
  IT: { name: "Italy", flag: "🇮🇹" },
  NP: { name: "Nepal", flag: "🇳🇵" },
  AU: { name: "Australia", flag: "🇦🇺" },
  RW: { name: "Rwanda", flag: "🇷🇼" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  KE: { name: "Kenya", flag: "🇰🇪" },
  EC: { name: "Ecuador", flag: "🇪🇨" },
  IN: { name: "India", flag: "🇮🇳" },
  CN: { name: "China", flag: "🇨🇳" },
  BR: { name: "Brazil", flag: "🇧🇷" },
  FR: { name: "France", flag: "🇫🇷" },
  DE: { name: "Germany", flag: "🇩🇪" },
  CA: { name: "Canada", flag: "🇨🇦" },
  ZA: { name: "South Africa", flag: "🇿🇦" },
  MX: { name: "Mexico", flag: "🇲🇽" },
  EG: { name: "Egypt", flag: "🇪🇬" },
};
