/* Every user-visible string lives here so copy can be swapped without touching layout. */
window.CONTENT = {
  brand: "ChatGPT",

  links: {
    pricing: "https://openai.com/chatgpt/pricing/",
    help: "https://help.openai.com/",
    terms: "https://openai.com/policies/terms-of-use/",
    privacy: "https://openai.com/policies/privacy-policy/",
  },

  home: {
    heading: "Where should we begin?",
    headingMobile: "What are you working on?",
    placeholder: "Ask ChatGPT",
    suggestions: ["What can you do?"],
    nav: [
      { label: "New chat", icon: "new-chat", href: "app.html" },
      { label: "Images", icon: "images", href: "app.html#/images" },
      { label: "Plugins", icon: "plugins", href: "app.html#/plugins" },
      { label: "See plans and pricing", icon: "plans", href: "https://openai.com/chatgpt/pricing/", external: true },
      { label: "Help", icon: "help", href: "https://help.openai.com/", external: true },
      { label: "Deep research", icon: "deep-research", href: "app.html#/research" },
      { label: "Settings", icon: "settings", href: "app.html#/settings" },
    ],
    promo: {
      title: "Get responses tailored to you",
      body: "Log in to get answers based on saved chats, plus create images and upload files.",
      cta: "Log in",
    },
    footer: {
      before: "ChatGPT is AI. By using it, you agree to our ",
      terms: "Terms",
      middle: " & ",
      privacy: "Privacy Policy",
      after:
        ". Chats may be reviewed and used to improve our AI models. ",
      learn: "Learn more",
    },
  },

  auth: {
    wordmark: "ChatGPT",
    title: "Log in or sign up",
    signupTitle: "Create an account",
    social: [
      { label: "Continue with Google", icon: null, mark: "G" },
      { label: "Continue with Apple", icon: "apple" },
      { label: "Continue with phone", icon: "phone" },
    ],
    divider: "OR",
    emailPlaceholder: "Email address",
    continue: "Continue",
    passwordTitle: "Enter your password",
    signupPasswordTitle: "Create a password",
    passwordPlaceholder: "Password",
    passwordHint: "Your password must be at least 10 characters long.",
    passwordCta: "Continue",
    forgot: "Forgot password?",
    back: "Back",
    noAccount: "Don't have an account? ",
    haveAccount: "Already have an account? ",
    signupLink: "Sign up",
    loginLink: "Log in",
    legal: { terms: "Terms of use", privacy: "Privacy policy", cookies: "Cookie preferences" },
    errors: {
      email: "Enter a valid email address.",
      password: "Your password must be at least 10 characters long.",
    },
  },

  app: {
    nav: [
      { label: "Scheduled", icon: "clock", href: "#/scheduled" },
      { label: "Library", icon: "library", href: "#/library" },
      { label: "Plugins", icon: "plugins", href: "#/plugins" },
      { label: "Explore", icon: "explore", href: "#/gpts", explore: true },
    ],
    profile: { name: "Moralta?", plan: "Go", initials: "MO" },
    chatsLabel: "Recents",
    projectsLabel: "Projects",
    noProjects: "No projects",

    home: {
      greeting: "What’s on your mind today?",
      placeholder: "Ask ChatGPT",
      think: "Think",
      suggestions: [
        { label: "Create an image", icon: "images" },
        { label: "Write or edit", icon: "pencil" },
        { label: "Search the web", icon: "globe" },
      ],
      temporaryChat: "Temporary chat",
      hint: "ChatGPT can make mistakes. Check important info.",
    },

    seed: {
      titles: [
        "DeepSeek Model Comparison",
        "Fix Next Command Error",
        "Hugging Face Model Compatibility",
        "Fix Homebrew Permissions",
        "Fix Windows Update Error",
        "School Update",
        "Simplify square root expression",
        "Greeting exchange",
        "Greeting exchange",
        "Find Enhancements Tab",
        "Story Games Ranking",
        "Warranty Delivery Status",
        "Create Racing Game",
        "Create 3D Racing Game",
      ],
      message:
        "This conversation is a visual sample in the ChatGPT replica. Type below to add a new message; replies stream from your own API key when one is configured on the server.",
    },

    library: {
      title: "Library",
      searchPlaceholder: "Search library",
      newLabel: "New",
      tabs: ["Suggested", "Favorites", "Folders", "Images", "All"],
      files: [
        { name: "jobSheet.pdf", kind: "pdf" },
        { name: "neon_apex_3d_racing.html", kind: "globe" },
        { name: "", kind: "blank" },
        { name: "SKILL.md", kind: "doc" },
        { name: "", kind: "blank" },
        { name: "", kind: "blank" },
        { name: "neon_apex_racing.html", kind: "globe" },
        { name: "7eab86b4-05e7-4f1d-815b-6c26ad0975124300299518406609389", kind: "file" },
        { name: "", kind: "blank" },
        { name: "NoteGPT_Detector_1780932934095.pdf", kind: "pdf" },
        { name: "NoteGPT_Detector_1780932783839.pdf", kind: "pdf" },
        { name: "", kind: "blank" },
      ],
    },

    scheduled: {
      title: "Scheduled",
      subtitle: "Ask ChatGPT to schedule tasks, set reminders, or monitor for updates",
      filter: "Active",
      placeholder: "Schedule a task",
      recommended: "Recommended",
      items: [
        { emoji: "📰", title: "News updates", desc: "Send me a daily roundup of news on topics I care about." },
        { emoji: "📧", title: "Email monitor", desc: "Scan my emails and let me know anything that needs my attention" },
        { emoji: "📖", title: "Find weekend reads", desc: "Send me a great article to read every Saturday." },
        { emoji: "🏷️", title: "Price alerts", desc: "Check prices daily and alert me when my item costs less." },
        { emoji: "🎟️", title: "Find concerts", desc: "Check weekly for new concerts that match my taste." },
        { emoji: "🎉", title: "Plan my weekend", desc: "Send me local weekend ideas every Thursday." },
      ],
    },

    plugins: {
      tabs: ["Plugins", "Skills"],
      title: "Plugins",
      subtitle: "Connect plugins to let ChatGPT work across your tools",
      searchPlaceholder: "Search plugins",
      installedLabel: "Installed",
      installed: [
        { name: "Canva", mark: "C", tone: "canva" },
        { name: "GitHub", mark: "GH", tone: "github" },
        { name: "Spotify", mark: "S", tone: "spotify" },
        { name: "Lovable", mark: "L", tone: "lovable" },
      ],
      publicLabel: "Public",
      sections: [
        {
          title: "Popular",
          items: [
            { name: "Gmail", desc: "Read and manage Gmail", mark: "M", tone: "gmail", action: "add" },
            { name: "Google Drive", desc: "Drive, Docs, Sheets or Slides", mark: "D", tone: "drive", action: "info" },
            { name: "Health", desc: "Explore your health data in ChatGPT", mark: "H", tone: "health", action: "info" },
            { name: "Remote Desktop Commander", desc: "Use your computer from chat", mark: "R", tone: "dark", action: "add" },
            { name: "GitHub", desc: "Triage PRs, issues, CI, and publish flows", mark: "GH", tone: "github", action: "more" },
            { name: "Supabase", desc: "Manage and query databases", mark: "S", tone: "supabase", action: "add" },
          ],
        },
        {
          title: "New & Noteworthy",
          items: [
            { name: "Lyft", desc: "Request a Lyft ride.", mark: "L", tone: "lyft", action: "add" },
            { name: "iCloud Mail", desc: "Read and manage iCloud email", mark: "M", tone: "icloud", action: "add" },
            { name: "iCloud Calendar", desc: "Read and manage iCloud events", mark: "C", tone: "calendar", action: "add" },
            { name: "ElevenLabs", desc: "Voice agents and media", mark: "II", tone: "dark", action: "add" },
            { name: "Tripsy", desc: "Plan and organize your trips", mark: "T", tone: "tripsy", action: "add" },
            { name: "Sonos", desc: "Control your Sonos system", mark: "S", tone: "dark", action: "add" },
          ],
        },
        {
          title: "Small Business",
          items: [
            { name: "Dropbox", desc: "Find, create, and take action", mark: "D", tone: "dropbox", action: "add" },
            { name: "Intuit QuickBooks", desc: "Accounting Payments & Payroll", mark: "Q", tone: "quickbooks", action: "add" },
            { name: "HubSpot", desc: "Insights to action in HubSpot", mark: "H", tone: "hubspot", action: "add" },
            { name: "Stripe", desc: "Accept payments, grow revenue.", mark: "S", tone: "stripe", action: "add" },
            { name: "Canva", desc: "Create, review, edit designs", mark: "C", tone: "canva", action: "add" },
            { name: "Gusto", desc: "People and payroll, made easy", mark: "G", tone: "gusto", action: "add" },
          ],
        },
        {
          title: "Productivity",
          items: [
            { name: "Notion", desc: "Create docs, tasks, databases", mark: "N", tone: "notion", action: "add" },
            { name: "Google Calendar", desc: "Manage Google Calendar events", mark: "C", tone: "calendar", action: "add" },
            { name: "Metricool", desc: "Analyze and schedule posts", mark: "M", tone: "metricool", action: "add" },
            { name: "Firecrawl", desc: "Search and extract web data", mark: "F", tone: "firecrawl", action: "add" },
            { name: "Dropbox", desc: "Find, create, and take action", mark: "D", tone: "dropbox", action: "add" },
            { name: "Outlook Calendar", desc: "Manage Outlook schedules", mark: "O", tone: "outlook", action: "add" },
          ],
        },
        {
          title: "Communication",
          items: [
            { name: "Outlook Email", desc: "Triage Outlook inboxes", mark: "O", tone: "outlook", action: "add" },
            { name: "Slack", desc: "Read and manage Slack", mark: "S", tone: "slack", action: "add" },
            { name: "Hostinger Mail", desc: "Use Hostinger Mail", mark: "H", tone: "hostinger", action: "add" },
            { name: "Teams", desc: "Summarize Teams and follow up", mark: "T", tone: "teams", action: "add" },
            { name: "Zoom", desc: "Insights from Zoom", mark: "Z", tone: "zoom", action: "add" },
            { name: "Rhythm AI Personality Tuner", desc: "Tune how ChatGPT talks to you", mark: "R", tone: "rhythm", action: "add" },
          ],
        },
        {
          title: "Creativity",
          items: [
            { name: "Canva", desc: "Create, review, edit designs", mark: "C", tone: "canva", action: "add" },
            { name: "Higgsfield", desc: "Every image and video model", mark: "H", tone: "dark", action: "add" },
            { name: "Figma", desc: "Create designs, ship to code", mark: "F", tone: "figma", action: "add" },
            { name: "Runway", desc: "Generate with every AI model", mark: "R", tone: "dark", action: "add" },
            { name: "Product Design", desc: "Explore and prototype ideas", mark: "P", tone: "design", action: "add" },
            { name: "HeyGen", desc: "Create videos, voice & avatars", mark: "H", tone: "heygen", action: "add" },
          ],
        },
        {
          title: "Developer Tools",
          items: [
            { name: "TinyFish", desc: "Find and complete web tasks", mark: "T", tone: "tinyfish", action: "add" },
            { name: "Vercel", desc: "Build and deploy apps", mark: "V", tone: "dark", action: "add" },
            { name: "Exa", desc: "Web search for AI agents", mark: "E", tone: "exa", action: "add" },
            { name: "Lovable", desc: "Build full-stack apps by chat", mark: "L", tone: "lovable", action: "add" },
            { name: "WPVibe", desc: "AI WordPress tools", mark: "W", tone: "wpvibe", action: "add" },
            { name: "Base44", desc: "Build apps without code", mark: "B", tone: "base44", action: "add" },
          ],
        },
      ],
    },

    myGpts: {
      title: "My GPTs",
      subtitle: "GPTs you create will appear here.",
      tabs: ["My GPTs", "Create"],
      empty: "You haven’t created any GPTs yet. Start with an idea and give it instructions, knowledge, and skills.",
      cta: "Create a GPT",
      explore: "Explore GPTs",
    },

    skills: {
      title: "Skills",
      subtitle: "Skills let ChatGPT use a focused ability in any conversation.",
      searchPlaceholder: "Search skills",
      sections: [
        {
          title: "Installed",
          items: [
            { name: "Web Search", desc: "Find current information on the web", mark: "W", tone: "web", action: "more" },
            { name: "Deep Research", desc: "Run long, multi-step investigations", mark: "D", tone: "scholar", action: "more" },
            { name: "Canvas", desc: "Draft and edit documents side by side", mark: "C", tone: "canva", action: "more" },
            { name: "Code Interpreter", desc: "Run code and analyse data files", mark: "C", tone: "code", action: "more" },
          ],
        },
        {
          title: "Available",
          items: [
            { name: "Study Mode", desc: "Work through problems step by step", mark: "S", tone: "study", action: "add" },
            { name: "Image Studio", desc: "Generate and refine images", mark: "I", tone: "photo", action: "add" },
            { name: "Voice", desc: "Talk to ChatGPT in real time", mark: "V", tone: "video", action: "add" },
            { name: "Spreadsheets", desc: "Build and update tables from chat", mark: "S", tone: "data", action: "add" },
          ],
        },
      ],
    },

    projects: {
      title: "Projects",
      searchPlaceholder: "Search projects",
      create: "Create",
      headers: ["Name", "Updated"],
      locked: "Locked chats",
    },

    gpts: {
      title: "GPTs",
      subtitle:
        "Discover custom versions of ChatGPT that combine instructions, extra knowledge, and any combination of skills",
      searchPlaceholder: "Search GPTs",
      myGpts: "My GPTs",
      create: "Create",
      notice: {
        title: "GPTs will be retired on December 11",
        body: "GPTs migrated by their creators will remain available as plugins after December 11.",
        link: "Learn more",
        cta: "Explore plugins",
      },
      categories: ["Top Picks", "Images", "Programming", "Research & Analysis", "Productivity", "Writing", "Education", "Lifestyle"],
      sections: [
        {
          title: "Featured",
          subtitle: "Curated top picks from this week",
          items: [
            { name: "Video AI by invideo", desc: "AI video maker GPT — generate engaging videos with voiceovers in any language!", by: "invideo.io", mark: "V", tone: "dark" },
            { name: "Expedia", desc: "Bring your trip plans to life – get there, stay there, find things to see and do.", by: "expedia.com", mark: "E", tone: "expedia" },
            { name: "Canva", desc: "Effortlessly design anything: presentations, logos, social media posts and more.", by: "canva.com", mark: "C", tone: "canva" },
          ],
        },
        {
          title: "Trending",
          subtitle: "Most popular GPTs by our community",
          items: [
            { name: "Scholar GPT", desc: "Enhance research with 200M+ resources and built-in critical reading skills.", by: "awesomegpts.ai", mark: "S", tone: "scholar", rank: 1 },
            { name: "Website & Web App Builder", desc: "Build a website & web app in minutes — fast, custom-made web design!", by: "Newgen PhD", mark: "W", tone: "builder", rank: 2 },
            { name: "Best WEBSITE & APP Builder👈", desc: "63M conversations! Best Website, App & Mobile App Builder & Agent", by: "Naif ALOTAIBI", mark: "B", tone: "builder2", rank: 3 },
            { name: "Websites", desc: "If you can imagine it, we can build it!", by: "pulsrai.com", mark: "W", tone: "web", rank: 4 },
            { name: "Consensus", desc: "Ask the research, chat directly with the world's scientific literature.", by: "consensus.app", mark: "C", tone: "consensus", rank: 5 },
            { name: "Write For Me", desc: "Supercharged writing assistant⚡", by: "puzzle.today", mark: "W", tone: "write", rank: 6 },
          ],
        },
        {
          title: "By ChatGPT",
          subtitle: "GPTs created by the ChatGPT team",
          items: [
            { name: "Monday", desc: "A personality experiment. You may not like it. It may not like you.", by: "ChatGPT", mark: "M", tone: "monday", rank: 1 },
            { name: "Data Analyst", desc: "Drop in any files and I can help analyze and visualize your data.", by: "ChatGPT", mark: "D", tone: "data", rank: 2 },
            { name: "Hot Mods", desc: "Let's modify your image into something really wild. Upload an image and let's go!", by: "ChatGPT", mark: "H", tone: "hot", rank: 3 },
            { name: "Creative Writing Coach", desc: "I'm eager to read your work and give you feedback to improve your skills.", by: "ChatGPT", mark: "C", tone: "write", rank: 4 },
            { name: "Coloring Book Hero", desc: "Take any idea and turn it into whimsical coloring book pages.", by: "ChatGPT", mark: "C", tone: "color", rank: 5 },
            { name: "Planty", desc: "I'm Planty, your fun and friendly plant care assistant!", by: "ChatGPT", mark: "P", tone: "plant", rank: 6 },
          ],
        },
        {
          title: "Images",
          subtitle: "Transform your ideas into amazing images",
          items: [
            { name: "LOGO", desc: "Senior brand LOGO design expert, 20 years of brand LOGO design experience.", by: "logogpts.cn", mark: "L", tone: "dark", rank: 1 },
            { name: "Consistent Character AI GPT", desc: "Generate characters in different poses, expressions, and scenes.", by: "neolemon.com", mark: "C", tone: "character", rank: 2 },
            { name: "Gifgen - GIF Creator", desc: "Create playful GIFs by providing any idea or image", by: "gifgen.ai", mark: "G", tone: "gif", rank: 3 },
            { name: "Website & Mobile App Builder🚀", desc: "Build a website & mobile app in minutes — fast, custom made web design!", by: "Naif ALOTAIBI", mark: "W", tone: "builder2", rank: 4 },
            { name: "Architecture AI", desc: "Architectural visual advisor that drives contextual traffic to AI Architect", by: "Will Davis", mark: "A", tone: "arch", rank: 5 },
            { name: "Glibatree Art Designer", desc: "Art generation made easy! This GPT will fill in details about your idea.", by: "glibatree.com", mark: "G", tone: "art", rank: 6 },
          ],
        },
        {
          title: "Programming",
          subtitle: "Write code, debug, test, and learn",
          items: [
            { name: "Software Architect GPT", desc: "Builds new software architecture documents from user requirements.", by: "sammuti.com", mark: "S", tone: "architect", rank: 1 },
            { name: "AI CODER 🤖 WEBSITE & APP BUILDER", desc: "Build faster than ever with AI: answer 4 quick questions and get your app.", by: "promptspellsmith.com", mark: "A", tone: "coder", rank: 2 },
            { name: "HTML + CSS + Javascript", desc: "Transform any idea, design, screenshot or description into working code.", by: "Iván González Dávila", mark: "H", tone: "html", rank: 3 },
            { name: "DesignerGPT", desc: "Creates and hosts beautiful websites, integrating generated images.", by: "Pietro Schirano", mark: "D", tone: "designer", rank: 4 },
            { name: "Code", desc: "Reviews code, generates and optimizes functions, writes tests.", by: "codegenerator.b12.io", mark: "C", tone: "code", rank: 5 },
            { name: "WEBSITE & APP Super Builder", desc: "Build an amazing website or app - in minutes!", by: "smartprompt.xyz", mark: "W", tone: "builder", rank: 6 },
          ],
        },
        {
          title: "Productivity",
          subtitle: "Increase your efficiency",
          items: [
            { name: "Presentation", desc: "Make Presentations 10x faster - Save as PPT and Google Slides", by: "slidedecksai.com", mark: "P", tone: "presentation", rank: 1 },
            { name: "Photo Realistic Image and Video Generator", desc: "Generate realistic images with text", by: "genigpt.net", mark: "P", tone: "photo", rank: 2 },
            { name: "AI Video Generator - VideoGPT", desc: "Sora 2, Veo 3.1, Kling O1 and all the latest AI models.", by: "veed.io", mark: "V", tone: "video", rank: 3 },
            { name: "Video AI by invideo", desc: "AI video maker GPT — generate engaging videos with voiceovers.", by: "invideo.io", mark: "V", tone: "dark", rank: 4 },
            { name: "Whimsical Diagrams", desc: "Explains and visualizes concepts with flowcharts, mindmaps and diagrams.", by: "Whimsical", mark: "W", tone: "diagram", rank: 5 },
            { name: "Diagrams by ShowMe", desc: "Flowcharts, UML, mindmaps, Gantt charts, ERDs and more.", by: "helpful.dev", mark: "D", tone: "diagram2", rank: 6 },
          ],
        },
        {
          title: "Writing",
          subtitle: "Enhance your writing with tools for creation, editing, and style refinement",
          items: [
            { name: "Song Maker GPT", desc: "Create AI music and original songs from your ideas.", by: "aisonggenerator.ai", mark: "S", tone: "song", rank: 1 },
            { name: "ChatPRD - AI for Product Managers", desc: "Drafts and improves your PRDs while coaching you to become an elite PM.", by: "chatprd.ai", mark: "C", tone: "prd", rank: 2 },
            { name: "Unbound Limitless Story Writer", desc: "Writes stories", by: "MOHAMED BENALI", mark: "U", tone: "story", rank: 3 },
            { name: "WEBSITE & MOBILE APP Builder", desc: "Tell us what you want, and see it built!", by: "writer-gpt.com", mark: "W", tone: "builder2", rank: 4 },
            { name: "Grammar Checker", desc: "Instantly corrects grammatical mistakes and punctuation inaccuracies.", by: "studyx.ai", mark: "G", tone: "grammar", rank: 5 },
            { name: "Writing Assistant", desc: "Edits and improves text with detailed tone analysis and explanations.", by: "Mohammed", mark: "W", tone: "writing", rank: 6 },
          ],
        },
        {
          title: "Research & Analysis",
          subtitle: "Find, evaluate, interpret, and visualize information",
          items: [
            { name: "Video/Image, Resume/CV, Finance/Economics", desc: "A platform of AI apps used by millions worldwide.", by: "aieveryday.net", mark: "A", tone: "everyday", rank: 1 },
            { name: "Marketing Research and Competitive Analysis", desc: "Your trusted assistant for delivering cutting edge marketing insights.", by: "MarketingGPT", mark: "M", tone: "marketing", rank: 2 },
            { name: "AskYourPDF Research Assistant", desc: "Chat and analyse documents, access 400M+ papers.", by: "Protonlabs", mark: "A", tone: "pdf", rank: 3 },
            { name: "Scholar AI", desc: "Enhance research with academic papers and critical reading skills.", by: "scholar.ai", mark: "S", tone: "scholar", rank: 4 },
            { name: "Data Analyst", desc: "Drop in any files and I can help analyze and visualize your data.", by: "ChatGPT", mark: "D", tone: "data", rank: 5 },
            { name: "Consensus", desc: "Ask the research, chat directly with the world's scientific literature.", by: "consensus.app", mark: "C", tone: "consensus", rank: 6 },
          ],
        },
        {
          title: "Education",
          subtitle: "Learn step by step with a patient tutor",
          items: [
            { name: "Study Mode", desc: "Work through problems step by step and check your understanding.", by: "ChatGPT", mark: "S", tone: "study", rank: 1 },
            { name: "Math Solver", desc: "Break down equations and explain every step clearly.", by: "ChatGPT", mark: "M", tone: "math", rank: 2 },
            { name: "Writing Coach", desc: "Feedback that helps you improve without rewriting for you.", by: "ChatGPT", mark: "W", tone: "writing", rank: 3 },
            { name: "Flashcards", desc: "Turn notes into a study set and quiz yourself.", by: "ChatGPT", mark: "F", tone: "flash", rank: 4 },
            { name: "Language Partner", desc: "Practice a new language in realistic conversations.", by: "ChatGPT", mark: "L", tone: "language", rank: 5 },
            { name: "Science Explainer", desc: "Make complex ideas feel simple with examples.", by: "ChatGPT", mark: "S", tone: "science", rank: 6 },
          ],
        },
        {
          title: "Lifestyle",
          subtitle: "Everyday help for home, health, and hobbies",
          items: [
            { name: "Planty", desc: "Your fun and friendly plant care assistant.", by: "ChatGPT", mark: "P", tone: "plant", rank: 1 },
            { name: "Recipe Builder", desc: "Turn what is in your kitchen into a meal plan.", by: "ChatGPT", mark: "R", tone: "recipe", rank: 2 },
            { name: "Workout Planner", desc: "Build a routine around your schedule and equipment.", by: "ChatGPT", mark: "W", tone: "fitness", rank: 3 },
            { name: "Travel Helper", desc: "Plan routes, packing lists, and things to see.", by: "ChatGPT", mark: "T", tone: "travel", rank: 4 },
            { name: "Home Organizer", desc: "Make a room-by-room plan you can actually finish.", by: "ChatGPT", mark: "H", tone: "home", rank: 5 },
            { name: "Gift Finder", desc: "Thoughtful ideas for any person and budget.", by: "ChatGPT", mark: "G", tone: "gift", rank: 6 },
          ],
        },
      ],
    },

    explore: {
      finances: {
        title: "Finances",
        subtitle: "Understand money, markets, and plans with a little help",
        items: [
          { name: "Budget Planner", desc: "Turn your income and bills into a monthly plan.", by: "ChatGPT", mark: "B", tone: "finance" },
          { name: "Market Explainer", desc: "Get plain-language context for market moves.", by: "ChatGPT", mark: "M", tone: "market" },
          { name: "Savings Coach", desc: "Set a goal and work out a realistic pace.", by: "ChatGPT", mark: "S", tone: "finance2" },
          { name: "Tax Checklist", desc: "Organize documents before you file.", by: "ChatGPT", mark: "T", tone: "tax" },
        ],
      },
      maps: {
        title: "Maps",
        subtitle: "Plan trips and find your way",
        items: [
          { name: "Route Planner", desc: "Compare routes, times, and stops.", by: "ChatGPT", mark: "R", tone: "map" },
          { name: "Local Guide", desc: "Find food, parks, and things to do nearby.", by: "ChatGPT", mark: "L", tone: "local" },
          { name: "Trip Builder", desc: "Turn a list of places into a day-by-day plan.", by: "ChatGPT", mark: "T", tone: "travel" },
          { name: "Neighborhood Scout", desc: "Compare areas on the things that matter to you.", by: "ChatGPT", mark: "N", tone: "scout" },
        ],
      },
      images: {
        title: "Images",
        subtitle: "Transform your ideas into amazing images",
        items: [
          { name: "LOGO", desc: "Senior brand LOGO design expert.", by: "logogpts.cn", mark: "L", tone: "dark" },
          { name: "Consistent Character AI GPT", desc: "Generate characters in different poses and scenes.", by: "neolemon.com", mark: "C", tone: "character" },
          { name: "Gifgen - GIF Creator", desc: "Create playful GIFs from any idea.", by: "gifgen.ai", mark: "G", tone: "gif" },
          { name: "Glibatree Art Designer", desc: "Turn an idea into four detailed images.", by: "glibatree.com", mark: "G", tone: "art" },
        ],
      },
      canva: {
        title: "Canva",
        subtitle: "Design presentations, posts, and more without leaving chat",
        items: [
          { name: "Canva", desc: "Effortlessly design anything: presentations, logos, and social posts.", by: "canva.com", mark: "C", tone: "canva" },
          { name: "Presentation Maker", desc: "Draft a deck and export it to slides.", by: "Canva", mark: "P", tone: "presentation" },
          { name: "Social Post Studio", desc: "Create a week of on-brand posts.", by: "Canva", mark: "S", tone: "social" },
          { name: "Logo Starter", desc: "Explore simple logo directions for a new brand.", by: "Canva", mark: "L", tone: "logo" },
        ],
      },
    },

    settings: {
      title: "Settings",
      back: "Back to app",
      searchPlaceholder: "Search",
      profileName: "Moralta?",
      nav: [
        {
          group: "Profile",
          items: [{ label: "Moralta?", icon: "avatar", profile: true, external: true }],
        },
        {
          group: "Account",
          items: [
            { label: "Security and login", icon: "shield" },
            { label: "Account", icon: "account", active: true },
            { label: "Parental controls", icon: "parental" },
            { label: "Trusted contact", icon: "contact" },
            { label: "Usage", icon: "usage" },
            { label: "Billing", icon: "billing" },
          ],
        },
        {
          group: "App",
          items: [
            { label: "General", icon: "settings" },
            { label: "Appearance", icon: "appearance" },
            { label: "Notifications", icon: "bell" },
            { label: "Voice", icon: "mic" },
            { label: "Personalization", icon: "personalization" },
            { label: "Pets", icon: "pets" },
            { label: "Keyboard", icon: "keyboard" },
          ],
        },
        {
          group: "Data & Privacy",
          items: [
            { label: "Archived chats", icon: "archive" },
            { label: "ChatGPT storage", icon: "storage" },
            { label: "Data controls", icon: "controls" },
            { label: "Integrations", icon: "integrations" },
            { label: "Plugins", icon: "plugins" },
            { label: "Passwords", icon: "passwords" },
          ],
        },
        {
          group: "Coding",
          items: [{ label: "Code Review", icon: "code" }],
        },
      ],
      account: {
        title: "Account",
        subtitle: "Review your account details",
        details: "Details",
        name: "SATVIK SINGH",
        username: "@satvik309",
        email: "satvik.gamerz309@gmail.com",
        plan: "Go",
        age: "18 or older",
        gptProfile: "Moralta?",
        deleteTitle: "Delete account",
        deleteBody: "Permanently delete your account and its data",
        deleteCta: "Delete",
        rows: [
          { label: "Name", desc: "The name associated with your account", value: "SATVIK SINGH", edit: true },
          { label: "Username", desc: "Your unique handle on ChatGPT", value: "@satvik309", edit: true },
          { label: "Email", desc: "The email address linked to your account", value: "satvik.gamerz309@gmail.com", edit: true },
          { label: "Plan", desc: "The plan for your current workspace", value: "Go" },
          { label: "Age", desc: "The age range used to apply account protections", value: "18 or older" },
        ],
      },
      panes: {
        General: {
          subtitle: "Language, region, and general preferences.",
          rows: [
            { label: "Language", desc: "The language used in the interface", value: "English (US)" },
            { label: "Region", desc: "Used for dates and local results", value: "India" },
          ],
        },
        Appearance: {
          subtitle: "Customize how ChatGPT looks.",
          rows: [
            { label: "Theme", desc: "Choose the interface theme", value: "Light" },
            { label: "Text size", desc: "Scale the conversation text", value: "Default" },
          ],
        },
        Notifications: {
          subtitle: "Choose when ChatGPT can reach you.",
          rows: [
            { label: "Scheduled tasks", desc: "Updates about tasks you scheduled", value: "On" },
            { label: "Product news", desc: "Occasional announcements", value: "Off" },
          ],
        },
        Voice: {
          subtitle: "Voice and audio preferences.",
          rows: [
            { label: "Voice", desc: "The voice used in voice mode", value: "Default" },
            { label: "Spoken replies", desc: "Read replies aloud automatically", value: "Off" },
          ],
        },
        Personalization: {
          subtitle: "Control how responses are tailored to you.",
          rows: [
            { label: "Memory", desc: "Let ChatGPT remember useful details", value: "On" },
            { label: "Custom instructions", desc: "Guidance applied to new chats", value: "Not set" },
          ],
        },
        "Data controls": {
          subtitle: "Manage how your data is used.",
          rows: [
            { label: "Improve the model for everyone", desc: "Allow chats to be used for training", value: "Off" },
            { label: "Shared links", desc: "Manage conversations shared by link", value: "0 links" },
          ],
        },
      },
    },

    images: {
      title: "Images",
      subtitle: "Images you create with ChatGPT will appear here.",
      empty: "Nothing here yet. Start with a prompt and your images will collect here.",
      cta: "Create an image",
      prompt: "Create an image of ",
    },
    research: {
      heading: "Deep research",
      subtitle: "Ask a question and ChatGPT breaks it into a multi-step investigation.",
      prompt: "Research ",
    },
    search: {
      title: "Search chats",
      placeholder: "Search chats",
      empty: "No chats found.",
    },
    composerHint: "ChatGPT can make mistakes. Check important info.",
    noticeNoKey:
      "Replies need an API key. Add `OPENAI_API_KEY=...` to the project `.env` file and restart the server, or keep exploring the interface.",
    noticeError: "Something went wrong while generating a reply. Try again.",
    noticeStopped: "Stopped.",
    deleteChat: "Delete chat",
    accountSettings: "Settings",
    logout: "Log out",
    copy: "Copy",
    copied: "Copied",
    goodResponse: "Good response",
    badResponse: "Bad response",
  },
};
