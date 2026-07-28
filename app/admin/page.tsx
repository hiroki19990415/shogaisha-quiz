"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  parseMarkdownQuestions,
  ParsedQuestion,
} from "@/lib/parseMarkdownQuestions";

// ----------------------------------------------------------------
// 型定義
// ----------------------------------------------------------------
type Level = "初級" | "中級" | "上級";
type FileStatus =
  | "checking"   // DBの既存状態を確認中
  | "pending"    // 取り込み待機中
  | "importing"  // 取り込み中
  | "success"    // 取り込み完了
  | "skipped"    // 上書きOFFで既存あり → スキップ
  | "error";     // エラー

interface FilePreview {
  id: string;
  filename: string;
  themeName: string | null;
  level: Level | null;
  content: string;
  questions: ParsedQuestion[];
  parseErrors: string[];
  status: FileStatus;
  existingCount: number;   // DB上の既存問題数
  overwrite: boolean;      // 上書きするか
  importedCount?: number;
  errorMessage?: string;
}

// ----------------------------------------------------------------
// 定数
// ----------------------------------------------------------------
const LEVEL_BADGE: Record<Level, string> = {
  初級: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  中級: "bg-amber-100 text-amber-700 ring-amber-200",
  上級: "bg-rose-100 text-rose-700 ring-rose-200",
};

// ----------------------------------------------------------------
// ユーティリティ
// ----------------------------------------------------------------
function parseFilename(
  filename: string
): { themeName: string; level: Level } | null {
  const match = filename.match(/^\d+_(.+)_(初級|中級|上級)\.md$/);
  if (!match) return null;
  return { themeName: match[1], level: match[2] as Level };
}

// ----------------------------------------------------------------
// メインページ
// ----------------------------------------------------------------
export default function AdminImportPage() {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPageDragging, setIsPageDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      setIsPageDragging(true);
    };
    // ブラウザのデフォルトドロップ（ファイルを新しいタブで開く）を防ぐ
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const mdFiles = rawFiles.filter((f) => f.name.endsWith(".md"));
    if (mdFiles.length === 0) return;

    // 既存リストと重複するファイルを除外
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.filename));
      return prev; // 後でフィルタリング
      void existingNames;
    });

    // ローカルパース（ファイル名 + マークダウン）
    const previews: FilePreview[] = await Promise.all(
      mdFiles.map(async (file) => {
        const content = await file.text();
        const parsed = parseFilename(file.name);
        const { questions, errors } = parseMarkdownQuestions(content);
        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          filename: file.name,
          themeName: parsed?.themeName ?? null,
          level: parsed?.level ?? null,
          content,
          questions,
          parseErrors: errors,
          status: "checking" as FileStatus,
          existingCount: 0,
          overwrite: false,
        };
      })
    );

    // 重複除外して追加
    let newPreviews: FilePreview[] = [];
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.filename));
      newPreviews = previews.filter((p) => !existingNames.has(p.filename));
      return [...prev, ...newPreviews];
    });

    // ファイル名が正しいものだけDB問い合わせ
    const toCheck = newPreviews.filter((p) => p.themeName !== null);
    const newIds = new Set(newPreviews.map((p) => p.id));

    if (toCheck.length > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch("/api/admin/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: toCheck.map((f) => ({ filename: f.filename })),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        type PreviewResult = { filename: string; existingCount: number };
        const resultMap = new Map<string, number>(
          (data.results as PreviewResult[])?.map((r) => [
            r.filename,
            r.existingCount,
          ]) ?? []
        );

        setFiles((prev) =>
          prev.map((f) => {
            if (!newIds.has(f.id)) return f;
            const existingCount = resultMap.get(f.filename) ?? 0;
            return { ...f, status: "pending", existingCount };
          })
        );
      } catch {
        // DB問い合わせ失敗時もpendingにしてインポート続行可能にする
        setFiles((prev) =>
          prev.map((f) =>
            newIds.has(f.id) ? { ...f, status: "pending" } : f
          )
        );
      }
    } else {
      // ファイル名不正なもの（チェック不要）もpendingへ
      setFiles((prev) =>
        prev.map((f) =>
          newIds.has(f.id) ? { ...f, status: "pending" } : f
        )
      );
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles]
  );

  const toggleOverwrite = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, overwrite: !f.overwrite } : f))
    );
  };

  const handleImport = async () => {
    const targets = files.filter(
      (f) =>
        f.status === "pending" &&
        f.themeName &&
        f.questions.length > 0
    );
    if (targets.length === 0) return;

    setIsImporting(true);
    setFiles((prev) =>
      prev.map((f) =>
        targets.some((t) => t.id === f.id) ? { ...f, status: "importing" } : f
      )
    );

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: targets.map((f) => ({
            filename: f.filename,
            content: f.content,
            overwrite: f.overwrite,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "インポートに失敗しました");

      type ImportResult = {
        filename: string;
        success: boolean;
        skipped?: boolean;
        imported?: number;
        existingCount?: number;
        error?: string;
      };

      setFiles((prev) =>
        prev.map((f) => {
          const result: ImportResult | undefined = data.results?.find(
            (r: ImportResult) => r.filename === f.filename
          );
          if (!result) return f;
          if (result.success && result.skipped) {
            return {
              ...f,
              status: "skipped",
              existingCount: result.existingCount ?? f.existingCount,
            };
          }
          if (result.success) {
            return { ...f, status: "success", importedCount: result.imported };
          }
          return { ...f, status: "error", errorMessage: result.error };
        })
      );
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "importing"
            ? {
                ...f,
                status: "error",
                errorMessage:
                  err instanceof Error ? err.message : "エラーが発生しました",
              }
            : f
        )
      );
    } finally {
      setIsImporting(false);
    }
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const clearAll = () => setFiles([]);

  // 取り込みボタン表示用カウント
  const activeTargets = files.filter(
    (f) =>
      f.status === "pending" &&
      f.themeName &&
      f.questions.length > 0 &&
      (f.existingCount === 0 || f.overwrite)
  );
  const skipTargets = files.filter(
    (f) =>
      f.status === "pending" &&
      f.themeName &&
      f.questions.length > 0 &&
      f.existingCount > 0 &&
      !f.overwrite
  );
  const pendingTotal = files.filter(
    (f) => f.status === "pending" && f.themeName && f.questions.length > 0
  ).length;

  const totalImported = files
    .filter((f) => f.status === "success")
    .reduce((sum, f) => sum + (f.importedCount ?? 0), 0);
  const successCount = files.filter((f) => f.status === "success").length;
  const skippedCount = files.filter((f) => f.status === "skipped").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 全画面ドロップオーバーレイ */}
      {isPageDragging && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-600/90 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            // relatedTarget が null = カーソルがウィンドウ外に出た
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsPageDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsPageDragging(false);
            processFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center animate-bounce">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white tracking-wide">
              ここにドロップ
            </p>
            <p className="text-sm text-blue-100">.md ファイルを離してください</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* ページヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">問題インポート管理</h1>
          </div>
          <p className="text-sm text-slate-500 ml-11">
            MDファイルをドロップして問題を一括取り込みます。ファイル名は{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">
              01_テーマ名_初級.md
            </code>{" "}
            の形式にしてください。
          </p>
        </div>

        {/* ドロップゾーン */}
        <div
          role="button"
          tabIndex={0}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".md"
            multiple
            className="hidden"
            onChange={(e) => {
              processFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging ? "bg-blue-100" : "bg-slate-100"
              }`}
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  isDragging ? "text-blue-500" : "text-slate-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p
                className={`text-sm font-semibold transition-colors ${
                  isDragging ? "text-blue-600" : "text-slate-700"
                }`}
              >
                {isDragging
                  ? "ここでドロップ"
                  : "MDファイルをドロップ、またはクリックして選択"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                複数ファイル同時対応 · .mdファイルのみ
              </p>
            </div>
          </div>
        </div>

        {/* ファイルプレビュー */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* リストヘッダー */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-700">
                プレビュー
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {files.length}件
                </span>
              </h2>
              <button
                onClick={clearAll}
                disabled={isImporting}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
              >
                すべて削除
              </button>
            </div>

            {/* ファイルカード一覧 */}
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
                onToggleOverwrite={() => toggleOverwrite(file.id)}
              />
            ))}

            {/* 取り込みボタン */}
            {pendingTotal > 0 && (
              <div className="pt-3 space-y-2">
                <button
                  onClick={handleImport}
                  disabled={isImporting || activeTargets.length === 0}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  {isImporting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      取り込み中...
                    </span>
                  ) : activeTargets.length > 0 ? (
                    <>
                      {activeTargets.length}件を取り込む
                      {skipTargets.length > 0 && (
                        <span className="ml-2 text-blue-200 font-normal">
                          （{skipTargets.length}件スキップ）
                        </span>
                      )}
                    </>
                  ) : (
                    "取り込む対象がありません（上書きをONにしてください）"
                  )}
                </button>
                {skipTargets.length > 0 && activeTargets.length > 0 && (
                  <p className="text-xs text-center text-slate-400">
                    既存あり・上書きOFF のファイルはスキップされます
                  </p>
                )}
              </div>
            )}

            {/* 完了サマリー */}
            {(successCount > 0 || skippedCount > 0) &&
              pendingTotal === 0 &&
              !isImporting && (
                <div className="flex flex-col items-center gap-1 py-3">
                  {successCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                      <svg
                        className="w-5 h-5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {successCount}ファイル・{totalImported}問の取り込みが完了しました
                    </div>
                  )}
                  {skippedCount > 0 && (
                    <p className="text-xs text-slate-400">
                      {skippedCount}件はスキップされました
                    </p>
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// ファイルカード
// ----------------------------------------------------------------
function FileCard({
  file,
  onRemove,
  onToggleOverwrite,
}: {
  file: FilePreview;
  onRemove: () => void;
  onToggleOverwrite: () => void;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const isInvalid = !file.themeName || file.questions.length === 0;
  const hasExisting = file.existingCount > 0;

  const cardClass = [
    "rounded-xl border bg-white p-4 transition-all",
    file.status === "success" && "border-emerald-200 bg-emerald-50",
    file.status === "skipped" && "border-slate-200 bg-slate-50",
    file.status === "error" && "border-rose-200 bg-rose-50",
    file.status === "importing" && "border-blue-200 bg-blue-50",
    file.status === "checking" && "border-slate-200",
    file.status === "pending" && isInvalid && "border-amber-200 bg-amber-50",
    file.status === "pending" &&
      !isInvalid &&
      hasExisting &&
      !file.overwrite &&
      "border-orange-200",
    file.status === "pending" &&
      !isInvalid &&
      (!hasExisting || file.overwrite) &&
      "border-slate-200",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3">
        {/* ステータスアイコン */}
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={file.status} isInvalid={isInvalid} />
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          {/* ファイル名 */}
          <p className="text-xs font-mono text-slate-500 truncate mb-1">
            {file.filename}
          </p>

          {/* テーマ名 + レベルバッジ + 問題数 */}
          {file.themeName ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {file.themeName}
              </span>
              {file.level && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${
                    LEVEL_BADGE[file.level]
                  }`}
                >
                  {file.level}
                </span>
              )}
              {file.status !== "checking" && (
                <span className="text-xs text-slate-400">
                  {file.questions.length}問
                </span>
              )}
              {/* 既存問題バッジ */}
              {file.status === "pending" && hasExisting && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-200">
                  DB既存 {file.existingCount}問
                </span>
              )}
              {/* 完了 */}
              {file.status === "success" && (
                <span className="text-xs font-medium text-emerald-600">
                  → {file.importedCount}問 取り込み完了
                  {file.overwrite && (
                    <span className="ml-1 text-emerald-500">（上書き）</span>
                  )}
                </span>
              )}
              {/* スキップ */}
              {file.status === "skipped" && (
                <span className="text-xs text-slate-400">
                  スキップ（既存 {file.existingCount}問を保持）
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-600">
              ファイル名の形式が不正です（例: 01_テーマ名_初級.md）
            </p>
          )}

          {/* DB確認中インジケータ */}
          {file.status === "checking" && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <span className="w-3 h-3 border border-slate-300 border-t-slate-500 rounded-full animate-spin inline-block" />
              DBを確認中...
            </p>
          )}

          {/* 上書きトグル（既存あり・pending時のみ） */}
          {file.status === "pending" && hasExisting && !isInvalid && (
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div
                  onClick={onToggleOverwrite}
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    file.overwrite ? "bg-orange-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                      file.overwrite ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-600 select-none">
                  {file.overwrite
                    ? "上書きする（既存問題を削除して入れ替え）"
                    : "上書きしない（スキップ）"}
                </span>
              </label>
            </div>
          )}

          {/* パースエラー */}
          {file.parseErrors.length > 0 && (
            <div className="mt-2">
              <button
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                onClick={() => setShowErrors((v) => !v)}
              >
                <svg
                  className={`w-3 h-3 transition-transform ${
                    showErrors ? "rotate-90" : ""
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                パースエラー {file.parseErrors.length}件
              </button>
              {showErrors && (
                <ul className="mt-1.5 space-y-0.5 pl-4">
                  {file.parseErrors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-700">
                      · {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* インポートエラー */}
          {file.status === "error" && file.errorMessage && (
            <p className="mt-1 text-xs text-rose-600">{file.errorMessage}</p>
          )}

          {/* Q1 プレビュー（待機中のみ） */}
          {file.questions.length > 0 && file.status === "pending" && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-0.5">Q1 プレビュー</p>
              <p className="text-xs text-slate-600 line-clamp-2">
                {file.questions[0].question}
              </p>
            </div>
          )}
        </div>

        {/* 削除ボタン */}
        {file.status !== "importing" && file.status !== "checking" && (
          <button
            onClick={onRemove}
            className="flex-shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="削除"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// ステータスアイコン
// ----------------------------------------------------------------
function StatusIcon({
  status,
  isInvalid,
}: {
  status: FileStatus;
  isInvalid: boolean;
}) {
  if (status === "checking" || status === "importing") {
    return (
      <span
        className={`w-5 h-5 border-2 rounded-full animate-spin inline-block ${
          status === "importing"
            ? "border-blue-500 border-t-transparent"
            : "border-slate-300 border-t-slate-500"
        }`}
      />
    );
  }
  if (status === "success") {
    return (
      <svg
        className="w-5 h-5 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "skipped") {
    return (
      <svg
        className="w-5 h-5 text-slate-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (status === "error" || isInvalid) {
    return (
      <svg
        className="w-5 h-5 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-slate-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
