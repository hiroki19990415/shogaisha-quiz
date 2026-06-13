import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("[health] DATABASE_URL が設定されていません");
    return NextResponse.json(
      {
        status: "error",
        message: "DATABASE_URL が未設定",
        hint: "Vercel の Environment Variables に DATABASE_URL を追加してください",
      },
      { status: 500 }
    );
  }

  try {
    const sql = neon(url);

    // DB接続確認
    const timeResult = await sql`SELECT NOW() AS current_time`;

    // テーブル存在確認
    const tableResult = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const tables = tableResult.map((r) => r.table_name);

    const requiredTables = ["themes", "problem_sets", "questions", "answer_history"];
    const missingTables = requiredTables.filter((t) => !tables.includes(t));

    console.log("[health] 接続OK, テーブル:", tables);
    if (missingTables.length > 0) {
      console.error("[health] 未作成テーブル:", missingTables);
    }

    return NextResponse.json({
      status: missingTables.length === 0 ? "ok" : "warning",
      db: "connected",
      current_time: timeResult[0].current_time,
      tables_found: tables,
      tables_missing: missingTables,
      hint: missingTables.length > 0
        ? "db/schema.sql を Neon の SQL Editor で実行してください"
        : "すべてのテーブルが存在します",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "不明なエラー";
    console.error("[health] DB接続エラー:", msg);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        message: msg,
        hint: "DATABASE_URL の値が正しいか Neon Console で確認してください",
      },
      { status: 500 }
    );
  }
}
