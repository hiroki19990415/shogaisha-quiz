import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sql = getDb();
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: "無効なID" }, { status: 400 });
    }
    const result = await sql`
      DELETE FROM themes WHERE id = ${numId} RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json({ error: "テーマが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id: numId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "削除失敗" },
      { status: 500 }
    );
  }
}

// テーマの並び順を変更する（direction: "up" | "down"）
export async function PATCH(
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

    const { direction } = await req.json();
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json({ error: "direction は up または down を指定してください" }, { status: 400 });
    }

    // 全テーマを sort_order 順で取得
    const themes = await sql`
      SELECT id, sort_order FROM themes ORDER BY sort_order ASC, created_at ASC
    `;

    // sort_order の重複を正規化（1, 2, 3, ... に振り直す）
    await Promise.all(
      themes.map((t, i) =>
        sql`UPDATE themes SET sort_order = ${i + 1} WHERE id = ${t.id}`
      )
    );

    const idx = themes.findIndex((t) => t.id === numId);
    if (idx === -1) {
      return NextResponse.json({ error: "テーマが見つかりません" }, { status: 404 });
    }

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= themes.length) {
      return NextResponse.json({ message: "移動不要（端にいます）" });
    }

    // 正規化後の連番でスワップ
    const currentOrder = idx + 1;
    const swapOrder = swapIdx + 1;

    await sql`UPDATE themes SET sort_order = ${swapOrder} WHERE id = ${themes[idx].id}`;
    await sql`UPDATE themes SET sort_order = ${currentOrder} WHERE id = ${themes[swapIdx].id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "並び替え失敗" },
      { status: 500 }
    );
  }
}
