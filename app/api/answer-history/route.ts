import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
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
    const sql = getDb();
    const { question_id, is_correct } = await req.json();
    if (question_id == null || is_correct == null) {
      return NextResponse.json(
        { error: "question_id と is_correct は必須です" },
        { status: 400 }
      );
    }

    const qId = Number(question_id);
    const correct = Boolean(is_correct);

    // 1. 解答履歴を保存
    const result = await sql`
      INSERT INTO answer_history (question_id, is_correct)
      VALUES (${qId}, ${correct})
      RETURNING id, question_id, is_correct, answered_at
    `;

    // 2. 苦手問題ステータスを更新
    if (!correct) {
      // 不正解 → 苦手登録（連続正解数リセット）
      await sql`
        INSERT INTO weak_question_status (question_id, correct_streak, is_active, updated_at)
        VALUES (${qId}, 0, true, NOW())
        ON CONFLICT (question_id)
        DO UPDATE SET
          correct_streak = 0,
          is_active      = true,
          updated_at     = NOW()
      `;
    } else {
      // 正解 → 苦手登録済みなら連続正解数を+1、2回連続で苦手解除
      await sql`
        UPDATE weak_question_status
        SET
          correct_streak = correct_streak + 1,
          is_active = CASE
            WHEN correct_streak + 1 >= 2 THEN false
            ELSE true
          END,
          updated_at = NOW()
        WHERE question_id = ${qId}
          AND is_active = true
      `;
    }

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "保存失敗";
    console.error("[answer-history POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
