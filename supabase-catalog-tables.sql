-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS custom_issues (
  id bigserial PRIMARY KEY,
  label text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_issues_label_unique UNIQUE (label)
);

CREATE TABLE IF NOT EXISTS custom_devices (
  id bigserial PRIMARY KEY,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_devices_label_unique UNIQUE (label)
);

-- Activer RLS
ALTER TABLE custom_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_devices ENABLE ROW LEVEL SECURITY;

-- Accès total (app interne — service role bypasse RLS de toute façon)
CREATE POLICY "full_access_custom_issues"  ON custom_issues  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access_custom_devices" ON custom_devices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
