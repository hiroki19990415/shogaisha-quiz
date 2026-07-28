"use client";

import { useEffect, useState } from "react";
import ProblemPanel from "./ProblemPanel";

type Theme = {
  id: number;
  name: string;
  created_at: string;
};

type Props = {
  selectedThemeId: number | null;
  onSelectTheme: (id: number | null) => void;
  selectedProblemSetId: number | null;
  onSelectProblemSet: (id: number | null) => void;
  onQuestionsChanged?: () => void;
};

export default function ThemePanel({
  selectedThemeId,
  onSelectTheme,
  selectedProblemSetId,
  onSelectProblemSet,
  onQuestionsChanged,
}: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  const fetchThemes = async () => {
    const res = await fetch("/api/themes");
    const data = await res.json();
    setThemes(data);
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("このテーマを削除しますか？（関連する問題集・問題も削除されます）")) return;
    const res = await fetch(`/api/themes/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedThemeId === id) {
        onSelectTheme(null);
        onSelectProblemSet(null);
      }
      await fetchThemes();
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
    setLastSelectedIdx(null);
  };

  const toggleSelect = (id: number, idx: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedIdx !== null) {
        // Shift+クリックで範囲選択
        const from = Math.min(lastSelectedIdx, idx);
        const to = Math.max(lastSelectedIdx, idx);
        for (let i = from; i <= to; i++) {
          next.add(themes[i].id);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setLastSelectedIdx(idx);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`選択した ${selectedIds.size} 件のテーマ（および関連する問題集・問題）を削除しますか？`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/themes/${id}`, { method: "DELETE" })
        )
      );
      if (selectedThemeId && selectedIds.has(selectedThemeId)) {
        onSelectTheme(null);
        onSelectProblemSet(null);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      await fetchThemes();
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleMove = async (id: number, direction: "up" | "down") => {
    await fetch(`/api/themes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await fetchThemes();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-lg border-b pb-1">① テーマ管理</h2>

      {/* テーマ一覧 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold">テーマ一覧</p>
          {themes.length > 0 && (
            <button
              onClick={toggleSelectMode}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                selectMode
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
              }`}
            >
              {selectMode ? "キャンセル" : "選択して削除"}
            </button>
          )}
        </div>

        {/* 一括削除ボタン */}
        {selectMode && selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="w-full mb-1 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded disabled:opacity-50"
          >
            {bulkDeleting ? "削除中..." : `選択した ${selectedIds.size} 件を削除`}
          </button>
        )}

        {themes.length === 0 ? (
          <p className="text-gray-400 text-sm">テーマがまだありません</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {themes.map((t, idx) => (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm border ${
                  selectMode
                    ? selectedIds.has(t.id)
                      ? "bg-red-50 border-red-300 cursor-pointer"
                      : "bg-white border-gray-200 cursor-pointer hover:bg-gray-50"
                    : selectedThemeId === t.id
                    ? "bg-blue-100 border-blue-400 cursor-pointer"
                    : "bg-white border-gray-200 hover:bg-gray-50 cursor-pointer"
                }`}
                onClick={(e) =>
                  selectMode
                    ? toggleSelect(t.id, idx, e.shiftKey)
                    : onSelectTheme(selectedThemeId === t.id ? null : t.id)
                }
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(t.id, idx, e.shiftKey);
                    }}
                    className="mr-2 flex-shrink-0"
                  />
                )}
                <span className="flex-1 truncate">{t.name}</span>
                <div className="flex items-center gap-0.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleMove(t.id, "up")}
                    disabled={idx === 0}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
                    aria-label="上へ"
                    title="上へ"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(t.id, "down")}
                    disabled={idx === themes.length - 1}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
                    aria-label="下へ"
                    title="下へ"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-red-400 hover:text-red-600 text-xs ml-1"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 問題集・問題管理（テーマ選択後に表示） */}
      {selectedThemeId && (
        <ProblemPanel
          themeId={selectedThemeId}
          selectedProblemSetId={selectedProblemSetId}
          onSelectProblemSet={onSelectProblemSet}
          onQuestionsChanged={onQuestionsChanged}
        />
      )}
    </div>
  );
}
