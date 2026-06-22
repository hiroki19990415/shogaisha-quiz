import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { parseMarkdownQuestions } from "@/lib/parseMarkdownQuestions";

export async function POST(req: NextRequest) {
  try {
    const { problem_set_id, markdown } = await req.json();

    if (!problem_set_id || !markdown?.trim()) {
      return NextResponse.json(
        { error: "problem_set_id と markdown は必須です" },
        { status: 400 }
      );
    }

    // マークダウンを解析
    const { questions, errors } = parseMarkdownQuestions(markdown);

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "問題を1件も解析できませんでした",
          parse_errors: errors,
        },
        { status: 400 }
      );
    }

    const sql = getDb();
    const inserted: number[] = [];

    for (const q of questions) {
      const result = await sql`
        INSERT INTO questions
          (problem_set_id, question, choice_a, choice_b, choice_c, choice_d, answer, explanation)
        VALUES
          (
            ${Number(problem_set_id)},
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
      inserted.push(result[0].id as number);
    }

    return NextResponse.json(
      {
        imported: inserted.length,
        ids: inserted,
        parse_errors: errors,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "インポート失敗";
    console.error("[questions/import POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
