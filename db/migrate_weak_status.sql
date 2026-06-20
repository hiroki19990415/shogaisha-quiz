-- =============================================
-- 苦手問題管理テーブルの追加マイグレーション
-- Neon SQL Editor でこのファイルの内容を実行してください
-- =============================================

-- Step 1: weak_question_status テーブルを作成
CREATE TABLE IF NOT EXISTS weak_question_status (
  question_id    INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  correct_streak INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: 既存の answer_history から苦手問題を移行
--   （過去に一度でも不正解だった問題を is_active=true で登録）
INSERT INTO weak_question_status (question_id, correct_streak, is_active, updated_at)
SELECT DISTINCT question_id, 0, true, NOW()
FROM answer_history
WHERE is_correct = false
ON CONFLICT (question_id) DO NOTHING;

-- Step 3: 既存の weak_questions ビューを差し替え
DROP VIEW IF EXISTS weak_questions;

CREATE VIEW weak_questions AS
SELECT
  q.id             AS question_id,
  q.question,
  q.choice_a,
  q.choice_b,
  q.choice_c,
  q.choice_d,
  q.answer,
  q.explanation,
  q.problem_set_id,
  ps.theme_id,
  t.name           AS theme_name,
  ps.level,
  wqs.correct_streak,
  wqs.updated_at   AS last_wrong_at
FROM weak_question_status wqs
JOIN questions    q  ON q.id  = wqs.question_id
JOIN problem_sets ps ON ps.id = q.problem_set_id
JOIN themes       t  ON t.id  = ps.theme_id
WHERE wqs.is_active = true
ORDER BY wqs.updated_at DESC;
