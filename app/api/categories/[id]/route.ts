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
      DELETE FROM categories WHERE id = ${numId} RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json({ error: "大テーマが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id: numId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "削除失敗" },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();

    // 名前変更
    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "大テーマ名は必須です" }, { status: 400 });
      }
      const result = await sql`
        UPDATE categories SET name = ${trimmed} WHERE id = ${numId}
        RETURNING id, name, sort_order, created_at
      `;
      if (result.length === 0) {
        return NextResponse.json({ error: "大テーマが見つかりません" }, { status: 404 });
      }
      return NextResponse.json(result[0]);
    }

    // 並び替え
    const { direction } = body;
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json(
        { error: "direction は up または down を指定してください" },
        { status: 400 }
      );
    }

    const categories = await sql`
      SELECT id, sort_order FROM categories ORDER BY sort_order ASC, created_at ASC
    `;

    // sort_order を正規化
    await Promise.all(
      categories.map((c, i) =>
        sql`UPDATE categories SET sort_order = ${i + 1} WHERE id = ${c.id}`
      )
    );

    const idx = categories.findIndex((c) => c.id === numId);
    if (idx === -1) {
      return NextResponse.json({ error: "大テーマが見つかりません" }, { status: 404 });
    }

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) {
      return NextResponse.json({ message: "移動不要（端にいます）" });
    }

    await sql`UPDATE categories SET sort_order = ${swapIdx + 1} WHERE id = ${categories[idx].id}`;
    await sql`UPDATE categories SET sort_order = ${idx + 1} WHERE id = ${categories[swapIdx].id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失敗" },
      { status: 500 }
    );
  }
}
