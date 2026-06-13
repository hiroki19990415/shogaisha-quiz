import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        ah.id,
        ah.question_id,
        ah.is_correct,
        ah.answered_at,
        q.question,
        t.name AS theme_name,
        ps.level
      FROM answer_history ah
      JOIN questions    q  ON q.id  = ah.question_id
      JOIN problem_sets ps ON ps.id = q.problem_set_id
      JOIN themes       t  ON t.id  = ps.theme_id
      ORDER BY ah.answered_at DESC
      LIMIT 50
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
    const { question_id, is_correct } = await req.json();
    if (question_id == null || is_correct == null) {
      return NextResponse.json(
        { error: "question_id と is_correct は必須です" },
        { status: 400 }
      );
    }
    const result = await sql`
      INSERT INTO answer_history (question_id, is_correct)
      VALUES (${Number(question_id)}, ${Boolean(is_correct)})
      RETURNING id, question_id, is_correct, answered_at
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失敗" },
      { status: 500 }
    );
  }
}
