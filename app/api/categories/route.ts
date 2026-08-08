import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    const categories = await sql`
      SELECT id, name, sort_order, created_at
      FROM categories
      ORDER BY sort_order ASC, created_at ASC
    `;
    return NextResponse.json(categories);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "取得失敗";
    console.error("[categories GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "大テーマ名は必須です" }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO categories (name, sort_order)
      VALUES (
        ${name.trim()},
        COALESCE((SELECT MAX(sort_order) FROM categories), 0) + 1
      )
      RETURNING id, name, sort_order, created_at
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "登録失敗";
    const isDuplicate = msg.includes("unique") || msg.includes("duplicate");
    return NextResponse.json(
      { error: isDuplicate ? "その大テーマ名はすでに登録されています" : msg },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
