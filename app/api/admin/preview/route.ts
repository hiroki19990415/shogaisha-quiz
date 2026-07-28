import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

type Level = "初級" | "中級" | "上級";

function parseFilename(
  filename: string
): { themeName: string; level: Level } | null {
  const match = filename.match(/^(\d+_.+)_(初級|中級|上級)\.md$/);
  if (!match) return null;
  return { themeName: match[1], level: match[2] as Level };
}

/**
 * POST /api/admin/preview
 * ファイル名一覧を受け取り、DBの既存問題数を返す（書き込みなし）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: { filename: string }[] = body?.files;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files は必須です" }, { status: 400 });
    }

    const sql = getDb();

    const results = await Promise.all(
      files.map(async ({ filename }) => {
        const parsed = parseFilename(filename);
        if (!parsed) {
          return { filename, exists: false, existingCount: 0 };
        }

        const { themeName, level } = parsed;

        // テーマ検索
        const themeRows = await sql`
          SELECT id FROM themes WHERE name = ${themeName} LIMIT 1
        `;
        if (themeRows.length === 0) {
          return { filename, themeName, level, exists: false, existingCount: 0 };
        }

        // 問題集検索
        const psRows = await sql`
          SELECT id FROM problem_sets
          WHERE theme_id = ${themeRows[0].id as number} AND level = ${level}
          LIMIT 1
        `;
        if (psRows.length === 0) {
          return { filename, themeName, level, exists: false, existingCount: 0 };
        }

        // 既存問題数カウント
        const countRows = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM questions
          WHERE problem_set_id = ${psRows[0].id as number}
        `;
        const existingCount = countRows[0].cnt as number;

        return {
          filename,
          themeName,
          level,
          exists: existingCount > 0,
          existingCount,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "チェック失敗";
    console.error("[admin/preview POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
