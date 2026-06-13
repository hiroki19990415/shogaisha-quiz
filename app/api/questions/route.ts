import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const problemSetId = req.nextUrl.searchParams.get("problemSetId");
  if (!problemSetId) {
    return NextResponse.json({ error: "problemSetId は必須です" }, { status: 400 });
  }
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation
      FROM questions
      WHERE problem_set_id = ${Number(problemSetId)}
      ORDER BY id ASC
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
    const body = await req.json();
    const { problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation } = body;

    if (!problem_set_id || !question || !choice_a || !choice_b || !choice_c || !choice_d || !answer) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (!["A", "B", "C", "D"].includes(answer)) {
      return NextResponse.json({ error: "answer は A/B/C/D のいずれかです" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO questions (problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation)
      VALUES (
        ${Number(problem_set_id)},
        ${question}, ${choice_a}, ${choice_b}, ${choice_c}, ${choice_d},
        ${answer}, ${explanation ?? null}
      )
      RETURNING id, problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "登録失敗" },
      { status: 500 }
    );
  }
}
