import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
