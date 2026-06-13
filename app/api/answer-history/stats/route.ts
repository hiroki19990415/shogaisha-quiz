import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();

    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                        AS total,
        COUNT(*) FILTER (WHERE is_correct = true)::int      AS correct,
        COUNT(*) FILTER (WHERE is_correct = false)::int     AS incorrect
      FROM answer_history
    `;

    const [weakCount] = await sql`
      SELECT COUNT(DISTINCT question_id)::int AS weak_count
      FROM answer_history
      WHERE is_correct = false
    `;

    const recent = await sql`
      SELECT
        ah.id,
        ah.is_correct,
        ah.answered_at,
        q.question,
        t.name  AS theme_name,
        ps.level
      FROM answer_history ah
      JOIN questions    q  ON q.id  = ah.question_id
      JOIN problem_sets ps ON ps.id = q.problem_set_id
      JOIN themes       t  ON t.id  = ps.theme_id
      ORDER BY ah.answered_at DESC
      LIMIT 10
    `;

    const total = totals.total ?? 0;
    const correct = totals.correct ?? 0;
    const correctRate = total > 0 ? Math.round((correct / total) * 100) : null;

    return NextResponse.json({
      total,
      correct,
      incorrect: totals.incorrect ?? 0,
      correct_rate: correctRate,
      weak_count: weakCount.weak_count ?? 0,
      recent,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "取得失敗";
    console.error("[answer-history/stats GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
