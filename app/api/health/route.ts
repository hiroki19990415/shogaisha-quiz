import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return NextResponse.json(
      {
        status: "error",
        message: "DATABASE_URL が未設定",
        env_keys: Object.keys(process.env).filter((k) =>
          k.startsWith("DATABASE")
        ),
      },
      { status: 500 }
    );
  }

  try {
    const sql = neon(url);
    const result = await sql`SELECT NOW() AS current_time`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      current_time: result[0].current_time,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        message: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
