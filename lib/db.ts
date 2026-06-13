import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// ビルド時ではなく、実際にAPIが呼ばれた時点で接続する（遅延初期化）
let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL が設定されていません。.env.local または Vercel の環境変数を確認してください。"
    );
  }
  _sql = neon(url);
  return _sql;
}

export default getDb;
