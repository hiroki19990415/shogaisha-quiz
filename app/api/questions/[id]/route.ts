import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getDb();
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "無効なID" }, { status: 400 });
    }

    const body = await req.json();
    const { question, choice_a, choice_b, choice_c, choice_d, answer, explanation } = body;

    if (!question || !choice_a || !choice_b || !choice_c || !choice_d || !answer) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (!["A", "B", "C", "D"].includes(answer)) {
      return NextResponse.json({ error: "answer は A/B/C/D のいずれかです" }, { status: 400 });
    }

    const result = await sql`
      UPDATE questions
      SET
        question    = ${question},
        choice_a    = ${choice_a},
        choice_b    = ${choice_b},
        choice_c    = ${choice_c},
        choice_d    = ${choice_d},
        answer      = ${answer},
        explanation = ${explanation ?? null}
      WHERE id = ${numId}
      RETURNING id, problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "更新失敗";
    console.error("[questions PUT]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
