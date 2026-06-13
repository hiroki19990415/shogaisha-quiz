import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const themeId = req.nextUrl.searchParams.get("themeId");
  if (!themeId) {
    return NextResponse.json({ error: "themeId は必須です" }, { status: 400 });
  }
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        ps.id,
        ps.theme_id,
        ps.level,
        ps.created_at,
        COUNT(q.id)::int AS question_count
      FROM problem_sets ps
      LEFT JOIN questions q ON q.problem_set_id = ps.id
      WHERE ps.theme_id = ${Number(themeId)}
      GROUP BY ps.id
      ORDER BY ps.created_at ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得失敗" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { theme_id, level } = await req.json();
    const validLevels = ["初級", "中級", "上級"];
    if (!theme_id || !validLevels.includes(level)) {
      return NextResponse.json(
        { error: "theme_id と level（初級/中級/上級）は必須です" },
        { status: 400 }
      );
    }
    const result = await sql`
      INSERT INTO problem_sets (theme_id, level)
      VALUES (${Number(theme_id)}, ${level})
      RETURNING id, theme_id, level, created_at
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登録失敗" },
      { status: 500 }
    );
  }
}
