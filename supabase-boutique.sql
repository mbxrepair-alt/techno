-- Boutique : produits / accessoires (stock, prix achat/vente) + ventes.
-- À exécuter une fois dans Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  user_id uuid,
  name text NOT NULL,
  category text DEFAULT '',
  stock integer NOT NULL DEFAULT 0,
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  barcode text DEFAULT '',
  imei text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Si la table products existe déjà, ajouter les colonnes :
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS imei text DEFAULT '';

CREATE TABLE IF NOT EXISTS product_sales (
  id bigserial PRIMARY KEY,
  user_id uuid,
  product_id bigint,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sold_by text DEFAULT '',
  sold_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full_access_products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "full_access_product_sales" ON product_sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
