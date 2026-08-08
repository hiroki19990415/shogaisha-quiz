"use client";

import { useEffect, useState, useCallback } from "react";
import ProblemPanel from "./ProblemPanel";

type Category = {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
};

type Theme = {
  id: number;
  name: string;
  sort_order: number;
  category_id: number | null;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [movingThemeId, setMovingThemeId] = useState<number | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchData = useCallback(async () => {
    const [catRes, themeRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/themes"),
    ]);
    const catData: Category[] = await catRes.json();
    const themeData: Theme[] = await themeRes.json();
    setCategories(Array.isArray(catData) ? catData : []);
    setThemes(Array.isArray(themeData) ? themeData : []);

    // 初回: すべてのカテゴリを展開
    setExpandedCategories((prev) => {
      if (prev.size === 0 && catData.length > 0) {
        return new Set(catData.map((c) => c.id));
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- カテゴリ操作 ----

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCategoryError(data.error ?? "登録失敗");
      return;
    }
    setNewCategoryName("");
    setAddingCategory(false);
    await fetchData();
    setExpandedCategories((prev) => new Set([...prev, data.id]));
  };

  const handleDeleteCategory = async (cat: Category) => {
    const catThemes = themes.filter((t) => t.category_id === cat.id);
    const msg =
      catThemes.length > 0
        ? `大テーマ「${cat.name}」を削除しますか？\n配下の ${catThemes.length} 件のテーマ（および問題集・問題）もすべて削除されます。`
        : `大テーマ「${cat.name}」を削除しますか？`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedThemeId && catThemes.some((t) => t.id === selectedThemeId)) {
        onSelectTheme(null);
        onSelectProblemSet(null);
      }
      await fetchData();
    }
  };

  const handleMoveCategory = async (id: number, direction: "up" | "down") => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await fetchData();
  };

  const startRenameCategory = (cat: Category) => {
    setRenamingCategoryId(cat.id);
    setRenameValue(cat.name);
  };

  const handleRenameCategory = async (id: number) => {
    const name = renameValue.trim();
    if (!name) return;
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setRenamingCategoryId(null);
    setRenameValue("");
    await fetchData();
  };

  const toggleExpand = (id: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- テーマ操作 ----

  const handleDeleteTheme = async (theme: Theme) => {
    if (!confirm(`テーマ「${theme.name}」を削除しますか？（関連する問題集・問題も削除されます）`)) return;
    const res = await fetch(`/api/themes/${theme.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedThemeId === theme.id) {
        onSelectTheme(null);
        onSelectProblemSet(null);
      }
      await fetchData();
    }
  };

  const handleMoveTheme = async (id: number, direction: "up" | "down") => {
    await fetch(`/api/themes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    await fetchData();
  };

  const handleChangeThemeCategory = async (themeId: number, newCategoryId: number | null) => {
    await fetch(`/api/themes/${themeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: newCategoryId }),
    });
    setMovingThemeId(null);
    await fetchData();
  };

  // ---- ヘルパー ----

  const getThemesForCategory = (categoryId: number | null) =>
    themes.filter((t) => t.category_id === categoryId);

  const uncategorizedThemes = themes.filter((t) => t.category_id === null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b pb-1">
        <h2 className="font-bold text-lg">① テーマ管理</h2>
        <button
          onClick={() => { setAddingCategory((v) => !v); setCategoryError(""); }}
          className="text-xs px-2 py-0.5 rounded border bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          {addingCategory ? "キャンセル" : "+ 大テーマを追加"}
        </button>
      </div>

      {/* 大テーマ追加フォーム */}
      {addingCategory && (
        <div className="flex flex-col gap-1 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700 font-semibold">大テーマ名を入力</p>
          <div className="flex gap-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="例: 地方自治法"
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              追加
            </button>
          </div>
          {categoryError && <p className="text-xs text-red-500">{categoryError}</p>}
        </div>
      )}

      {/* カテゴリ一覧 */}
      {categories.length === 0 && uncategorizedThemes.length === 0 ? (
        <p className="text-gray-400 text-sm">大テーマがまだありません</p>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map((cat, catIdx) => {
            const catThemes = getThemesForCategory(cat.id);
            const isExpanded = expandedCategories.has(cat.id);
            return (
              <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* カテゴリヘッダー */}
                <div className="flex items-center bg-gray-50 px-2 py-1.5 gap-1">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="flex-1 flex items-center gap-1.5 text-left text-sm font-semibold text-gray-700 hover:text-gray-900 min-w-0"
                  >
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    {renamingCategoryId === cat.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameCategory(cat.id);
                          if (e.key === "Escape") setRenamingCategoryId(null);
                        }}
                        className="flex-1 text-sm border border-blue-400 rounded px-1 py-0 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{cat.name}</span>
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ({catThemes.length})
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {renamingCategoryId === cat.id ? (
                      <>
                        <button
                          onClick={() => handleRenameCategory(cat.id)}
                          className="text-xs px-1.5 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setRenamingCategoryId(null)}
                          className="text-xs px-1.5 py-0.5 border border-gray-300 rounded text-gray-500 hover:bg-gray-100"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startRenameCategory(cat)}
                        className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        title="名前を変更"
                      >
                        ✎
                      </button>
                    )}
                    <button
                      onClick={() => handleMoveCategory(cat.id, "up")}
                      disabled={catIdx === 0}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 disabled:opacity-20 disabled:cursor-default transition-colors"
                      title="上へ"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveCategory(cat.id, "down")}
                      disabled={catIdx === categories.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 disabled:opacity-20 disabled:cursor-default transition-colors"
                      title="下へ"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* テーマ一覧 */}
                {isExpanded && (
                  <div className="px-2 py-1.5 flex flex-col gap-1">
                    {catThemes.length === 0 ? (
                      <p className="text-gray-400 text-xs py-1 pl-1">テーマがまだありません</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {catThemes.map((t, tIdx) => (
                          <ThemeItem
                            key={t.id}
                            theme={t}
                            themes={catThemes}
                            themeIdx={tIdx}
                            isSelected={selectedThemeId === t.id}
                            isMoving={movingThemeId === t.id}
                            categories={categories}
                            onSelect={() =>
                              onSelectTheme(selectedThemeId === t.id ? null : t.id)
                            }
                            onMoveUp={() => handleMoveTheme(t.id, "up")}
                            onMoveDown={() => handleMoveTheme(t.id, "down")}
                            onDelete={() => handleDeleteTheme(t)}
                            onStartMove={() => setMovingThemeId(t.id)}
                            onCancelMove={() => setMovingThemeId(null)}
                            onChangeCategory={(catId) =>
                              handleChangeThemeCategory(t.id, catId)
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 未分類テーマ */}
          {uncategorizedThemes.length > 0 && (
            <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
              <div className="flex items-center bg-gray-50 px-2 py-1.5 gap-1">
                <button
                  onClick={() => toggleExpand(-1)}
                  className="flex-1 flex items-center gap-1.5 text-left text-sm font-semibold text-gray-500"
                >
                  <span className="text-gray-400 text-xs">
                    {expandedCategories.has(-1) ? "▼" : "▶"}
                  </span>
                  <span>未分類</span>
                  <span className="text-xs text-gray-400">({uncategorizedThemes.length})</span>
                </button>
              </div>
              {expandedCategories.has(-1) && (
                <div className="px-2 py-1.5 flex flex-col gap-1">
                  <ul className="flex flex-col gap-1">
                    {uncategorizedThemes.map((t, tIdx) => (
                      <ThemeItem
                        key={t.id}
                        theme={t}
                        themes={uncategorizedThemes}
                        themeIdx={tIdx}
                        isSelected={selectedThemeId === t.id}
                        isMoving={movingThemeId === t.id}
                        categories={categories}
                        onSelect={() =>
                          onSelectTheme(selectedThemeId === t.id ? null : t.id)
                        }
                        onMoveUp={() => handleMoveTheme(t.id, "up")}
                        onMoveDown={() => handleMoveTheme(t.id, "down")}
                        onDelete={() => handleDeleteTheme(t)}
                        onStartMove={() => setMovingThemeId(t.id)}
                        onCancelMove={() => setMovingThemeId(null)}
                        onChangeCategory={(catId) =>
                          handleChangeThemeCategory(t.id, catId)
                        }
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

// ---- テーマ行コンポーネント ----

type ThemeItemProps = {
  theme: Theme;
  themes: Theme[];
  themeIdx: number;
  isSelected: boolean;
  isMoving: boolean;
  categories: Category[];
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onStartMove: () => void;
  onCancelMove: () => void;
  onChangeCategory: (categoryId: number | null) => void;
};

function ThemeItem({
  theme,
  themes,
  themeIdx,
  isSelected,
  isMoving,
  categories,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onStartMove,
  onCancelMove,
  onChangeCategory,
}: ThemeItemProps) {
  return (
    <li className="flex flex-col gap-1">
      <div
        className={`flex items-center justify-between rounded px-2 py-1 text-sm border cursor-pointer ${
          isSelected
            ? "bg-blue-100 border-blue-400"
            : "bg-white border-gray-200 hover:bg-gray-50"
        }`}
        onClick={onSelect}
      >
        <span className="flex-1 truncate text-xs">{theme.name}</span>
        <div
          className="flex items-center gap-0.5 ml-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onMoveUp}
            disabled={themeIdx === 0}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
            title="上へ"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={themeIdx === themes.length - 1}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-default transition-colors"
            title="下へ"
          >
            ▼
          </button>
          <button
            onClick={isMoving ? onCancelMove : onStartMove}
            className={`text-xs px-1 py-0.5 rounded transition-colors ${
              isMoving
                ? "bg-orange-100 text-orange-600 border border-orange-300"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title="大テーマを変更"
          >
            移動
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 text-xs ml-0.5"
          >
            削除
          </button>
        </div>
      </div>

      {/* カテゴリ移動セレクター */}
      {isMoving && (
        <div className="ml-2 flex items-center gap-1 bg-orange-50 border border-orange-200 rounded p-1.5">
          <span className="text-xs text-orange-700 flex-shrink-0">移動先:</span>
          <select
            className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none"
            defaultValue={theme.category_id ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChangeCategory(val === "" ? null : Number(val));
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="">（未分類）</option>
          </select>
          <button
            onClick={onCancelMove}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}
