export const PROJECT_TEMPLATES = [
  {
    emoji: "👋",
    title: "Build a Mobile Onboarding Flow",
    prompt:
      "Create a multi-screen onboarding flow for a React Native + Expo app. Include a carousel with 3–4 slides, progress dots, Skip and Get Started actions, and a final permissions screen placeholder. Use React Navigation (stack) and theme-aware styles. Keep copy and images as mock placeholders.",
  },
  {
    emoji: "💬",
    title: "Build a Chat Messaging App",
    prompt:
      "Design a mobile chat experience with a conversations list, chat screen, message bubbles, typing indicator, and read receipts using mock data. Include pull-to-refresh, sticky headers by day, and an input bar with send + attachment actions. Use React Navigation (stack) and a clean dark theme.",
  },
  {
    emoji: "🗺️",
    title: "Build a Travel Planner (Mobile)",
    prompt:
      "Create a travel planner app with bottom tabs: Trips, Discover, Profile. In Trips, show upcoming trip cards, checklist items, and a simple day-by-day plan. In Discover, list popular places with images and a map preview placeholder. Use mock data and smooth transitions.",
  },
  {
    emoji: "🏃",
    title: "Build a Fitness Tracker",
    prompt:
      "Build a fitness tracker with an activity dashboard (daily rings), workouts list, and a workout details screen with metrics. Include a start workout CTA (no real sensors), basic charts placeholders, and persistent mock state. Use bottom tabs and theme-aware components.",
  },
  {
    emoji: "🛒",
    title: "Build an E‑Commerce App",
    prompt:
      "Create a shopping app with product grid, product details, cart, and checkout summary screens. Add a favorites list and a mini cart badge in the tab bar. Use mock products and local cart state. Focus on touch targets, safe area spacing, and fluid transitions.",
  },
  {
    emoji: "📝",
    title: "Build a Notes App (Mobile)",
    prompt:
      "Build a notes app with folders list, notes list, note editor screen, and search. Support pinned notes, tags, and basic formatting placeholders. Use local state and mock data; emphasize keyboard handling, smooth list performance, and dark mode.",
  },
  {
    emoji: "💳",
    title: "Build a Personal Finance Tracker",
    prompt:
      "Design a finance tracker with transactions list, categories, monthly budgets, and insights tabs. Include charts placeholders, filters, and an add-transaction flow. Use mock data and ensure performant lists and accessible color choices.",
  },
  {
    emoji: "📚",
    title: "Build a Learning App",
    prompt:
      "Create a learning app with Home (courses grid), Course (lessons list), and Lesson (content + progress) screens. Include continue-watching, download placeholders, and progress tracking with mock state. Use React Navigation (stack + tabs).",
  },
  {
    emoji: "🎧",
    title: "Build a Music Player UI",
    prompt:
      "Build a music app with a library list, Now Playing screen (artwork, scrubber, controls), and a persistent mini-player. Include playlists, queue placeholder, and basic animations. Use dummy audio state only; focus on polished mobile UI/UX.",
  },
] as const;
