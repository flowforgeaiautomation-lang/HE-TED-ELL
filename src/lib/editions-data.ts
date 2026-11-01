export interface EditionBook {
  slug: string;
  editionNumber: number;
  title: string;
  subtitle: string;
  genre: string[];
  description: string;
  fullDescription: string;
  aboutBook: string;
  whatYouWillLearn: string[];
  keyTopics: string[];
  readingLevel: string;
  targetAudience: string[];
  whyRead: string;
  tableOfContents: string[];
  sampleChapters: string[];
  keywords: string[];
  language: string;
  publicationDate: { kindle: string; paperback: string };
  formats: { type: string; available: boolean }[];
  isbn: { kindle?: string; paperback?: string };
  pages: { kindle: string; paperback: string };
  series: string;
  seriesOrder: number;
  amazonLink: string;
  books2ReadLink: string;
  coverImage: string;
  readingTime: string;
  tags: string[];
  collections: string[];
  relatedSlugs: string[];
}

export const AUTHOR = {
  name: "Altair Veda",
  logo: "/THEUH.LOGO.png",
  shortBio:
    "Altair Veda is an author, thinker, and creator of the Powerful Mind Series, a collection of books that explores the hidden dimensions of human potential through practical thinking, self-mastery, and purposeful action.",
  longBio: [
    "Altair Veda believes that every meaningful change begins with a question.",
    "Throughout history, people have searched for better ways to understand the world around them. They have studied science, philosophy, psychology, leadership, and human behavior in the hope of discovering what allows individuals to grow, create, and leave a lasting impact. Yet one question continued to stand out: What truly shapes the human mind?",
    "This curiosity became the foundation of his work.",
    "Instead of viewing intelligence as a single measurable ability, Altair Veda began exploring it as a dynamic system made up of many interconnected forms of thinking. Every decision, invention, conversation, work of art, scientific discovery, and act of leadership seemed to draw upon different mental abilities working together rather than a single talent.",
    "From this exploration emerged one of his central ideas: the Multiverse of Intelligences.",
    "This philosophy suggests that the human mind is not limited to one type of intelligence. Instead, it contains many dimensions that interact continuously, influencing how people observe, learn, solve problems, communicate, create, and lead. Understanding these dimensions allows individuals to become more adaptable, self-aware, and capable of reaching their full potential.",
    "To make these ideas practical, Altair Veda created the Powerful Mind Series, a collection of books designed to help readers strengthen different aspects of the mind through clear explanations, practical systems, reflective exercises, and real-life examples. Each book focuses on a different area of personal growth while remaining connected through the larger philosophy that meaningful success is built by developing multiple mental abilities together.",
    "His writing combines insights from psychology, philosophy, leadership, education, observation, and everyday life, presenting them in language that is accessible to readers from all backgrounds. Rather than encouraging people to simply read, he encourages them to observe, question, practice, and apply what they learn.",
    "For Altair Veda, knowledge is valuable only when it becomes action, and action becomes meaningful only when it is guided by wisdom and purpose.",
    "His vision extends beyond individual success. He believes that when people develop stronger minds, they build stronger families, stronger communities, stronger organizations, and ultimately a better world.",
    "Every book he writes is an invitation to think more deeply, act more intentionally, and contribute something meaningful that lasts beyond one's own lifetime.",
  ],
  philosophy: [
    "I believe the human mind is one of the greatest creations we will ever explore.",
    "Too often, intelligence is reduced to grades, examinations, or a single score. But real life tells a different story. Every invention, every work of art, every scientific breakthrough, every compassionate act, and every courageous decision is the result of many different mental abilities working together.",
    "This understanding inspired the idea of the Multiverse of Intelligences.",
    "Just as the universe contains countless possibilities, the mind contains countless ways of understanding, creating, and solving problems. No single intelligence is enough to navigate the complexity of life. Growth comes from developing multiple forms of thinking and learning how they work together.",
    "I also believe that knowledge carries responsibility. Learning should not end with understanding; it should transform the way we live, the choices we make, and the impact we create.",
    "For me, success is not measured only by achievement but by contribution. A truly educated mind is one that continues to learn, remains humble, acts with integrity, and leaves the world better than it found it.",
    "Every book I write is part of that journey.",
  ],
  penNameStory: [
    "Every name carries meaning.",
    "I chose the name Altair Veda because it represents two ideas that have always inspired the way I think.",
    "Altair is one of the brightest stars visible in the night sky. Throughout history, the stars have guided explorers across oceans and deserts, helping them find direction when everything else seemed uncertain. To me, Altair symbolizes guidance, curiosity, and the courage to keep exploring what is still unknown.",
    "Veda comes from an ancient Sanskrit word meaning knowledge or wisdom. It reflects the pursuit of understanding — not only through information, but through observation, reflection, experience, and thoughtful action.",
    "Together, Altair Veda represents a journey toward enlightened thinking: seeking knowledge with curiosity, applying it with wisdom, and using it to create meaningful change.",
    "The name is also a reminder that learning never truly ends. Every answer opens the door to another question, and every discovery reveals another possibility.",
    "That spirit of continuous exploration is at the heart of everything I write.",
  ],
  mission:
    "To inspire people to understand the hidden potential of the human mind, develop multiple forms of intelligence, and transform knowledge into meaningful action that benefits themselves, others, and future generations.",
  vision:
    "To build a timeless body of knowledge that helps people think more clearly, lead more wisely, create more courageously, and contribute to a world guided by wisdom, ethics, curiosity, and purpose.",
  writingStyle:
    "Clear, reflective, and practical. Altair Veda writes in accessible language that bridges philosophy, psychology, and everyday life, encouraging readers to observe, question, and apply what they learn.",
  topics: [
    "Intelligence",
    "Discipline",
    "Focus",
    "Strategic Thinking",
    "Leadership",
    "Psychology",
    "Personal Growth",
    "Mindset",
    "Productivity",
    "Self-Mastery",
  ],
  quote:
    "Knowledge is valuable only when it becomes action, and action becomes meaningful only when it is guided by wisdom and purpose.",
};

export const BOOKS: EditionBook[] = [
  {
    slug: "the-multiverse-of-intelligence",
    editionNumber: 1,
    title: "The Multiverse of Intelligence",
    subtitle: "12 Mental Powers That Build Powerful Minds",
    genre: ["Personal Development", "Self-Help", "Psychology", "Cognitive Science", "Leadership & Success"],
    description:
      "What if intelligence is far greater than we have ever imagined? The Multiverse of Intelligence introduces a new way of understanding the human mind, exploring twelve essential mental powers that influence how we think, learn, create, solve problems, communicate, and lead.",
    fullDescription:
      "For generations, intelligence has often been reduced to a single number, an IQ score, or academic performance. But real life tells a different story. Every invention, every scientific breakthrough, every work of art, every meaningful conversation, and every great leader depends on multiple forms of intelligence working together.\n\nThe Multiverse of Intelligence introduces a new way of understanding the human mind.\n\nInspired by the idea that just as the universe may contain countless worlds, the human mind contains many interconnected dimensions of intelligence, this book explores twelve essential mental powers that influence how we think, learn, create, solve problems, communicate, and lead.\n\nRather than focusing on only one ability, this book explains how multiple intelligences work together in everyday life. From Deep Thinking and Pattern Recognition to Strategic, Creative, Emotional, and Visionary Intelligence, each chapter helps you understand not only what these intelligences are, but also how they shape your decisions and future.\n\nAlthough this book explores twelve carefully selected dimensions, they represent only the beginning of a much larger framework. The complete Multiverse of Intelligence includes many more forms of intelligence, each revealing another way the human mind understands the world.\n\nWritten in simple language with practical examples, reflection exercises, and real-life applications, this book is designed for students, professionals, leaders, creators, entrepreneurs, educators, and lifelong learners who want to strengthen their thinking beyond conventional limits.\n\nThis is not simply a book about becoming smarter. It is a guide to understanding the hidden powers already working within your mind — and learning how to develop them into lifelong strengths.",
    aboutBook:
      "The Multiverse of Intelligence is the foundational book of the Powerful Mind Series. It reframes intelligence as a vast, interconnected system rather than a single metric, offering readers twelve practical mental powers to develop. Each chapter combines theory, reflection exercises, and real-world applications to help readers build a stronger, more adaptable mind.",
    whatYouWillLearn: [
      "Understand intelligence beyond IQ.",
      "Think more deeply before making decisions.",
      "Recognize hidden patterns in everyday life.",
      "Improve concentration and mental clarity.",
      "Strengthen memory naturally.",
      "Develop lifelong curiosity.",
      "Build emotional awareness and resilience.",
      "Think strategically before acting.",
      "Make confident decisions under uncertainty.",
      "Observe details most people overlook.",
      "Learn new skills faster.",
      "Unlock creative thinking.",
      "Develop a long-term vision for life and leadership.",
    ],
    keyTopics: [
      "Multiple Intelligences",
      "Human Intelligence",
      "Critical Thinking",
      "Deep Thinking",
      "Pattern Recognition",
      "Focus",
      "Memory",
      "Curiosity",
      "Emotional Intelligence",
      "Strategic Thinking",
      "Decision Making",
      "Observation",
      "Learning",
      "Creativity",
      "Visionary Thinking",
      "Leadership",
      "Personal Growth",
      "Mindset",
      "Self Development",
      "Psychology",
    ],
    readingLevel:
      "Suitable for high school students, university students, professionals, entrepreneurs, educators, leaders, and lifelong learners. No prior knowledge of psychology or neuroscience is required. Written in clear, simple, and accessible English.",
    targetAudience: [
      "Students who want to improve the way they learn.",
      "Professionals seeking better decision-making and problem-solving skills.",
      "Entrepreneurs looking to think strategically and creatively.",
      "Teachers and educators interested in different ways people learn.",
      "Leaders who want to understand themselves and others more effectively.",
      "Readers passionate about psychology, self-development, and lifelong learning.",
      "Anyone curious about unlocking hidden mental potential.",
    ],
    whyRead:
      "Most books discuss one aspect of intelligence. This book introduces a broader perspective. It presents intelligence as an interconnected system where many mental abilities work together rather than existing independently. By understanding these dimensions, readers gain practical tools to improve thinking, learning, communication, creativity, leadership, and everyday decision-making. The ideas are presented in an easy-to-understand style, supported by practical exercises and relatable examples that encourage immediate application.",
    tableOfContents: [
      "Introduction: The Multiverse of Intelligence",
      "Chapter 1: Deep Thinking",
      "Chapter 2: Pattern Recognition",
      "Chapter 3: Focus and Attention",
      "Chapter 4: Memory and Recall",
      "Chapter 5: Curiosity and Exploration",
      "Chapter 6: Emotional Intelligence",
      "Chapter 7: Strategic Thinking",
      "Chapter 8: Decision Making",
      "Chapter 9: Observation",
      "Chapter 10: Learning and Adaptability",
      "Chapter 11: Creative Intelligence",
      "Chapter 12: Visionary Thinking",
      "Conclusion: Building a Powerful Mind",
    ],
    sampleChapters: [
      "Introduction: The Multiverse of Intelligence",
      "Chapter 1: Deep Thinking",
      "Chapter 6: Emotional Intelligence",
    ],
    keywords: [
      "intelligence",
      "multiple intelligences",
      "mental powers",
      "cognitive science",
      "thinking",
      "learning",
      "creativity",
      "leadership",
      "personal development",
      "self-help",
      "psychology",
      "mindset",
    ],
    language: "English",
    publicationDate: { kindle: "March 19, 2026", paperback: "April 1, 2026" },
    formats: [
      { type: "Kindle Edition", available: true },
      { type: "Paperback", available: true },
      { type: "Hardcover", available: false },
      { type: "Audiobook", available: false },
    ],
    isbn: { kindle: undefined, paperback: undefined },
    pages: { kindle: "Digital Edition", paperback: "Available on Amazon" },
    series: "Powerful Mind Series",
    seriesOrder: 1,
    amazonLink: "https://www.amazon.com/Multiverse-Intelligence-Mental-Powers-Powerful-ebook/dp/B0GT64Y8JR?ref_=saga_dp_bnx_mbl_dp",
    books2ReadLink: "https://books2read.com",
    coverImage: "/images/covers/file_00000000e4f881fa88b50e9044984741.png",
    readingTime: "6 hours",
    tags: ["Intelligence", "Psychology", "Self-Help", "Leadership", "Cognitive Science"],
    collections: ["Mental Power", "Psychology", "Mindset", "Learning", "Thinking"],
    relatedSlugs: ["the-discipline-code", "focus", "strategic-thinking", "the-future-leader-mindset"],
  },
  {
    slug: "the-discipline-code",
    editionNumber: 2,
    title: "The Discipline Code",
    subtitle: "Mastering Self-Control for Success",
    genre: ["Personal Development", "Self-Help", "Productivity", "Success", "Psychology"],
    description:
      "Success is rarely determined by talent alone. It is built by discipline. The Discipline Code explores one of the most important skills anyone can develop: self-control — presented as a lifelong system that can be built, strengthened, and sustained.",
    fullDescription:
      "Success is rarely determined by talent alone. It is built by discipline.\n\nEvery meaningful achievement begins with a choice — the choice to stay committed even when motivation fades. While inspiration comes and goes, discipline creates consistency, and consistency shapes extraordinary results.\n\nThe Discipline Code explores one of the most important skills anyone can develop: self-control.\n\nRather than relying on temporary motivation, this book presents discipline as a lifelong system that can be built, strengthened, and sustained. Through practical principles, real-life examples, reflection exercises, and actionable strategies, readers learn how to replace procrastination with action, overcome distractions, build productive habits, and remain committed to their goals.\n\nWhether you want to improve your studies, career, business, health, or personal life, discipline provides the foundation upon which every lasting success is built.\n\nWritten in clear, practical language, this book is designed for students, professionals, entrepreneurs, leaders, and lifelong learners who want to develop the habits and mindset required for consistent growth.\n\nDiscipline is not about becoming perfect. It is about becoming the kind of person who continues moving forward, even when progress feels difficult.",
    aboutBook:
      "The Discipline Code is the second book in the Powerful Mind Series. It reframes discipline not as rigid self-denial but as a sustainable, lifelong system. Through practical principles, reflection exercises, and real-world strategies, it teaches readers how to replace procrastination with action, overcome distractions, and build habits that lead to lasting success.",
    whatYouWillLearn: [
      "Build lasting self-discipline.",
      "Develop powerful daily habits.",
      "Overcome procrastination.",
      "Improve consistency and commitment.",
      "Strengthen self-control.",
      "Stay productive without relying on motivation.",
      "Manage distractions effectively.",
      "Build resilience during difficult times.",
      "Create routines that support long-term success.",
      "Develop the mindset of highly disciplined individuals.",
    ],
    keyTopics: [
      "Self-Discipline",
      "Self-Control",
      "Productivity",
      "Habits",
      "Consistency",
      "Motivation",
      "Time Management",
      "Goal Setting",
      "Focus",
      "Mental Strength",
      "Personal Growth",
      "Success",
      "Mindset",
      "Resilience",
      "Daily Routines",
      "Achievement",
      "Self-Improvement",
      "Life Skills",
    ],
    readingLevel:
      "Suitable for high school students, university students, professionals, entrepreneurs, leaders, and anyone seeking personal growth. Written in simple, practical, and easy-to-understand English.",
    targetAudience: [
      "Students preparing for academic success.",
      "Professionals aiming to improve productivity.",
      "Entrepreneurs building consistent routines.",
      "Individuals struggling with procrastination.",
      "Readers interested in self-improvement and psychology.",
      "Anyone who wants to transform motivation into lifelong discipline.",
    ],
    whyRead:
      "Many books tell you to stay motivated. This book teaches you something more powerful: how to build a system that works even when motivation disappears. By combining practical strategies, psychological insights, reflection exercises, and real-world applications, The Discipline Code helps readers develop the consistency, resilience, and self-control needed to achieve meaningful goals. Rather than offering quick fixes, it provides a practical framework for creating habits that last a lifetime.",
    tableOfContents: [
      "Introduction: The Power of Discipline",
      "Chapter 1: Understanding Self-Control",
      "Chapter 2: The Myth of Motivation",
      "Chapter 3: Building Daily Habits",
      "Chapter 4: Overcoming Procrastination",
      "Chapter 5: Managing Distractions",
      "Chapter 6: Consistency and Commitment",
      "Chapter 7: Resilience in Difficult Times",
      "Chapter 8: Routines for Long-Term Success",
      "Chapter 9: The Mindset of Discipline",
      "Conclusion: Becoming the Person Who Moves Forward",
    ],
    sampleChapters: [
      "Introduction: The Power of Discipline",
      "Chapter 2: The Myth of Motivation",
      "Chapter 4: Overcoming Procrastination",
    ],
    keywords: [
      "discipline",
      "self-control",
      "productivity",
      "habits",
      "consistency",
      "success",
      "procrastination",
      "motivation",
      "self-improvement",
      "personal development",
    ],
    language: "English",
    publicationDate: { kindle: "March 18, 2026", paperback: "April 2026" },
    formats: [
      { type: "Kindle Edition", available: true },
      { type: "Paperback", available: true },
      { type: "Hardcover", available: false },
      { type: "Audiobook", available: false },
    ],
    isbn: { kindle: undefined, paperback: undefined },
    pages: { kindle: "Digital Edition", paperback: "Available on Amazon" },
    series: "Powerful Mind Series",
    seriesOrder: 2,
    amazonLink: "https://www.amazon.com/Discipline-Code-Mastering-Control-Powerful-ebook/dp/B0GT1JDZMN?ref_=saga_dp_bnx_mbl_dp",
    books2ReadLink: "https://books2read.com",
    coverImage: "/images/covers/file_00000000f39482079920190790028d30.png",
    readingTime: "5 hours",
    tags: ["Discipline", "Productivity", "Habits", "Success", "Self-Control"],
    collections: ["Mental Power", "Productivity", "Success", "Focus", "Mindset"],
    relatedSlugs: ["the-multiverse-of-intelligence", "focus", "strategic-thinking", "the-future-leader-mindset"],
  },
  {
    slug: "focus",
    editionNumber: 3,
    title: "Focus",
    subtitle: "Mental Clarity, Productivity, and Mastering Attention",
    genre: ["Personal Development", "Self-Help", "Productivity", "Psychology", "Success"],
    description:
      "Your attention is your greatest asset. Where it goes, your future follows. Focus is a practical guide to developing deep concentration, improving productivity, and building the mental clarity needed to perform at your best.",
    fullDescription:
      "Your attention is your greatest asset. Where it goes, your future follows.\n\nIn a world filled with constant notifications, endless information, and daily distractions, the ability to focus has become one of the rarest and most valuable skills. Success today is no longer determined only by knowledge or talent — it is determined by how well you can direct your attention toward what truly matters.\n\nFocus is a practical guide to developing deep concentration, improving productivity, and building the mental clarity needed to perform at your best.\n\nThrough practical techniques, scientific insights, real-life examples, and simple exercises, this book teaches you how to eliminate distractions, strengthen your attention span, overcome procrastination, manage mental fatigue, and create habits that support sustained focus.\n\nWhether you are preparing for examinations, building a career, growing a business, or pursuing personal goals, learning to focus allows you to accomplish more in less time while producing higher-quality work.\n\nWritten in simple, accessible language, this book is designed for students, professionals, entrepreneurs, creators, leaders, and lifelong learners who want to unlock their full mental potential.\n\nFocus is more than concentrating for a few minutes. It is the ability to direct your mind with intention, remain present, and consistently invest your energy where it creates the greatest impact.",
    aboutBook:
      "Focus is the third book in the Powerful Mind Series. It addresses the modern epidemic of distraction and provides a complete, practical system for developing deep concentration. Through scientific insights, real-life examples, and actionable exercises, readers learn to eliminate distractions, strengthen attention, manage mental fatigue, and build habits that sustain focus over a lifetime.",
    whatYouWillLearn: [
      "Develop deep concentration and mental clarity.",
      "Eliminate distractions from your environment and mind.",
      "Strengthen your attention span over time.",
      "Overcome procrastination through focused action.",
      "Manage mental fatigue and avoid burnout.",
      "Create habits that support sustained focus.",
      "Improve productivity and produce higher-quality work.",
      "Direct your attention with intention.",
      "Remain present and engaged in the moment.",
      "Invest your energy where it creates the greatest impact.",
    ],
    keyTopics: [
      "Focus",
      "Attention",
      "Concentration",
      "Productivity",
      "Mental Clarity",
      "Distraction Management",
      "Deep Work",
      "Procrastination",
      "Mental Fatigue",
      "Habits",
      "Mindfulness",
      "Personal Growth",
      "Success",
      "Psychology",
      "Self-Improvement",
    ],
    readingLevel:
      "Suitable for students, professionals, entrepreneurs, creators, leaders, and lifelong learners. Written in simple, accessible English with no prior knowledge required.",
    targetAudience: [
      "Students preparing for examinations.",
      "Professionals building a career.",
      "Entrepreneurs growing a business.",
      "Creators seeking deeper engagement with their work.",
      "Leaders managing complex responsibilities.",
      "Anyone pursuing personal goals who wants to accomplish more with less distraction.",
    ],
    whyRead:
      "In an age of endless distraction, focus has become a superpower. This book goes beyond tips and tricks to provide a complete system for mastering attention. It combines scientific insights with practical exercises, helping readers build the mental clarity and deep concentration needed to thrive in a noisy world. Rather than offering temporary hacks, it teaches lasting habits that transform how you direct your energy.",
    tableOfContents: [
      "Introduction: The Age of Distraction",
      "Chapter 1: Understanding Attention",
      "Chapter 2: The Science of Focus",
      "Chapter 3: Eliminating Distractions",
      "Chapter 4: Strengthening Your Attention Span",
      "Chapter 5: Overcoming Procrastination",
      "Chapter 6: Managing Mental Fatigue",
      "Chapter 7: Habits for Sustained Focus",
      "Chapter 8: Deep Work and Flow",
      "Chapter 9: Presence and Intention",
      "Conclusion: Directing Your Mind",
    ],
    sampleChapters: [
      "Introduction: The Age of Distraction",
      "Chapter 1: Understanding Attention",
      "Chapter 5: Overcoming Procrastination",
    ],
    keywords: [
      "focus",
      "attention",
      "concentration",
      "productivity",
      "mental clarity",
      "distraction",
      "deep work",
      "procrastination",
      "mindfulness",
      "personal development",
    ],
    language: "English",
    publicationDate: { kindle: "March 23, 2026", paperback: "April 1, 2026" },
    formats: [
      { type: "Kindle Edition", available: true },
      { type: "Paperback", available: true },
      { type: "Hardcover", available: false },
      { type: "Audiobook", available: false },
    ],
    isbn: { kindle: undefined, paperback: undefined },
    pages: { kindle: "Digital Edition", paperback: "Available on Amazon" },
    series: "Powerful Mind Series",
    seriesOrder: 3,
    amazonLink: "https://www.amazon.com/Focus-productivity-mastering-attention-Powerful-ebook/dp/B0GTMLW51Q?ref_=saga_dp_bnx_mbl_dp",
    books2ReadLink: "https://books2read.com",
    coverImage: "/images/covers/file_00000000bf8c81fab4900f65cb142b47.png",
    readingTime: "5 hours",
    tags: ["Focus", "Productivity", "Attention", "Mental Clarity", "Psychology"],
    collections: ["Mental Power", "Productivity", "Focus", "Success", "Mindset"],
    relatedSlugs: ["the-multiverse-of-intelligence", "the-discipline-code", "strategic-thinking", "the-future-leader-mindset"],
  },
  {
    slug: "strategic-thinking",
    editionNumber: 4,
    title: "Strategic Thinking",
    subtitle: "Planning, Decision-Making, and Thinking Ahead Like Leaders",
    genre: ["Personal Development", "Self-Help", "Leadership", "Business", "Psychology"],
    description:
      "Strategic Thinking is a practical guide to planning, decision-making, and thinking ahead like leaders. Through clear frameworks, real-world examples, and reflective exercises, it teaches readers how to anticipate, adapt, and act with long-term vision.",
    fullDescription:
      "The future belongs to those who learn to think ahead.\n\nStrategic thinking is not reserved for generals, CEOs, or political leaders. It is a skill that anyone can develop — a way of approaching decisions, problems, and opportunities with foresight, clarity, and purpose.\n\nStrategic Thinking is a practical guide to planning, decision-making, and thinking ahead like leaders.\n\nThrough clear frameworks, real-world examples, and reflective exercises, this book teaches readers how to anticipate challenges before they arrive, evaluate options with discipline, adapt to changing circumstances, and make decisions that align with long-term goals rather than short-term impulses.\n\nYou will learn how to think in systems, recognize patterns, weigh trade-offs, and develop the kind of mental flexibility that allows leaders to navigate uncertainty with confidence.\n\nWhether you are leading a team, building a business, managing a project, or simply directing your own life with greater intention, strategic thinking provides the foundation for choices that stand the test of time.\n\nWritten in clear, accessible language, this book is designed for students, professionals, entrepreneurs, leaders, and lifelong learners who want to develop the mindset of a strategist.\n\nStrategy is not about predicting the future with certainty. It is about preparing for it with wisdom.",
    aboutBook:
      "Strategic Thinking is the fourth book in the Powerful Mind Series. It teaches readers how to approach decisions, problems, and opportunities with foresight and clarity. Through clear frameworks, real-world examples, and reflective exercises, it builds the mental habits needed to anticipate, adapt, and act with long-term vision — the essential mindset of effective leaders.",
    whatYouWillLearn: [
      "Think ahead and anticipate challenges.",
      "Evaluate options with discipline and clarity.",
      "Adapt to changing circumstances.",
      "Make decisions aligned with long-term goals.",
      "Think in systems and recognize patterns.",
      "Weigh trade-offs effectively.",
      "Develop mental flexibility for uncertainty.",
      "Navigate complex situations with confidence.",
      "Build the mindset of a strategist.",
      "Apply strategic thinking to everyday life and leadership.",
    ],
    keyTopics: [
      "Strategic Thinking",
      "Planning",
      "Decision Making",
      "Leadership",
      "Foresight",
      "Systems Thinking",
      "Pattern Recognition",
      "Adaptability",
      "Problem Solving",
      "Long-Term Vision",
      "Trade-offs",
      "Mental Flexibility",
      "Business Strategy",
      "Personal Growth",
      "Psychology",
    ],
    readingLevel:
      "Suitable for students, professionals, entrepreneurs, leaders, and lifelong learners. Written in clear, accessible English with no prior business knowledge required.",
    targetAudience: [
      "Professionals seeking better decision-making skills.",
      "Entrepreneurs building and growing businesses.",
      "Leaders managing teams and complex projects.",
      "Students preparing for careers in business or leadership.",
      "Anyone who wants to approach life with greater foresight and intention.",
    ],
    whyRead:
      "Most people react. Strategists anticipate. This book teaches the difference. Rather than presenting strategy as an abstract theory, it provides practical frameworks, real-world examples, and reflective exercises that build the habit of thinking ahead. Readers learn to navigate uncertainty with confidence, make decisions that align with long-term goals, and develop the mental flexibility that distinguishes effective leaders from the rest.",
    tableOfContents: [
      "Introduction: The Mind of a Strategist",
      "Chapter 1: What Is Strategic Thinking?",
      "Chapter 2: Thinking Ahead",
      "Chapter 3: Systems and Patterns",
      "Chapter 4: Evaluating Options",
      "Chapter 5: Trade-offs and Priorities",
      "Chapter 6: Adapting to Change",
      "Chapter 7: Decisions Under Uncertainty",
      "Chapter 8: Long-Term Vision",
      "Chapter 9: Strategy in Everyday Life",
      "Conclusion: Thinking Like a Leader",
    ],
    sampleChapters: [
      "Introduction: The Mind of a Strategist",
      "Chapter 1: What Is Strategic Thinking?",
      "Chapter 4: Evaluating Options",
    ],
    keywords: [
      "strategic thinking",
      "planning",
      "decision making",
      "leadership",
      "foresight",
      "systems thinking",
      "problem solving",
      "business strategy",
      "personal development",
      "self-help",
    ],
    language: "English",
    publicationDate: { kindle: "March 2026", paperback: "April 2026" },
    formats: [
      { type: "Kindle Edition", available: true },
      { type: "Paperback", available: true },
      { type: "Hardcover", available: false },
      { type: "Audiobook", available: false },
    ],
    isbn: { kindle: undefined, paperback: undefined },
    pages: { kindle: "Digital Edition", paperback: "Available on Amazon" },
    series: "Powerful Mind Series",
    seriesOrder: 4,
    amazonLink: "https://www.amazon.com/Strategic-Thinking-Planning-Decision-Making-Powerful-ebook/dp/B0GTMQ7B6Z?ref_=saga_dp_bnx_mbl_dp",
    books2ReadLink: "https://books2read.com",
    coverImage: "/images/covers/file_0000000016fc81fabea25db6e7af5a65.png",
    readingTime: "5 hours",
    tags: ["Strategy", "Leadership", "Decision Making", "Planning", "Business"],
    collections: ["Mental Power", "Leadership", "Strategy", "Success", "Thinking"],
    relatedSlugs: ["the-multiverse-of-intelligence", "the-discipline-code", "focus", "the-future-leader-mindset"],
  },
  {
    slug: "the-future-leader-mindset",
    editionNumber: 5,
    title: "The Future Leader Mindset",
    subtitle: "Leadership, Influence, Vision, and Creating Impact",
    genre: ["Personal Development", "Self-Help", "Leadership", "Business", "Success"],
    description:
      "The Future Leader Mindset explores what it means to lead with vision, influence, and integrity in a rapidly changing world. It is a practical guide for anyone who wants to create meaningful impact through leadership.",
    fullDescription:
      "Leadership is not a title. It is a way of thinking.\n\nIn a world that is changing faster than ever, the leaders who matter are not those who cling to old models of authority. They are the ones who learn to think differently — to lead with vision, influence, integrity, and a deep sense of purpose.\n\nThe Future Leader Mindset explores what it means to lead with vision, influence, and integrity in a rapidly changing world.\n\nThis book is a practical guide for anyone who wants to create meaningful impact through leadership. Through clear principles, real-world examples, and reflective exercises, it teaches readers how to develop the mindset, skills, and character needed to inspire others, navigate complexity, and build a legacy that lasts.\n\nYou will learn how to cultivate self-awareness, communicate with clarity, make ethical decisions under pressure, build trust, and lead with both confidence and humility. The book also explores the future of leadership — how technology, globalization, and shifting social values are reshaping what it means to lead.\n\nWhether you are leading a team, an organization, a community, or simply your own life with greater intention, The Future Leader Mindset provides the foundation for leadership that is both effective and deeply human.\n\nWritten in clear, accessible language, this book is designed for students, professionals, entrepreneurs, educators, and lifelong learners who aspire to lead with purpose.\n\nThe future will not be shaped by those who wait for permission. It will be shaped by those who learn to lead.",
    aboutBook:
      "The Future Leader Mindset is the fifth book in the Powerful Mind Series. It redefines leadership for a changing world, teaching readers how to lead with vision, influence, integrity, and purpose. Through clear principles, real-world examples, and reflective exercises, it builds the mindset, skills, and character needed to inspire others, navigate complexity, and create lasting impact.",
    whatYouWillLearn: [
      "Develop the mindset of a future-ready leader.",
      "Lead with vision, influence, and integrity.",
      "Cultivate self-awareness and emotional intelligence.",
      "Communicate with clarity and purpose.",
      "Make ethical decisions under pressure.",
      "Build trust and inspire others.",
      "Navigate complexity and change.",
      "Lead with both confidence and humility.",
      "Understand how technology and globalization reshape leadership.",
      "Create meaningful, lasting impact through leadership.",
    ],
    keyTopics: [
      "Leadership",
      "Influence",
      "Vision",
      "Integrity",
      "Purpose",
      "Self-Awareness",
      "Emotional Intelligence",
      "Communication",
      "Ethical Decision Making",
      "Trust",
      "Change Management",
      "Future of Leadership",
      "Impact",
      "Personal Growth",
      "Success",
    ],
    readingLevel:
      "Suitable for students, professionals, entrepreneurs, educators, and lifelong learners who aspire to lead with purpose. Written in clear, accessible English.",
    targetAudience: [
      "Aspiring and current leaders at any level.",
      "Entrepreneurs building organizations with purpose.",
      "Professionals stepping into management or leadership roles.",
      "Educators shaping the next generation of leaders.",
      "Anyone who wants to lead their own life with greater intention and impact.",
    ],
    whyRead:
      "Leadership is changing. The old models of authority and control no longer suffice in a world defined by complexity, technology, and shifting values. This book provides a fresh, practical framework for leading with vision, integrity, and purpose. Through real-world examples and reflective exercises, it builds the inner qualities — self-awareness, trust, ethical clarity — that distinguish leaders who create lasting impact from those who merely hold positions.",
    tableOfContents: [
      "Introduction: The Future of Leadership",
      "Chapter 1: Leadership as a Mindset",
      "Chapter 2: Vision and Purpose",
      "Chapter 3: Self-Awareness",
      "Chapter 4: Influence and Communication",
      "Chapter 5: Ethical Decision Making",
      "Chapter 6: Building Trust",
      "Chapter 7: Navigating Complexity and Change",
      "Chapter 8: Confidence and Humility",
      "Chapter 9: The Future of Leadership",
      "Conclusion: Creating Lasting Impact",
    ],
    sampleChapters: [
      "Introduction: The Future of Leadership",
      "Chapter 1: Leadership as a Mindset",
      "Chapter 5: Ethical Decision Making",
    ],
    keywords: [
      "leadership",
      "influence",
      "vision",
      "future leader",
      "impact",
      "integrity",
      "purpose",
      "self-awareness",
      "emotional intelligence",
      "personal development",
    ],
    language: "English",
    publicationDate: { kindle: "March 2026", paperback: "April 2026" },
    formats: [
      { type: "Kindle Edition", available: true },
      { type: "Paperback", available: true },
      { type: "Hardcover", available: false },
      { type: "Audiobook", available: false },
    ],
    isbn: { kindle: undefined, paperback: undefined },
    pages: { kindle: "Digital Edition", paperback: "Available on Amazon" },
    series: "Powerful Mind Series",
    seriesOrder: 5,
    amazonLink: "https://www.amazon.com/Future-Leader-Mindset-Influence-Powerful-ebook/dp/B0GTMNLQ5H?ref_=saga_dp_bnx_mbl_dp",
    books2ReadLink: "https://books2read.com",
    coverImage: "/images/covers/file_000000008b4081faa4906c5fef6e1154.png",
    readingTime: "5 hours",
    tags: ["Leadership", "Vision", "Influence", "Impact", "Future"],
    collections: ["Leadership", "Mental Power", "Success", "Mindset", "Strategy"],
    relatedSlugs: ["the-multiverse-of-intelligence", "the-discipline-code", "focus", "strategic-thinking"],
  },
];

export const COLLECTIONS = [
  "Mental Power",
  "Leadership",
  "Psychology",
  "Success",
  "Productivity",
  "Thinking",
  "Learning",
  "Mindset",
  "Future",
  "Strategy",
  "Focus",
  "Discipline",
];

export function getBookBySlug(slug: string): EditionBook | undefined {
  return BOOKS.find((b) => b.slug === slug);
}

export function getRelatedBooks(slug: string): EditionBook[] {
  const book = getBookBySlug(slug);
  if (!book) return [];
  return book.relatedSlugs
    .map((s) => getBookBySlug(s))
    .filter((b): b is EditionBook => !!b);
}

export function searchEditions(query: string): EditionBook[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return BOOKS.filter((b) => {
    return (
      b.title.toLowerCase().includes(q) ||
      b.subtitle.toLowerCase().includes(q) ||
      b.genre.some((g) => g.toLowerCase().includes(q)) ||
      b.keywords.some((k) => k.toLowerCase().includes(q)) ||
      b.tags.some((t) => t.toLowerCase().includes(q)) ||
      b.collections.some((c) => c.toLowerCase().includes(q)) ||
      b.description.toLowerCase().includes(q) ||
      AUTHOR.name.toLowerCase().includes(q)
    );
  });
}
