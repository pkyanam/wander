/**
 * Wander seed catalog (TypeScript fixture).
 *
 * A small, hand-curated set of evergreen, delightful, safe destinations used to
 * make the discovery loop feel real in development. Per PRD §8 these favour
 * personal sites, creative coding, indie tools, explainers, and demos — and
 * avoid time-sensitive news, paywalled or NSFW content.
 *
 * The seed script (`src/seed.ts`) derives the domain, sets status=`approved`
 * and sourceType=`seed`, and links tags. JSON imports go through the admin
 * import path instead (validated by `catalogImportSchema`).
 */

export interface SeedEntry {
  url: string;
  title: string;
  hook: string;
  summary?: string;
  tags: string[];
  qualityScore: number;
}

export const SEED_CATALOG: SeedEntry[] = [
  {
    url: "https://ciechanow.ski",
    title: "Bartosz Ciechanowski",
    hook: "Interactive essays that make hard ideas finally click.",
    summary:
      "Gorgeous, hand-built explorables on gears, light, GPS, and the mechanics of the physical world.",
    tags: ["science", "learning", "design"],
    qualityScore: 96,
  },
  {
    url: "https://pudding.cool",
    title: "The Pudding",
    hook: "Visual essays that explain culture with data.",
    summary:
      "Playful, rigorous data journalism on everything from pop lyrics to NBA jersey numbers.",
    tags: ["culture", "writing", "design", "technology"],
    qualityScore: 92,
  },
  {
    url: "https://neal.fun",
    title: "Neal.fun",
    hook: "Playful interactive experiments to lose an hour in.",
    summary:
      "Scale of the universe, spend Bill Gates' money, and dozens of other delightful toys.",
    tags: ["weird-internet", "creative-tools", "games"],
    qualityScore: 90,
  },
  {
    url: "https://radio.garden",
    title: "Radio Garden",
    hook: "Spin a globe and tune into live radio anywhere.",
    summary:
      "Drag across a 3D Earth to listen to thousands of local radio stations in real time.",
    tags: ["weird-internet", "culture"],
    qualityScore: 88,
  },
  {
    url: "https://ncase.me",
    title: "Nicky Case",
    hook: "Playable explanations of complex systems.",
    summary:
      "Explorable games about trust, emotions, and how the small pieces of society fit together.",
    tags: ["learning", "games", "weird-internet"],
    qualityScore: 90,
  },
  {
    url: "https://www.quantamagazine.org",
    title: "Quanta Magazine",
    hook: "Beautifully written science and math journalism.",
    summary:
      "Deep, clear reporting on the frontiers of physics, biology, and mathematics.",
    tags: ["science", "writing", "learning"],
    qualityScore: 91,
  },
  {
    url: "https://maggieappleton.com",
    title: "Maggie Appleton",
    hook: "A lush digital garden of essays and sketches.",
    summary:
      "An anthropologist-illustrator's evolving notes on programming, metaphor, and tools for thought.",
    tags: ["indie-web", "writing", "design"],
    qualityScore: 89,
  },
  {
    url: "https://www.themarginalian.org",
    title: "The Marginalian",
    hook: "Maria Popova on art, science, and the search for meaning.",
    summary:
      "A decade-plus of soulful essays drawing connections across literature, philosophy, and life.",
    tags: ["writing", "culture", "learning"],
    qualityScore: 88,
  },
  {
    url: "https://aeon.co",
    title: "Aeon",
    hook: "Big ideas, essays, and provocations.",
    summary:
      "A magazine of deep thinking on philosophy, science, and the human condition.",
    tags: ["writing", "culture", "science"],
    qualityScore: 86,
  },
  {
    url: "https://www.atlasobscura.com",
    title: "Atlas Obscura",
    hook: "The world's hidden wonders and curious places.",
    summary:
      "A growing catalogue of the strange, the overlooked, and the wondrous around the globe.",
    tags: ["culture", "weird-internet", "learning"],
    qualityScore: 87,
  },
  {
    url: "https://archive.org",
    title: "Internet Archive",
    hook: "A free library of the internet's memory.",
    summary:
      "Millions of books, films, songs, and archived web pages — the Wayback Machine lives here.",
    tags: ["culture", "learning", "technology"],
    qualityScore: 90,
  },
  {
    url: "https://www.openculture.com",
    title: "Open Culture",
    hook: "Free courses, films, and cultural treasures.",
    summary:
      "A daily haul of free educational and cultural media from across the web.",
    tags: ["learning", "culture"],
    qualityScore: 84,
  },
  {
    url: "https://www.typewolf.com",
    title: "Typewolf",
    hook: "What's trending in type, curated daily.",
    summary:
      "A sharp eye for typography in the wild, with font pairings and recommendations.",
    tags: ["design"],
    qualityScore: 86,
  },
  {
    url: "https://fontsinuse.com",
    title: "Fonts In Use",
    hook: "Typography in the wild, archived and annotated.",
    summary:
      "An indexed archive of real-world type, sortable by typeface, industry, and format.",
    tags: ["design", "art", "culture"],
    qualityScore: 84,
  },
  {
    url: "https://coolors.co",
    title: "Coolors",
    hook: "Generate gorgeous color palettes in seconds.",
    summary:
      "Hit the spacebar to lock and shuffle colors into a palette you'll actually use.",
    tags: ["design", "creative-tools", "productivity"],
    qualityScore: 85,
  },
  {
    url: "https://www.shadertoy.com",
    title: "Shadertoy",
    hook: "Live-coded shaders that paint with math.",
    summary:
      "A community building hypnotic real-time graphics in nothing but GLSL fragment shaders.",
    tags: ["creative-tools", "technology", "art"],
    qualityScore: 86,
  },
  {
    url: "https://editor.p5js.org",
    title: "p5.js Web Editor",
    hook: "Sketch with code, right in your browser.",
    summary:
      "The friendliest on-ramp to creative coding, built around the p5.js library.",
    tags: ["creative-tools", "art", "learning"],
    qualityScore: 85,
  },
  {
    url: "https://excalidraw.com",
    title: "Excalidraw",
    hook: "A hand-drawn-feeling virtual whiteboard.",
    summary:
      "Sketch diagrams and wireframes that look pleasantly rough, then share them instantly.",
    tags: ["creative-tools", "productivity", "design"],
    qualityScore: 87,
  },
  {
    url: "https://www.tldraw.com",
    title: "tldraw",
    hook: "An infinite collaborative canvas that feels like magic.",
    summary:
      "A delightful, fast whiteboard with uncanny attention to interaction detail.",
    tags: ["creative-tools", "design", "technology"],
    qualityScore: 85,
  },
  {
    url: "https://musiclab.chromeexperiments.com",
    title: "Chrome Music Lab",
    hook: "Make and learn music through play.",
    summary:
      "Hands-on experiments that turn rhythm, harmony, and sound into something you can touch.",
    tags: ["creative-tools", "learning", "games"],
    qualityScore: 86,
  },
  {
    url: "https://www.patatap.com",
    title: "Patatap",
    hook: "A portable animation and sound kit.",
    summary:
      "Press any key to trigger bursts of color and percussion — pure synesthetic joy.",
    tags: ["creative-tools", "art", "weird-internet"],
    qualityScore: 83,
  },
  {
    url: "https://apod.nasa.gov/apod/",
    title: "Astronomy Picture of the Day",
    hook: "A new astronomy photo every single day.",
    summary:
      "NASA's beloved daily image of the cosmos, each with a short expert explanation.",
    tags: ["science", "art", "learning"],
    qualityScore: 89,
  },
  {
    url: "https://earth.nullschool.net",
    title: "earth :: a global map of wind",
    hook: "A living, breathing map of Earth's weather.",
    summary:
      "Mesmerizing real-time visualization of global wind, ocean currents, and temperature.",
    tags: ["science", "technology", "art"],
    qualityScore: 90,
  },
  {
    url: "https://www.solarsystemscope.com",
    title: "Solar System Scope",
    hook: "Fly through a 3D model of the solar system.",
    summary:
      "An interactive orrery of planets, moons, and constellations in real time.",
    tags: ["science", "learning"],
    qualityScore: 82,
  },
  {
    url: "https://mathigon.org",
    title: "Mathigon",
    hook: "A textbook that's actually a playground.",
    summary:
      "Interactive, self-paced courses that make mathematics feel hands-on and alive.",
    tags: ["learning", "science", "design"],
    qualityScore: 87,
  },
  {
    url: "https://distill.pub",
    title: "Distill",
    hook: "Crystal-clear explanations of machine learning.",
    summary:
      "A landmark archive of interactive, rigorously illustrated ML research.",
    tags: ["learning", "science", "technology"],
    qualityScore: 88,
  },
  {
    url: "https://www.nand2tetris.org",
    title: "Nand to Tetris",
    hook: "Build a working computer from first principles.",
    summary:
      "A famous course that takes you from logic gates all the way up to running software.",
    tags: ["learning", "technology"],
    qualityScore: 85,
  },
  {
    url: "https://roadmap.sh",
    title: "roadmap.sh",
    hook: "Visual roadmaps for becoming a developer.",
    summary:
      "Community-built skill trees showing what to learn and in what order.",
    tags: ["technology", "learning", "productivity"],
    qualityScore: 83,
  },
  {
    url: "https://www.are.na",
    title: "Are.na",
    hook: "Collect and connect ideas, quietly.",
    summary:
      "A calm, ad-free space for visual research and building knowledge over time.",
    tags: ["art", "design", "creative-tools", "productivity"],
    qualityScore: 86,
  },
  {
    url: "https://artsandculture.google.com",
    title: "Google Arts & Culture",
    hook: "Explore the world's museums from your couch.",
    summary:
      "Ultra-high-resolution artworks and exhibits from thousands of institutions.",
    tags: ["art", "culture", "learning"],
    qualityScore: 85,
  },
  {
    url: "https://www.metmuseum.org/art/collection",
    title: "The Met Collection",
    hook: "Five thousand years of art, free to browse.",
    summary:
      "Hundreds of thousands of openly accessible works from The Metropolitan Museum of Art.",
    tags: ["art", "culture"],
    qualityScore: 84,
  },
  {
    url: "https://everynoise.com",
    title: "Every Noise at Once",
    hook: "A scannable map of nearly every music genre.",
    summary:
      "An algorithmically generated atlas of music — click any genre to hear it.",
    tags: ["culture", "technology", "weird-internet"],
    qualityScore: 85,
  },
  {
    url: "https://theuselessweb.com",
    title: "The Useless Web",
    hook: "One button to somewhere pointless and perfect.",
    summary:
      "Press the button, get teleported to a gloriously useless corner of the internet.",
    tags: ["weird-internet"],
    qualityScore: 80,
  },
  {
    url: "https://pointerpointer.com",
    title: "Pointer Pointer",
    hook: "It always finds your pointer. Always.",
    summary:
      "Move your mouse anywhere and a photo appears with someone pointing right at it.",
    tags: ["weird-internet"],
    qualityScore: 78,
  },
  {
    url: "https://www.windows93.net",
    title: "Windows 93",
    hook: "A surreal operating system that never shipped.",
    summary:
      "A loving, absurd parody OS packed with hidden apps, games, and jokes.",
    tags: ["weird-internet", "games", "culture"],
    qualityScore: 80,
  },
  {
    url: "https://www.dwitter.net",
    title: "Dwitter",
    hook: "Tiny visual demos in 140 characters of JavaScript.",
    summary:
      "A code-golf community making astonishing animations in a single short line.",
    tags: ["creative-tools", "technology", "weird-internet"],
    qualityScore: 82,
  },
  {
    url: "https://gwern.net",
    title: "gwern.net",
    hook: "Deep, obsessive long-form research essays.",
    summary:
      "Meticulously sourced, endlessly cross-linked writing on statistics, AI, and more.",
    tags: ["writing", "learning", "science"],
    qualityScore: 84,
  },
  {
    url: "https://waitbutwhy.com",
    title: "Wait But Why",
    hook: "Stick-figure deep dives into giant questions.",
    summary:
      "Tim Urban's funny, sprawling explainers on AI, space, and human behavior.",
    tags: ["writing", "learning", "science"],
    qualityScore: 85,
  },
  {
    url: "https://longreads.com",
    title: "Longreads",
    hook: "The best long-form storytelling on the web.",
    summary:
      "Curated and original feature writing worth setting aside real time for.",
    tags: ["writing", "culture"],
    qualityScore: 82,
  },
  {
    url: "https://calmcode.io",
    title: "calmcode",
    hook: "Calm, bite-sized lessons for better code.",
    summary:
      "Short, unhurried video tutorials on Python tools and good engineering habits.",
    tags: ["learning", "technology", "productivity"],
    qualityScore: 83,
  },
  {
    url: "https://www.window-swap.com",
    title: "WindowSwap",
    hook: "Look out of someone else's window, somewhere on Earth.",
    summary:
      "A gentle stream of user-submitted window views from around the world.",
    tags: ["weird-internet", "culture", "art"],
    qualityScore: 84,
  },
  {
    url: "https://asoftmurmur.com",
    title: "A Soft Murmur",
    hook: "Blend ambient sounds to focus or relax.",
    summary:
      "Mix rain, waves, and crackling fire into your own calming soundscape.",
    tags: ["productivity", "creative-tools"],
    qualityScore: 82,
  },
  {
    url: "https://stars.chromeexperiments.com",
    title: "100,000 Stars",
    hook: "A dizzying interactive tour of our galaxy.",
    summary:
      "Zoom from the Sun out to 100,000 nearby stars in a smooth WebGL experience.",
    tags: ["science", "creative-tools", "art"],
    qualityScore: 86,
  },
  {
    url: "https://publicdomainreview.org",
    title: "The Public Domain Review",
    hook: "Curated curiosities from the public domain.",
    summary:
      "Essays and galleries spotlighting forgotten art, books, and oddities now free to all.",
    tags: ["culture", "art", "writing"],
    qualityScore: 85,
  },
  {
    url: "https://solar.lowtechmagazine.com",
    title: "LOW←TECH MAGAZINE",
    hook: "A solar-powered website about sustainable tech.",
    summary:
      "A famously minimal, self-hosted site that goes offline when the sun doesn't shine.",
    tags: ["technology", "design", "culture", "indie-web"],
    qualityScore: 85,
  },
  {
    url: "https://www.csszengarden.com",
    title: "CSS Zen Garden",
    hook: "One page, endless designs — a love letter to CSS.",
    summary:
      "The classic demonstration that the same HTML can become wildly different worlds.",
    tags: ["design", "technology", "indie-web"],
    qualityScore: 80,
  },
  {
    url: "https://oeis.org",
    title: "OEIS",
    hook: "The encyclopedia of integer sequences.",
    summary:
      "Type in a few numbers and discover the deep patterns hiding behind them.",
    tags: ["science", "learning", "weird-internet"],
    qualityScore: 81,
  },
  {
    url: "https://thisissand.com",
    title: "This Is Sand",
    hook: "Pour and paint with falling grains of sand.",
    summary:
      "A meditative toy for building soft, colorful dunes one tap at a time.",
    tags: ["creative-tools", "art", "games", "weird-internet"],
    qualityScore: 80,
  },
  {
    url: "https://www.geoguessr.com",
    title: "GeoGuessr",
    hook: "Get dropped anywhere on Earth and guess where you are.",
    summary:
      "A geography game built on street-level imagery that's equal parts fun and educational.",
    tags: ["games", "culture", "learning"],
    qualityScore: 82,
  },
  {
    url: "https://thecodingtrain.com",
    title: "The Coding Train",
    hook: "Joyful, energetic creative-coding tutorials.",
    summary:
      "Daniel Shiffman's infectious lessons on graphics, simulations, and generative art.",
    tags: ["creative-tools", "learning", "technology"],
    qualityScore: 85,
  },
  {
    url: "https://observablehq.com",
    title: "Observable",
    hook: "Notebooks for data visualization and exploration.",
    summary:
      "A reactive JavaScript notebook environment built for thinking with data.",
    tags: ["technology", "creative-tools", "science"],
    qualityScore: 83,
  },
  {
    url: "https://www.awwwards.com",
    title: "Awwwards",
    hook: "The most beautiful sites on the web, awarded.",
    summary:
      "A daily showcase of cutting-edge web design and interaction craft.",
    tags: ["design", "art", "technology"],
    qualityScore: 81,
  },
  {
    url: "https://wiby.me",
    title: "Wiby",
    hook: "A search engine for the old, personal web.",
    summary:
      "Surfaces classic, lightweight, hand-made pages — hit Surprise Me for a random one.",
    tags: ["indie-web", "weird-internet", "technology"],
    qualityScore: 82,
  },
  {
    url: "https://neocities.org",
    title: "Neocities",
    hook: "Build your own little website, like it's 1999.",
    summary:
      "A thriving community keeping the creative, personal spirit of the early web alive.",
    tags: ["indie-web", "creative-tools", "culture"],
    qualityScore: 83,
  },
];
