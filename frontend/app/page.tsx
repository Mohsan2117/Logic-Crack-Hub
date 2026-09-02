"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Code2,
  ArrowDown,
  Gamepad2,
  Gauge,
  Layers3,
  Mail,
  Menu,
  MonitorSmartphone,
  Moon,
  MapPin,
  Mouse,
  Pause,
  Phone,
  Play,
  Rocket,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  TestTube2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const StudioAIChat = dynamic(() => import("@/components/StudioAIChat").then((module) => module.StudioAIChat), {
  ssr: false,
});

type SectionSettings = Record<string, boolean>;

type SiteSettings = {
  studio_name: string;
  hero_title: string;
  hero_tagline: string;
  hero_description: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  secondary_location: string;
  map_url: string;
  footer_description: string;
};

type Game = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  genre: string;
  icon_url: string;
  play_store_url: string;
  package_id: string;
  status: "development" | "pre_registration" | "published" | "hidden";
  version: string;
  release_date: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  short_bio: string;
  profile_image_url: string;
};

type Job = {
  id: string;
  title: string;
  department: string;
  employment_type: string;
  location: string;
  description: string;
  requirements: string;
};

type SocialLink = {
  id: string;
  platform: string;
  url: string;
};

type SitePayload = {
  settings: SiteSettings;
  sections: SectionSettings;
  games: Game[];
  team: TeamMember[];
  jobs: Job[];
  social_links: SocialLink[];
};

const fallbackSite: SitePayload = {
  settings: {
    studio_name: "Logic Crack Studio",
    hero_title: "We Build Engaging Android Games",
    hero_tagline: "Turning Ideas Into Android Games",
    hero_description:
      "Logic Crack Studio creates engaging Unity-powered Android games, combining gameplay, design, optimization, and polished mobile experiences for Google Play.",
    contact_email: "logiccrack864@gmail.com",
    contact_phone: "+92-304-3285741",
    location:
      "Post Office Chak No. 42-A, Chak No. 41 ABS, Tehsil Liaquatpur, District Rahim Yar Khan, Punjab, Pakistan.",
    secondary_location: "Bahawalpur, Pakistan. Near Satellite Town, Bahawalpur, Punjab, Pakistan.",
    map_url:
      "https://www.google.com/maps/search/?api=1&query=Post%20Office%20Chak%20No.%2042-A%2C%20Chak%20No.%2041%20ABS%2C%20Tehsil%20Liaquatpur%2C%20District%20Rahim%20Yar%20Khan%2C%20Punjab%2C%20Pakistan",
    footer_description:
      "Logic Crack Studio is focused on creating Unity-powered Android games with polished gameplay, responsive interfaces, and release-ready mobile performance.",
  },
  sections: {
    studio_highlights: true,
    games: true,
    services: true,
    about: true,
    why_logic_crack: true,
    development_process: true,
    team: false,
    careers: false,
    contact: true,
  },
  games: [],
  team: [],
  jobs: [],
  social_links: [],
};

type IconCard = [string, string, LucideIcon];
type ServiceCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
};

const highlights: IconCard[] = [
  ["Unity Powered", "Built around Unity technology and practical mobile game workflows.", Code2],
  ["Android Focused", "Games designed and optimized for Android devices and touch interaction.", Smartphone],
  ["Google Play Ready", "Development decisions consider Android release requirements from the start.", Play],
  ["Full Game Pipeline", "Gameplay implementation, UI, optimization, testing, and release preparation.", Layers3],
];

const services: ServiceCard[] = [
  {
    title: "Android Game Development",
    description: "Develop Android-first games focused on mobile gameplay and device compatibility.",
    icon: Smartphone,
    image: "/images/services/android-game-development.webp",
  },
  {
    title: "Unity Development",
    description: "Build gameplay systems and game experiences using Unity.",
    icon: Code2,
    image: "/images/services/unity-development.webp",
  },
  {
    title: "Game UI/UX",
    description: "Create clear and engaging interfaces optimized for touch screens and mobile players.",
    icon: MonitorSmartphone,
    image: "/images/services/game-ui-ux.webp",
  },
  {
    title: "2D & 3D Game Development",
    description: "Support both 2D and 3D Unity game experiences.",
    icon: Layers3,
    image: "/images/services/2d-3d-development.webp",
  },
  {
    title: "Game Optimization",
    description: "Improve performance, loading, memory usage, frame rate, and Android compatibility.",
    icon: Gauge,
    image: "/images/services/game-optimization.webp",
  },
  {
    title: "Game Testing & QA",
    description: "Test gameplay, UI, compatibility, performance, and release readiness.",
    icon: TestTube2,
    image: "/images/services/game-testing-qa.webp",
  },
];

const whyCards: IconCard[] = [
  ["Android First", "Development decisions are made with Android performance and usability in mind.", Smartphone],
  ["Unity Based", "Games are developed using Unity and a reusable development workflow.", Code2],
  ["Performance Focused", "Mobile performance, responsiveness, and compatibility stay visible throughout development.", Gauge],
  ["Player Experience", "Gameplay and UI decisions prioritize clarity and enjoyable interaction.", Gamepad2],
  ["Complete Workflow", "Development covers implementation, testing, optimization, and Google Play preparation.", CheckCircle2],
];

const process = [
  {
    step: "01",
    title: "Concept",
    description: "Define the game idea, mechanics, player experience, and technical direction.",
    image: "/images/process/concept.webp",
  },
  {
    step: "02",
    title: "Prototype",
    description: "Build the core gameplay loop and validate the main mechanics.",
    image: "/images/process/prototype.webp",
  },
  {
    step: "03",
    title: "Development",
    description: "Create gameplay systems, UI, environments, levels, and supporting features.",
    image: "/images/process/development.webp",
  },
  {
    step: "04",
    title: "Polish",
    description: "Improve visuals, feedback, usability, balancing, and overall player experience.",
    image: "/images/process/polish.webp",
  },
  {
    step: "05",
    title: "Optimization & Testing",
    description: "Improve performance and test compatibility across Android devices.",
    image: "/images/process/optimization-testing.webp",
  },
  {
    step: "06",
    title: "Google Play Preparation",
    description: "Prepare production builds, store assets, release configuration, and Android publishing requirements.",
    image: "/images/process/google-play-preparation.webp",
  },
];

export default function Home() {
  const [site, setSite] = useState<SitePayload>(fallbackSite);
  const [activeService, setActiveService] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [themeReady, setThemeReady] = useState(false);
  const [processHoverPaused, setProcessHoverPaused] = useState(false);
  const [processFocusPaused, setProcessFocusPaused] = useState(false);
  const [processUserPaused, setProcessUserPaused] = useState(false);
  const processPointerFocusRef = useRef(false);

  useEffect(() => {
    apiFetch<{ success: boolean; data: SitePayload }>("/v1/site")
      .then((response) =>
        setSite({
          ...response.data,
          settings: { ...fallbackSite.settings, ...response.data.settings },
          sections: { ...fallbackSite.sections, ...response.data.sections },
        }),
      )
      .catch(() => setSite(fallbackSite));
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("lcs_theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const nextTheme = saved === "light" || saved === "dark" ? saved : prefersLight ? "light" : "dark";
    setTheme(nextTheme);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (themeReady) {
      window.localStorage.setItem("lcs_theme", theme);
    }
  }, [theme, themeReady]);

  const sections = { ...fallbackSite.sections, ...site.sections };
  const publishedGames = site.games.filter((game) => game.status === "published");
  const upcomingGames = site.games.filter((game) => game.status === "development");
  const preRegistrationGames = site.games.filter((game) => game.status === "pre_registration");
  const teamVisible = sections.team && site.team.length > 0;
  const careersVisible = sections.careers;
  const openJobs = site.jobs;
  const processTrack = [...process, ...process];
  const processShouldPause = processHoverPaused || processFocusPaused || processUserPaused;

  const navItems = useMemo(
    () =>
      [
        ["Home", "home", true],
        ["Games", "games", sections.games],
        ["Services", "services", sections.services],
        ["About", "about", sections.about],
        ["Team", "team", teamVisible],
        ["Careers", "careers", careersVisible],
        ["Contact", "contact", sections.contact],
      ] as const,
    [careersVisible, sections.about, sections.contact, sections.games, sections.services, teamVisible],
  );

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactStatus("Sending message...");
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/v1/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      event.currentTarget.reset();
      setContactStatus("Message saved. Thanks for reaching out.");
    } catch (error) {
      setContactStatus(error instanceof Error ? error.message : "We couldn't send this message right now.");
    }
  }

  function toggleProcessUserPause() {
    setProcessFocusPaused(false);
    setProcessUserPaused((paused) => !paused);
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplicationStatus("Submitting application...");
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/v1/applications", { method: "POST", body: form });
      event.currentTarget.reset();
      setApplicationStatus("Application submitted.");
    } catch (error) {
      setApplicationStatus(error instanceof Error ? error.message : "We couldn't submit this application right now.");
    }
  }

  function scrollPastHero() {
    const target = document.getElementById(sections.studio_highlights ? "highlights" : "games");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="studio-page">
      <header className="fixed inset-x-0 top-0 z-50 px-3 py-3">
        <nav className="section-shell theme-nav flex items-center justify-between rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl">
          <a className="flex items-center gap-3" href="#home" aria-label="Logic Crack Studio home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/18 text-violet-200 ring-1 ring-violet-300/30">
              <Gamepad2 size={21} aria-hidden />
            </span>
            <span className="theme-heading text-sm font-black uppercase tracking-[0.18em] sm:text-base">{site.settings.studio_name}</span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems
              .filter((item) => item[2])
              .map(([label, href]) => (
                <a className="theme-muted rounded-full px-4 py-2 text-sm font-bold transition hover:bg-violet-500/10 hover:text-violet-200" href={`#${href}`} key={href}>
                  {label}
                </a>
              ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
            <a className="btn-primary focus-ring rounded-full px-5 py-3 text-sm font-black" href="#games">
              Explore Our Games
            </a>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
            <button className="focus-ring rounded-xl border border-violet-300/20 bg-violet-500/10 p-2" onClick={() => setMenuOpen((value) => !value)} type="button" aria-label="Open navigation">
            {menuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="section-shell theme-nav-menu mt-2 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl lg:hidden">
            {navItems
              .filter((item) => item[2])
              .map(([label, href]) => (
                <a className="theme-muted block rounded-xl px-4 py-3 text-sm font-bold hover:bg-violet-500/10 hover:text-violet-200" href={`#${href}`} key={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
          </div>
        ) : null}
      </header>

      <section className="section-shell relative flex min-h-[92vh] items-center pb-12 pt-32" id="home">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="section-reveal">
            <p className="inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-200">
              {site.settings.hero_tagline}
            </p>
            <h1 className="theme-heading mt-6 max-w-3xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              {site.settings.hero_title}
            </h1>
            <p className="theme-muted mt-6 max-w-2xl text-lg leading-8">{site.settings.hero_description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="btn-primary focus-ring inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black" href="#games">
                Explore Our Games <ChevronRight size={18} aria-hidden />
              </a>
              <a className="btn-secondary focus-ring inline-flex items-center justify-center rounded-full px-6 py-4 text-sm font-black" href="#about">
                About Logic Crack
              </a>
            </div>
          </div>

          <HeroDevice />
        </div>
        <button className="hero-scroll-indicator focus-ring" onClick={scrollPastHero} type="button" aria-label="Scroll to next section">
          <Mouse className="hero-scroll-mouse" size={32} aria-hidden />
          <span>Scroll down</span>
          <ArrowDown className="hero-scroll-arrow" size={24} aria-hidden />
        </button>
      </section>

      {sections.studio_highlights ? (
        <StudioSection kicker="Studio capabilities" title="Built for Android Game Production" id="highlights">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(([title, copy, Icon]) => (
              <FeatureCard icon={<Icon size={24} />} title={title as string} key={title}>
                {copy}
              </FeatureCard>
            ))}
          </div>
        </StudioSection>
      ) : null}

      {sections.games ? (
        <StudioSection kicker="Our games" title="Current and Upcoming Releases" id="games">
          {publishedGames.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {publishedGames.map((game) => (
                <GameCard game={game} key={game.id} />
              ))}
            </div>
          ) : (
            <div className="premium-card glow-card overflow-hidden rounded-3xl p-8 sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
                <div>
                  <span className="inline-flex rounded-full border border-violet-300/25 bg-violet-400/10 px-4 py-2 text-sm font-black text-violet-200">
                    In Development
                  </span>
                  <h3 className="mt-5 text-3xl font-black text-white sm:text-4xl">Games Are in Development</h3>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-[#c4badf]">
                    We are currently building our first Android gaming experiences. Upcoming releases will appear here once real game records are added through Admin.
                  </p>
                  {upcomingGames.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {upcomingGames.map((game) => (
                        <span className="rounded-full bg-white/[0.06] px-3 py-2 text-sm font-bold text-[#d8d0ee]" key={game.id}>
                          {game.title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="relative min-h-64 rounded-3xl border border-violet-300/20 bg-[#0b0b18] p-5">
                  <div className="absolute inset-8 rounded-full bg-violet-500/20 blur-3xl" />
                  <div className="relative grid h-full place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Gamepad2 className="text-violet-200" size={92} aria-hidden />
                  </div>
                </div>
              </div>
            </div>
          )}
          {preRegistrationGames.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {preRegistrationGames.map((game) => (
                <GameCard game={game} key={game.id} />
              ))}
            </div>
          ) : null}
        </StudioSection>
      ) : null}

      {sections.services ? (
        <StudioSection kicker="Services" title="Game Development Services" id="services">
          <div className="services-stage">
            {services.map((service, index) => {
              const active = activeService === index;
              const Icon = service.icon;
              return (
                <button
                  aria-pressed={active}
                  className={`service-card focus-ring rounded-3xl text-left ${active ? "is-active" : ""}`}
                  key={service.title}
                  onClick={() => setActiveService(index)}
                  onFocus={() => setActiveService(index)}
                  onMouseEnter={() => setActiveService(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveService(index);
                    }
                  }}
                  type="button"
                >
                  <div className="service-card-closed" aria-hidden={active}>
                    <div className="service-card-closed-top">
                      <p className="service-card-closed-number">0{index + 1}</p>
                      <span className="service-card-closed-icon">
                        <Icon size={22} aria-hidden />
                      </span>
                    </div>
                    <h3 className="service-card-vertical-title">{service.title}</h3>
                  </div>
                  <div className="service-card-active">
                    <div className="service-card-content">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-400/12 text-violet-100 ring-1 ring-violet-100/20">
                          <Icon size={23} aria-hidden />
                        </span>
                        <p className="service-card-number">0{index + 1}</p>
                      </div>
                      <h3 className="service-card-title">{service.title}</h3>
                      <p className="service-card-description">{service.description}</p>
                      <span className="service-card-badge">Capability focus</span>
                    </div>
                    <div className="service-card-media" aria-hidden>
                      <img className="h-auto w-full select-none object-contain" src={service.image} alt="" draggable={false} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </StudioSection>
      ) : null}

      {sections.about ? (
        <StudioSection kicker="About" title="About Logic Crack Studio" id="about">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="premium-card about-text-card rounded-3xl p-7">
              <Sparkles className="text-violet-200" size={34} aria-hidden />
              <p className="about-text-copy mt-5 text-lg leading-8 text-[#d8d0ee]">
                Logic Crack Studio is a game development studio focused on creating Android games using Unity. The studio works across gameplay programming, mobile game systems, touch-first UI/UX, 2D and 3D development, optimization, testing, and Android deployment preparation.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {["Gameplay programming", "Mobile-focused systems", "Game UI/UX", "2D/3D Unity development", "Optimization", "Android release preparation"].map((item) => (
                <div className="about-capability-card rounded-2xl border border-violet-300/15 bg-white/[0.045] p-5" key={item}>
                  <CheckCircle2 className="about-capability-icon text-violet-200" size={20} aria-hidden />
                  <p className="about-capability-label mt-3 font-bold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </StudioSection>
      ) : null}

      {sections.why_logic_crack ? (
        <StudioSection kicker="Why Logic Crack" title="A Focused Studio Workflow" id="why">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {whyCards.map(([title, copy, Icon]) => (
              <FeatureCard icon={<Icon size={22} />} title={title as string} key={title}>
                {copy}
              </FeatureCard>
            ))}
          </div>
        </StudioSection>
      ) : null}

      {sections.development_process ? (
        <StudioSection kicker="Process" title="Our Development Process" id="process">
          <p className="theme-muted -mt-4 mb-6 max-w-2xl text-sm leading-7 sm:text-base">
            A focused Android game workflow from first playable idea to release-ready build preparation.
          </p>
          <div
            className={`process-showcase ${processShouldPause ? "is-paused" : ""}`}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setProcessFocusPaused(false);
              }
            }}
            onClick={() => {
              toggleProcessUserPause();
            }}
            onFocus={() => {
              if (processPointerFocusRef.current) {
                processPointerFocusRef.current = false;
                return;
              }
              setProcessFocusPaused(true);
            }}
            onPointerDownCapture={() => {
              processPointerFocusRef.current = true;
            }}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") {
                setProcessHoverPaused(true);
              }
            }}
            onPointerLeave={() => setProcessHoverPaused(false)}
          >
            <div className="process-showcase-top">
              <span className="process-showcase-label">Game Development Process</span>
              <button
                aria-label={processUserPaused ? "Resume process slider" : "Pause process slider"}
                className="process-showcase-toggle focus-ring"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleProcessUserPause();
                }}
                type="button"
              >
                {processUserPaused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
              </button>
            </div>
            <div className="process-marquee" aria-label="Logic Crack Studio development process">
              <div className="process-track">
                {processTrack.map((item, index) => (
                  <article className="process-card focus-ring" key={`${item.step}-${index}`} tabIndex={0} aria-label={`${item.step} ${item.title}`}>
                    <div className="process-card-image">
                      <img src={item.image} alt="" draggable={false} />
                    </div>
                    <div className="process-card-body">
                      <span className="process-card-label">Game Development Process</span>
                      <p className="process-card-step">{item.step}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </StudioSection>
      ) : null}

      {teamVisible ? (
        <StudioSection kicker="Team" title="The People Behind the Studio" id="team">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {site.team.map((member) => (
              <article className="premium-card rounded-2xl p-5" key={member.id}>
                <div className="h-32 rounded-xl border border-violet-300/15 bg-violet-500/10 bg-cover bg-center" style={member.profile_image_url ? { backgroundImage: `url(${member.profile_image_url})` } : undefined} />
                <h3 className="mt-4 text-xl font-black text-white">{member.name}</h3>
                <p className="mt-1 text-sm font-bold text-violet-200">{member.role}</p>
                <p className="mt-3 text-sm leading-7 text-[#c4badf]">{member.short_bio}</p>
              </article>
            ))}
          </div>
        </StudioSection>
      ) : null}

      {careersVisible ? (
        <StudioSection kicker="Careers" title="Careers at Logic Crack Studio" id="careers">
          {openJobs.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                {openJobs.map((job) => (
                  <article className="premium-card rounded-2xl p-5" key={job.id}>
                    <h3 className="text-xl font-black text-white">{job.title}</h3>
                    <p className="mt-2 text-sm font-bold text-violet-200">
                      {job.department} · {job.employment_type} · {job.location}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#c4badf]">{job.description}</p>
                  </article>
                ))}
              </div>
              <ApplicationForm jobs={openJobs} onSubmit={submitApplication} status={applicationStatus} />
            </div>
          ) : (
            <div className="premium-card rounded-2xl p-7 text-center">
              <BriefcaseBusiness className="mx-auto text-violet-200" size={34} aria-hidden />
              <h3 className="mt-4 text-2xl font-black text-white">There are no open positions at the moment.</h3>
            </div>
          )}
        </StudioSection>
      ) : null}

      {sections.contact ? (
        <StudioSection kicker="Contact" title="Contact Logic Crack Studio" id="contact">
          <div className="contact-layout grid gap-5 md:grid-cols-2">
            <form className="contact-form premium-card grid rounded-3xl" onSubmit={submitContact}>
              <div>
                <p className="contact-eyebrow">Get in Touch</p>
                <h3 className="contact-title">Contact Us</h3>
              </div>
              <div className="contact-fields grid sm:grid-cols-2">
                <ContactField label="First Name *" name="name" required />
                <ContactField label="Last Name" name="last_name" />
              </div>
              <ContactField label="Email Address *" name="email" required type="email" />
              <div className="contact-fields grid sm:grid-cols-2">
                <ContactField label="Phone" name="phone" />
                <ContactField label="Subject *" name="subject" required />
              </div>
              <label className="block">
                <span className="contact-label">Message *</span>
                <textarea className="contact-message field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name="message" required maxLength={3000} />
              </label>
              <input name="company" className="hidden" tabIndex={-1} autoComplete="off" />
              <button className="btn-primary contact-submit focus-ring inline-flex items-center justify-center gap-2 text-sm font-black" type="submit">
                <Send size={17} aria-hidden /> Send Message
              </button>
              {contactStatus ? <p className="text-sm font-bold text-violet-100">{contactStatus}</p> : null}
            </form>
            <div className="contact-side grid">
              <LocationCard settings={site.settings} />
              <ContactDetails settings={site.settings} />
            </div>
          </div>
        </StudioSection>
      ) : null}

      <footer className="border-t border-violet-300/10 py-10">
        <div className="section-shell grid gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-xl font-black text-white">{site.settings.studio_name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#b9b0d4]">{site.settings.footer_description}</p>
            <p className="mt-5 text-sm text-[#8f86a9]">© {new Date().getFullYear()} Logic Crack Studio. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {site.social_links.map((link) => (
              <a className="rounded-full border border-violet-300/15 px-4 py-2 text-sm font-bold text-[#c4badf] hover:border-violet-300/40 hover:text-white" href={link.url} key={link.id} rel="noreferrer" target="_blank">
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      </footer>
      <StudioAIChat />
    </main>
  );
}

function StudioSection({ children, id, kicker, title }: { children: ReactNode; id: string; kicker: string; title: string }) {
  return (
    <section className="section-shell section-reveal py-14 sm:py-20" id={id}>
      <div className="mb-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-200">{kicker}</p>
        <h2 className="theme-heading mt-3 max-w-3xl text-3xl font-black sm:text-5xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ThemeToggle({ onToggle, theme }: { onToggle: () => void; theme: "dark" | "light" }) {
  const isLight = theme === "light";
  return (
    <button
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className="focus-ring relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-violet-300/20 bg-violet-500/10 text-violet-200 shadow-[0_12px_28px_rgba(124,58,237,0.18)]"
      onClick={onToggle}
      type="button"
    >
      <Sun className={`theme-toggle-icon absolute ${isLight ? "theme-toggle-icon-hidden" : ""}`} size={18} aria-hidden />
      <Moon className={`theme-toggle-icon absolute ${isLight ? "" : "theme-toggle-icon-hidden"}`} size={18} aria-hidden />
    </button>
  );
}

function LocationCard({ settings }: { settings: SiteSettings }) {
  const mapURL = mapEmbedURL(settings.map_url);
  return (
    <article className="location-map-card overflow-hidden">
      {mapURL ? (
        <iframe
          className="location-map-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapURL}
          title="Logic Crack Studio map location"
        />
      ) : (
        <div className="location-map-fallback">
          <p className="theme-muted text-sm font-bold">Map location is not configured yet.</p>
        </div>
      )}
    </article>
  );
}

function ContactDetails({ settings }: { settings: SiteSettings }) {
  const mapHref = settings.map_url.trim();
  return (
    <article className="contact-details">
      <div className="contact-detail-row">
        {settings.contact_email ? (
          <ContactDetailItem
            href={`mailto:${settings.contact_email}`}
            icon={<Mail size={20} aria-hidden />}
            label="Email"
            value={settings.contact_email}
          />
        ) : null}
        {settings.contact_phone ? (
          <ContactDetailItem
            href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`}
            icon={<Phone size={20} aria-hidden />}
            label="Phone"
            value={settings.contact_phone}
          />
        ) : null}
      </div>
      {settings.location ? (
        <ContactDetailItem
          centered
          href={mapHref || undefined}
          icon={<MapPin size={20} aria-hidden />}
          label="Location"
          value={settings.location}
        />
      ) : null}
    </article>
  );
}

function ContactDetailItem({
  centered,
  href,
  icon,
  label,
  value,
}: {
  centered?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const content = (
    <>
      <span className="contact-detail-icon">{icon}</span>
      <span className="contact-detail-copy">
        <span className="contact-detail-label">{label}</span>
        <span className="contact-detail-value">{value}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a className={`contact-detail-item focus-ring ${centered ? "is-centered" : ""}`} href={href} rel={href.startsWith("http") ? "noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>
        {content}
      </a>
    );
  }

  return <div className={`contact-detail-item ${centered ? "is-centered" : ""}`}>{content}</div>;
}

function mapEmbedURL(value: string) {
  const raw = value.trim();
  if (!raw) {
    return "";
  }
  if (raw.includes("/embed") || raw.includes("output=embed")) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.includes("google.")) {
      return "";
    }
    const query = parsed.searchParams.get("query") || parsed.searchParams.get("q");
    if (query) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }
  } catch {
    return "";
  }
  return "";
}

function HeroDevice() {
  return (
    <div className="section-reveal relative mx-auto w-full max-w-[470px]">
      <div className="absolute -inset-8 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="premium-card hero-device-card relative rounded-[2rem] p-4">
        <div className="theme-device hero-device-panel rounded-[1.5rem] border border-violet-300/15 p-5">
          <div className="hero-device-header flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="hero-device-kicker text-xs font-black uppercase text-violet-200">Unity Android Build</p>
              <p className="theme-heading mt-1 text-lg font-black">Gameplay Loop</p>
            </div>
            <Rocket className="hero-device-icon text-violet-200" size={28} aria-hidden />
          </div>
          <div className="mt-5 grid gap-3">
            {["Touch input", "Responsive UI", "Frame pacing", "Release checklist"].map((item, index) => (
              <div className="hero-device-row flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4" key={item}>
                <span className="hero-device-step grid h-9 w-9 place-items-center rounded-xl bg-violet-400/12 text-sm font-black text-violet-100">0{index + 1}</span>
                <span className="hero-device-row-label theme-muted font-bold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <article className="premium-card glow-card rounded-2xl p-5">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-400/12 text-violet-200 ring-1 ring-violet-200/20">{icon}</span>
      <h3 className="theme-heading mt-5 text-lg font-black">{title}</h3>
      <p className="theme-muted mt-3 text-sm leading-7">{children}</p>
    </article>
  );
}

function GameCard({ game }: { game: Game }) {
  const cta = game.status === "pre_registration" ? "Pre-register on Google Play" : "View on Google Play";
  return (
    <article className="premium-card rounded-3xl p-6">
      <div className="flex gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-violet-300/20 bg-violet-500/10">
          {game.icon_url ? <img className="h-full w-full object-cover" src={game.icon_url} alt={`${game.title} icon`} /> : <Gamepad2 className="text-violet-200" size={34} aria-hidden />}
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">{game.title}</h3>
          <p className="mt-1 text-sm font-bold text-violet-200">{game.genre}</p>
          <p className="mt-3 text-sm leading-7 text-[#c4badf]">{game.short_description || game.description}</p>
        </div>
      </div>
      {game.play_store_url ? (
        <a className="btn-primary focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black" href={game.play_store_url} rel="noreferrer" target="_blank">
          {cta} <ChevronRight size={16} aria-hidden />
        </a>
      ) : null}
    </article>
  );
}

function ApplicationForm({ jobs, onSubmit, status }: { jobs: Job[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; status: string }) {
  return (
    <form className="premium-card grid gap-4 rounded-3xl p-6" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name *" name="full_name" required />
        <Field label="Email *" name="email" required type="email" />
        <Field label="Phone" name="phone" />
        <label className="block">
          <span className="text-sm font-black text-[#d8d0ee]">Position *</span>
          <select className="field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name="job_id" required>
            {jobs.map((job) => (
              <option value={job.id} key={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
        <Field label="Portfolio URL" name="portfolio_url" type="url" />
        <Field label="LinkedIn URL" name="linkedin_url" type="url" />
      </div>
      <Field label="Experience" name="experience" />
      <label className="block">
        <span className="text-sm font-black text-[#d8d0ee]">Cover Message *</span>
        <textarea className="field focus-ring mt-2 min-h-32 w-full rounded-2xl px-4 py-3 text-sm" name="cover_message" required maxLength={4000} />
      </label>
      <label className="block">
        <span className="text-sm font-black text-[#d8d0ee]">Resume/CV *</span>
        <input className="field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name="resume" required type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
      </label>
      <input name="company" className="hidden" tabIndex={-1} autoComplete="off" />
      <button className="btn-primary focus-ring inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black" type="submit">
        <Send size={17} aria-hidden /> Apply Now
      </button>
      {status ? <p className="text-sm font-bold text-violet-100">{status}</p> : null}
    </form>
  );
}

function Field({ label, name, required, type = "text" }: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#d8d0ee]">{label}</span>
      <input className="field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name={name} required={required} type={type} />
    </label>
  );
}

function ContactField({ label, name, required, type = "text" }: { label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="contact-label">{label}</span>
      <input className="contact-input field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name={name} required={required} type={type} />
    </label>
  );
}
