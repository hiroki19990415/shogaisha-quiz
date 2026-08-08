-- =============================================
-- テーマ並び替え用 sort_order カラムを追加
-- =============================================

-- sort_order カラムを追加（既存行には一時的に 0 をセット）
ALTER TABLE themes ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 既存テーマに created_at 順で連番をセット（昇順: 古い順 = 上）
UPDATE themes
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM themes
) sub
WHERE themes.id = sub.id;

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_themes_sort_order ON themes(sort_order ASC);
