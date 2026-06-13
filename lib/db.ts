import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL が設定されていません。.env.local を確認してください。");
}

const sql = neon(url);
export default sql;
