-- =============================================
-- 大テーマ（categories）対応マイグレーション
-- =============================================

-- 1. categories テーブルを作成
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- 2. themes に category_id FK を追加（nullable：既存データを壊さない）
ALTER TABLE themes ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_themes_category_id ON themes(category_id);

-- 3. 既存テーマを「障害者総合支援法」カテゴリに一括割り当て
INSERT INTO categories (name, sort_order)
VALUES ('障害者総合支援法', 1)
ON CONFLICT (name) DO NOTHING;

UPDATE themes
SET category_id = (SELECT id FROM categories WHERE name = '障害者総合支援法')
WHERE category_id IS NULL;
