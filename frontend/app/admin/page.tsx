"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Gamepad2, LayoutDashboard, LogOut, Mail, Save, Settings, ShieldCheck, ToggleLeft, Users } from "lucide-react";
import { apiFetch, clearSession, getToken, saveSession } from "@/lib/api";

type AdminData = {
  settings: Record<string, string>;
  sections: { section_key: string; is_enabled: boolean; display_order: number }[];
  games: Record<string, string | boolean | number>[];
  team: Record<string, string | boolean | number>[];
  jobs: Record<string, string | boolean | number>[];
  applications: Record<string, string>[];
  contact_messages: Record<string, string>[];
  social_links: Record<string, string | boolean | number>[];
};

const sectionLabels: Record<string, string> = {
  studio_highlights: "Studio Highlights",
  games: "Games",
  services: "Services",
  about: "About",
  why_logic_crack: "Why Logic Crack",
  development_process: "Development Process",
  team: "Team",
  careers: "Careers",
  contact: "Contact",
};

const blankGame = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  genre: "",
  icon_url: "",
  play_store_url: "",
  package_id: "",
  status: "development",
  version: "",
  display_order: 0,
  is_active: true,
};

const blankTeam = {
  name: "",
  role: "",
  short_bio: "",
  profile_image_url: "",
  display_order: 0,
  is_active: true,
};

const blankJob = {
  title: "",
  department: "",
  employment_type: "Full-time",
  location: "Remote",
  description: "",
  requirements: "",
  status: "open",
  display_order: 0,
};

const blankSocial = {
  platform: "",
  url: "",
  is_active: true,
  display_order: 0,
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [game, setGame] = useState<Record<string, string | boolean | number>>(blankGame);
  const [team, setTeam] = useState<Record<string, string | boolean | number>>(blankTeam);
  const [job, setJob] = useState<Record<string, string | boolean | number>>(blankJob);
  const [social, setSocial] = useState<Record<string, string | boolean | number>>(blankSocial);

  useEffect(() => {
    if (getToken()) {
      setAuthed(true);
      void load();
    }
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in...");
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiFetch<{ success: boolean; data: { token: string; user: { name: string; email: string; role: string } } }>("/v1/admin/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      saveSession({ token: response.data.token, user: response.data.user });
      setAuthed(true);
      setMessage("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    }
  }

  async function load() {
    try {
      const response = await apiFetch<{ success: boolean; data: AdminData }>("/v1/admin/dashboard");
      setData(response.data);
      setSettings(response.data.settings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load admin data.");
    }
  }

  function logout() {
    clearSession();
    setAuthed(false);
    setData(null);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutate("/v1/admin/settings", "PUT", settings, "Settings saved.");
  }

  async function toggleSection(key: string, enabled: boolean) {
    await mutate(`/v1/admin/sections/${key}`, "PUT", { is_enabled: enabled }, "Section updated.");
  }

  async function create(path: string, payload: Record<string, unknown>, success: string, reset: () => void) {
    await mutate(path, "POST", payload, success);
    reset();
  }

  async function remove(path: string) {
    await mutate(path, "DELETE", {}, "Item removed.");
  }

  async function updateStatus(path: string, status: string) {
    await mutate(path, "PATCH", { status }, "Status updated.");
  }

  async function mutate(path: string, method: string, payload: Record<string, unknown>, success: string) {
    setMessage("Saving...");
    try {
      await apiFetch(path, { method, body: method === "DELETE" ? undefined : JSON.stringify(payload) });
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  }

  if (!authed) {
    return (
      <main className="studio-page grid min-h-screen place-items-center px-4 py-10">
        <form className="premium-card w-full max-w-md rounded-3xl p-7" onSubmit={login}>
          <Link className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#c4badf] hover:text-white" href="/">
            <ArrowLeft size={16} aria-hidden /> Public site
          </Link>
          <ShieldCheck className="text-violet-200" size={36} aria-hidden />
          <h1 className="mt-4 text-3xl font-black text-white">Admin Login</h1>
          <p className="mt-2 text-sm leading-6 text-[#b9b0d4]">Authorized Logic Crack Studio admins only.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Email" name="email" type="email" required />
            <Field label="Password" name="password" type="password" required />
            <button className="btn-primary focus-ring rounded-full px-5 py-3 text-sm font-black" type="submit">Sign In</button>
          </div>
          {message ? <p className="mt-4 text-sm font-bold text-violet-100">{message}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="studio-page min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#c4badf] hover:text-white" href="/">
              <ArrowLeft size={16} aria-hidden /> Public site
            </Link>
            <h1 className="mt-2 text-3xl font-black text-white">Logic Crack Studio Admin</h1>
          </div>
          <button className="btn-secondary focus-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black" onClick={logout} type="button">
            <LogOut size={17} aria-hidden /> Logout
          </button>
        </header>

        {message ? <p className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100">{message}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="premium-card h-max rounded-3xl p-4">
            {[
              ["Dashboard", LayoutDashboard],
              ["Site Sections", ToggleLeft],
              ["Games", Gamepad2],
              ["Team", Users],
              ["Careers", BriefcaseBusiness],
              ["Messages", Mail],
              ["Settings", Settings],
            ].map(([label, Icon]) => (
              <a className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-[#c4badf] hover:bg-white/[0.06] hover:text-white" href={`#${String(label).toLowerCase().replace(" ", "-")}`} key={String(label)}>
                <Icon size={18} aria-hidden /> {String(label)}
              </a>
            ))}
          </aside>

          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" id="dashboard">
              <Stat label="Games" value={data?.games.length ?? 0} />
              <Stat label="Team Members" value={data?.team.length ?? 0} />
              <Stat label="Open Jobs" value={data?.jobs.filter((item) => item.status === "open").length ?? 0} />
              <Stat label="Messages" value={data?.contact_messages.length ?? 0} />
            </section>

            <Panel title="Site Sections" id="site-sections">
              <div className="grid gap-3 sm:grid-cols-2">
                {data?.sections.map((section) => (
                  <label className="flex items-center justify-between rounded-2xl border border-violet-300/15 bg-white/[0.04] p-4" key={section.section_key}>
                    <span className="font-bold text-white">{sectionLabels[section.section_key] ?? section.section_key}</span>
                    <input checked={section.is_enabled} onChange={(event) => toggleSection(section.section_key, event.target.checked)} type="checkbox" />
                  </label>
                ))}
              </div>
            </Panel>

            <Panel title="Contact Information and Site Content" id="settings">
              <form className="grid gap-4" onSubmit={saveSettings}>
                <div className="grid gap-4 md:grid-cols-2">
                  {["studio_name", "hero_title", "hero_tagline", "contact_email", "contact_phone", "location", "secondary_location", "map_url", "contact_form_recipient"].map((key) => (
                    <Field key={key} label={labelize(key)} name={key} value={settings[key] ?? ""} onChange={(value) => setSettings((current) => ({ ...current, [key]: value }))} />
                  ))}
                </div>
                <TextArea label="Hero Description" value={settings.hero_description ?? ""} onChange={(value) => setSettings((current) => ({ ...current, hero_description: value }))} />
                <TextArea label="Footer Description" value={settings.footer_description ?? ""} onChange={(value) => setSettings((current) => ({ ...current, footer_description: value }))} />
                <button className="btn-primary focus-ring inline-flex w-max items-center gap-2 rounded-full px-5 py-3 text-sm font-black" type="submit">
                  <Save size={16} aria-hidden /> Save Settings
                </button>
              </form>
            </Panel>

            <CrudPanel title="Games" id="games" fields={blankGame} value={game} onChange={setGame} onSubmit={() => create("/v1/admin/games", game, "Game saved.", () => setGame(blankGame))} items={data?.games ?? []} removePath="/v1/admin/games" />
            <CrudPanel title="Team" id="team" fields={blankTeam} value={team} onChange={setTeam} onSubmit={() => create("/v1/admin/team", team, "Team member saved.", () => setTeam(blankTeam))} items={data?.team ?? []} removePath="/v1/admin/team" />
            <CrudPanel title="Careers" id="careers" fields={blankJob} value={job} onChange={setJob} onSubmit={() => create("/v1/admin/jobs", job, "Job saved.", () => setJob(blankJob))} items={data?.jobs ?? []} removePath="/v1/admin/jobs" />
            <CrudPanel title="Social Links" id="social-links" fields={blankSocial} value={social} onChange={setSocial} onSubmit={() => create("/v1/admin/social-links", social, "Social link saved.", () => setSocial(blankSocial))} items={data?.social_links ?? []} removePath="/v1/admin/social-links" />

            <Panel title="Applications" id="applications">
              <div className="space-y-3">
                {(data?.applications ?? []).map((item) => (
                  <ReviewCard key={item.id} item={item} actions={["new", "reviewing", "shortlisted", "rejected", "accepted"].map((status) => [status, () => updateStatus(`/v1/admin/applications/${item.id}/status`, status)] as const)} />
                ))}
                {data?.applications.length === 0 ? <Empty>No applications yet.</Empty> : null}
              </div>
            </Panel>

            <Panel title="Contact Messages" id="messages">
              <div className="space-y-3">
                {(data?.contact_messages ?? []).map((item) => (
                  <ReviewCard key={item.id} item={item} actions={["new", "read", "archived"].map((status) => [status, () => updateStatus(`/v1/admin/contact-messages/${item.id}/status`, status)] as const)} />
                ))}
                {data?.contact_messages.length === 0 ? <Empty>No messages yet.</Empty> : null}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );

  function CrudPanel({
    title,
    id,
    fields,
    value,
    onChange,
    onSubmit,
    items,
    removePath,
  }: {
    title: string;
    id: string;
    fields: Record<string, string | boolean | number>;
    value: Record<string, string | boolean | number>;
    onChange: (value: Record<string, string | boolean | number>) => void;
    onSubmit: () => void;
    items: Record<string, string | boolean | number>[];
    removePath: string;
  }) {
    return (
      <Panel title={title} id={id}>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(fields).map((key) =>
              typeof fields[key] === "boolean" ? (
                <label className="flex items-center justify-between rounded-2xl border border-violet-300/15 bg-white/[0.04] p-4" key={key}>
                  <span className="font-bold text-white">{labelize(key)}</span>
                  <input checked={Boolean(value[key])} onChange={(event) => onChange({ ...value, [key]: event.target.checked })} type="checkbox" />
                </label>
              ) : key === "description" || key === "requirements" || key === "short_bio" ? (
                <TextArea key={key} label={labelize(key)} value={String(value[key] ?? "")} onChange={(next) => onChange({ ...value, [key]: next })} />
              ) : (
                <Field key={key} label={labelize(key)} name={key} value={String(value[key] ?? "")} onChange={(next) => onChange({ ...value, [key]: fields[key] === 0 ? Number(next) : next })} />
              ),
            )}
          </div>
          <button className="btn-primary focus-ring inline-flex w-max items-center gap-2 rounded-full px-5 py-3 text-sm font-black" type="submit">
            <Save size={16} aria-hidden /> Save {title}
          </button>
        </form>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article className="rounded-2xl border border-violet-300/15 bg-white/[0.04] p-4" key={String(item.id)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-black text-white">{String(item.title ?? item.name ?? item.platform ?? "Untitled")}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#b9b0d4]">{String(item.short_description ?? item.description ?? item.role ?? item.url ?? "")}</p>
                </div>
                <button className="rounded-full border border-rose-300/30 px-4 py-2 text-sm font-black text-rose-200" onClick={() => remove(`${removePath}/${item.id}`)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 ? <Empty>No records yet.</Empty> : null}
        </div>
      </Panel>
    );
  }
}

function Panel({ children, id, title }: { children: React.ReactNode; id: string; title: string }) {
  return (
    <section className="premium-card rounded-3xl p-5" id={id}>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="premium-card rounded-3xl p-5">
      <p className="text-sm font-bold text-[#b9b0d4]">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Field({ label, name, onChange, required, type = "text", value }: { label: string; name: string; onChange?: (value: string) => void; required?: boolean; type?: string; value?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#d8d0ee]">{label}</span>
      <input className="field focus-ring mt-2 w-full rounded-2xl px-4 py-3 text-sm" name={name} onChange={(event) => onChange?.(event.target.value)} required={required} type={type} value={value} />
    </label>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-black text-[#d8d0ee]">{label}</span>
      <textarea className="field focus-ring mt-2 min-h-28 w-full rounded-2xl px-4 py-3 text-sm" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function ReviewCard({ actions, item }: { actions: readonly (readonly [string, () => void])[]; item: Record<string, string> }) {
  return (
    <article className="rounded-2xl border border-violet-300/15 bg-white/[0.04] p-4">
      <h3 className="font-black text-white">{item.full_name ?? item.name ?? item.subject}</h3>
      <p className="mt-2 text-sm leading-6 text-[#b9b0d4]">{item.cover_message ?? item.message ?? item.email}</p>
      {item.resume_url ? (
        <a className="mt-3 inline-flex text-sm font-black text-violet-200" href={item.resume_url} rel="noreferrer" target="_blank">
          Download CV
        </a>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map(([label, action]) => (
          <button className="rounded-full border border-violet-300/20 px-3 py-2 text-xs font-black text-[#d8d0ee]" key={label} onClick={action} type="button">
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-violet-300/15 bg-white/[0.04] p-4 text-sm font-bold text-[#b9b0d4]">{children}</p>;
}

function labelize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
