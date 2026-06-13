import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        question_id AS id,
        question,
        choice_a,
        choice_b,
        choice_c,
        choice_d,
        answer,
        explanation,
        problem_set_id,
        theme_name,
        level,
        wrong_count,
        last_wrong_at
      FROM weak_questions
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得失敗" },
      { status: 500 }
    );
  }
}
