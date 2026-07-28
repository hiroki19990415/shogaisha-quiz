import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { parseMarkdownQuestions } from "@/lib/parseMarkdownQuestions";

interface FileEntry {
  filename: string;
  content: string;
  /** true のとき既存問題をすべて削除してから挿入する */
  overwrite?: boolean;
}

type Level = "初級" | "中級" | "上級";
const VALID_LEVELS: Level[] = ["初級", "中級", "上級"];

function parseFilename(
  filename: string
): { themeName: string; level: Level } | null {
  const match = filename.match(/^(\d+_.+)_(初級|中級|上級)\.md$/);
  if (!match) return null;
  return { themeName: match[1], level: match[2] as Level };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: FileEntry[] = body?.files;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "files は必須です" },
        { status: 400 }
      );
    }

    const sql = getDb();

    const results = await Promise.all(
      files.map(async (file) => {
        // ファイル名からテーマ名・レベルを解析
        const parsed = parseFilename(file.filename);
        if (!parsed) {
          return {
            filename: file.filename,
            success: false,
            error: `ファイル名の形式が不正です（例: 01_テーマ名_初級.md）`,
          };
        }

        if (!VALID_LEVELS.includes(parsed.level)) {
          return {
            filename: file.filename,
            success: false,
            error: `レベルは「初級」「中級」「上級」のいずれかにしてください`,
          };
        }

        const { themeName, level } = parsed;

        // テーマをupsert（UNIQUE制約あり）
        const themeResult = await sql`
          INSERT INTO themes (name, sort_order)
          VALUES (
            ${themeName},
            COALESCE((SELECT MAX(sort_order) FROM themes), 0) + 1
          )
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        const themeId = themeResult[0].id as number;

        // 問題集を取得または作成（theme_id + levelで検索）
        let problemSetId: number;
        const existingPs = await sql`
          SELECT id FROM problem_sets
          WHERE theme_id = ${themeId} AND level = ${level}
          LIMIT 1
        `;
        if (existingPs.length > 0) {
          problemSetId = existingPs[0].id as number;
        } else {
          const newPs = await sql`
            INSERT INTO problem_sets (theme_id, level)
            VALUES (${themeId}, ${level})
            RETURNING id
          `;
          problemSetId = newPs[0].id as number;
        }

        // 既存問題数チェック
        const existingRows = await sql`
          SELECT COUNT(*)::int AS cnt FROM questions
          WHERE problem_set_id = ${problemSetId}
        `;
        const existingCount = existingRows[0].cnt as number;

        if (existingCount > 0 && !file.overwrite) {
          return {
            filename: file.filename,
            success: true,
            skipped: true,
            themeName,
            level,
            themeId,
            problemSetId,
            existingCount,
          };
        }

        if (existingCount > 0 && file.overwrite) {
          await sql`DELETE FROM questions WHERE problem_set_id = ${problemSetId}`;
        }

        // マークダウンを解析
        const { questions, errors: parseErrors } =
          parseMarkdownQuestions(file.content);

        if (questions.length === 0) {
          return {
            filename: file.filename,
            success: false,
            themeName,
            level,
            themeId,
            problemSetId,
            error: "問題を1件も解析できませんでした",
            parse_errors: parseErrors,
          };
        }

        // 問題を一括挿入
        const inserted: number[] = [];
        for (const q of questions) {
          const r = await sql`
            INSERT INTO questions
              (problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation)
            VALUES
              (
                ${problemSetId},
                ${q.question},
                ${q.choice_a},
                ${q.choice_b},
                ${q.choice_c},
                ${q.choice_d},
                ${q.answer},
                ${q.explanation || null}
              )
            RETURNING id
          `;
          inserted.push(r[0].id as number);
        }

        return {
          filename: file.filename,
          success: true,
          themeName,
          level,
          themeId,
          problemSetId,
          imported: inserted.length,
          parse_errors: parseErrors,
        };
      })
    );

    return NextResponse.json({ results }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "インポート失敗";
    console.error("[admin/import POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
