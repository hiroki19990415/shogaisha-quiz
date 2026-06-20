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
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchThemes = async () => {
    const res = await fetch("/api/themes");
    const data = await res.json();
    setThemes(data);
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      setError("テーマ名を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
      } else {
        setNewName("");
        await fetchThemes();
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-lg border-b pb-1">① テーマ管理</h2>

      {/* テーマ追加 */}
      <div>
        <p className="text-sm font-semibold mb-1">テーマを追加</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="例：補装具"
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {/* テーマ一覧 */}
      <div>
        <p className="text-sm font-semibold mb-1">テーマ一覧</p>
        {themes.length === 0 ? (
          <p className="text-gray-400 text-sm">テーマがまだありません</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {themes.map((t) => (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer text-sm border ${
                  selectedThemeId === t.id
                    ? "bg-blue-100 border-blue-400"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() =>
                  onSelectTheme(selectedThemeId === t.id ? null : t.id)
                }
              >
                <span>{t.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(t.id);
                  }}
                  className="text-red-400 hover:text-red-600 text-xs ml-2"
                >
                  削除
                </button>
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
