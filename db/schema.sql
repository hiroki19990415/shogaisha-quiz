-- =============================================
-- 障害者総合支援法クイズツール
-- Neon (PostgreSQL) テーブル定義
-- =============================================

-- 既存テーブルを削除（再作成時用）
DROP TABLE IF EXISTS answer_history CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS problem_sets CASCADE;
DROP TABLE IF EXISTS themes CASCADE;

-- =============================================
-- テーマ
-- =============================================
CREATE TABLE themes (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- 問題集（テーマごと・レベルごと）
-- =============================================
CREATE TABLE problem_sets (
  id         SERIAL PRIMARY KEY,
  theme_id   INTEGER      NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  level      VARCHAR(10)  NOT NULL CHECK (level IN ('初級', '中級', '上級')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================
-- 問題
-- =============================================
CREATE TABLE questions (
  id             SERIAL PRIMARY KEY,
  problem_set_id INTEGER NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  question       TEXT    NOT NULL,
  choice_a       TEXT    NOT NULL,
  choice_b       TEXT    NOT NULL,
  choice_c       TEXT    NOT NULL,
  choice_d       TEXT    NOT NULL,
  answer         CHAR(1) NOT NULL CHECK (answer IN ('A', 'B', 'C', 'D')),
  explanation    TEXT
);

-- =============================================
-- 解答履歴
-- =============================================
CREATE TABLE answer_history (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_correct  BOOLEAN     NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- インデックス（検索高速化）
-- =============================================
CREATE INDEX idx_problem_sets_theme_id   ON problem_sets(theme_id);
CREATE INDEX idx_questions_problem_set_id ON questions(problem_set_id);
CREATE INDEX idx_answer_history_question_id ON answer_history(question_id);
CREATE INDEX idx_answer_history_answered_at ON answer_history(answered_at DESC);

-- =============================================
-- 苦手問題ステータス管理テーブル
-- =============================================
CREATE TABLE weak_question_status (
  question_id    INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  correct_streak INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ビュー：苦手問題（is_active=true の問題のみ）
-- =============================================
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

-- =============================================
-- サンプルデータ（動作確認用）
-- =============================================

-- テーマ
INSERT INTO themes (name) VALUES
  ('補装具'),
  ('支給決定'),
  ('障害支援区分');

-- 問題集（補装具・初級）
INSERT INTO problem_sets (theme_id, level) VALUES
  (1, '初級');

-- 問題（補装具 初級 1問目）
INSERT INTO questions (problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation)
VALUES (
  1,
  '補装具費の支給対象となる補装具として、正しいものはどれか。',
  '日常生活用具',
  '義肢',
  '住宅改修費',
  '介護給付費',
  'B',
  '補装具費の支給対象は義肢、装具、車椅子など身体の欠損や損傷を補うための用具です。日常生活用具は別制度（日常生活用具給付等事業）で給付されます。'
);

-- 解答履歴サンプル（不正解）
INSERT INTO answer_history (question_id, is_correct)
VALUES (1, false);
