import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const themes = await sql`
      SELECT id, name, created_at
      FROM themes
      ORDER BY created_at DESC
    `;
    return NextResponse.json(themes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "取得失敗" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "テーマ名は必須です" }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO themes (name)
      VALUES (${name.trim()})
      RETURNING id, name, created_at
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "登録失敗";
    const isDuplicate = msg.includes("unique") || msg.includes("duplicate");
    return NextResponse.json(
      { error: isDuplicate ? "そのテーマ名はすでに登録されています" : msg },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
