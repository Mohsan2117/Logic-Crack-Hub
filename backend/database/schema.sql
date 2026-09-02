CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS section_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  play_store_url TEXT NOT NULL DEFAULT '',
  package_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'development' CHECK (status IN ('development', 'pre_registration', 'published', 'hidden')),
  version TEXT NOT NULL DEFAULT '',
  release_date TIMESTAMPTZ NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_public ON games (is_active, status, display_order);

CREATE TABLE IF NOT EXISTS game_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  short_bio TEXT NOT NULL DEFAULT '',
  profile_image_url TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status, display_order);

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '',
  cover_message TEXT NOT NULL,
  resume_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_created ON job_applications (created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES
  ('studio_name', 'Logic Crack Studio'),
  ('hero_title', 'We Build Engaging Android Games'),
  ('hero_tagline', 'Turning Ideas Into Android Games'),
  ('hero_description', 'Logic Crack Studio creates engaging Unity-powered Android games, combining gameplay, design, optimization, and polished mobile experiences for Google Play.'),
  ('contact_email', 'logiccrack864@gmail.com'),
  ('contact_phone', '+92-304-3285741'),
  ('location', 'Post Office Chak No. 42-A, Chak No. 41 ABS, Tehsil Liaquatpur, District Rahim Yar Khan, Punjab, Pakistan.'),
  ('secondary_location', 'Bahawalpur, Pakistan. Near Satellite Town, Bahawalpur, Punjab, Pakistan.'),
  ('map_url', 'https://www.google.com/maps/search/?api=1&query=Post%20Office%20Chak%20No.%2042-A%2C%20Chak%20No.%2041%20ABS%2C%20Tehsil%20Liaquatpur%2C%20District%20Rahim%20Yar%20Khan%2C%20Punjab%2C%20Pakistan'),
  ('contact_form_recipient', ''),
  ('footer_description', 'Logic Crack Studio is focused on creating Unity-powered Android games with polished gameplay, responsive interfaces, and release-ready mobile performance.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO section_settings (section_key, is_enabled, display_order) VALUES
  ('studio_highlights', TRUE, 10),
  ('games', TRUE, 20),
  ('services', TRUE, 30),
  ('about', TRUE, 40),
  ('why_logic_crack', TRUE, 50),
  ('development_process', TRUE, 60),
  ('team', FALSE, 70),
  ('careers', FALSE, 80),
  ('contact', TRUE, 90)
ON CONFLICT (section_key) DO NOTHING;
