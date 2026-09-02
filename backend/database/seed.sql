-- Local development admin.
-- Email: admin@logiccrackstudio.local
-- Password: password
-- Change this password immediately in any shared or deployed environment.
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Logic Crack Admin',
  'admin@logiccrackstudio.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = now();

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
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

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
ON CONFLICT (section_key) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  display_order = EXCLUDED.display_order,
  updated_at = now();
