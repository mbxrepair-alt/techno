-- Paie des techniciens : salaire de base + commission sur le CA généré.
-- À exécuter une fois dans Supabase → SQL Editor.

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS base_salaire numeric NOT NULL DEFAULT 0;

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0; -- en %
