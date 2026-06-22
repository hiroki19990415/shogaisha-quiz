"use client";

import { useEffect, useState } from "react";

type ProblemSet = {
  id: number;
  theme_id: number;
  level: string;
  created_at: string;
  question_count: number;
};

type Question = {
  id: number;
  problem_set_id: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  answer: string;
  explanation: string | null;
};

type Props = {
  themeId: number;
  selectedProblemSetId: number | null;
  onSelectProblemSet: (id: number | null) => void;
  onQuestionsChanged?: () => void;
};

const LEVELS = ["初級", "中級", "上級"] as const;

const emptyForm = {
  question: "",
  choice_a: "",
  choice_b: "",
  choice_c: "",
  choice_d: "",
  answer: "A",
  explanation: "",
};

export default function ProblemPanel({
  themeId,
  selectedProblemSetId,
  onSelectProblemSet,
  onQuestionsChanged,
}: Props) {
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newLevel, setNewLevel] = useState<string>("初級");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 一括インポート用state
  const [showImport, setShowImport] = useState(false);
  const [importMarkdown, setImportMarkdown] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported?: number;
    parse_errors?: string[];
    error?: string;
  } | null>(null);

  const fetchProblemSets = async () => {
    const res = await fetch(`/api/problem-sets?themeId=${themeId}`);
    const data = await res.json();
    setProblemSets(Array.isArray(data) ? data : []);
  };

  const fetchQuestions = async (psId: number) => {
    const res = await fetch(`/api/questions?problemSetId=${psId}`);
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchProblemSets();
    setQuestions([]);
    onSelectProblemSet(null);
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  useEffect(() => {
    if (selectedProblemSetId) fetchQuestions(selectedProblemSetId);
    else setQuestions([]);
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProblemSetId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowQuestionForm(false);
    setError("");
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 問題をクリック → 編集フォームに内容を読み込む
  const handleEditQuestion = (q: Question) => {
    setForm({
      question: q.question,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      answer: q.answer,
      explanation: q.explanation ?? "",
    });
    setEditingId(q.id);
    setShowQuestionForm(true);
    setError("");
  };

  const handleAddProblemSet = async () => {
    const res = await fetch("/api/problem-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_id: themeId, level: newLevel }),
    });
    if (res.ok) await fetchProblemSets();
  };

  const handleSaveQuestion = async () => {
    if (!selectedProblemSetId) return;
    if (!form.question || !form.choice_a || !form.choice_b || !form.choice_c || !form.choice_d) {
      setError("問題文と選択肢A〜Dは必須です");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let res: Response;

      if (editingId !== null) {
        // 既存問題の更新
        res = await fetch(`/api/questions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        // 新規問題の作成
        res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problem_set_id: selectedProblemSetId,
            ...form,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
      } else {
        resetForm();
        await fetchProblemSets();
        await fetchQuestions(selectedProblemSetId);
        onQuestionsChanged?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!selectedProblemSetId || !importMarkdown.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_set_id: selectedProblemSetId,
          markdown: importMarkdown,
        }),
      });
      const data = await res.json();
      setImportResult(data);
      if (res.ok && data.imported > 0) {
        setImportMarkdown("");
        await fetchProblemSets();
        await fetchQuestions(selectedProblemSetId);
        onQuestionsChanged?.();
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      <h3 className="font-semibold text-sm border-b pb-1">問題集</h3>

      {/* 問題集追加 */}
      <div className="flex gap-2 items-center">
        <select
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button
          onClick={handleAddProblemSet}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
        >
          問題集を追加
        </button>
      </div>

      {/* 問題集一覧 */}
      {problemSets.length === 0 ? (
        <p className="text-gray-400 text-xs">問題集がまだありません</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {problemSets.map((ps) => (
            <li
              key={ps.id}
              onClick={() => onSelectProblemSet(selectedProblemSetId === ps.id ? null : ps.id)}
              className={`rounded px-2 py-1 cursor-pointer text-sm border ${
                selectedProblemSetId === ps.id
                  ? "bg-green-100 border-green-400"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              {ps.level}（{ps.question_count}問）
            </li>
          ))}
        </ul>
      )}

      {/* 問題登録・編集エリア */}
      {selectedProblemSetId && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-600">
              登録済み問題：{questions.length}問
            </p>
            <button
              onClick={() => {
                if (showQuestionForm && editingId === null) {
                  setShowQuestionForm(false);
                } else {
                  resetForm();
                  setShowQuestionForm(true);
                }
              }}
              className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs"
            >
              {showQuestionForm && editingId === null ? "閉じる" : "+ 問題を追加"}
            </button>
          </div>

          {/* 問題フォーム（新規 or 編集） */}
          {showQuestionForm && (
            <div className="border rounded p-2 bg-gray-50 flex flex-col gap-2 text-xs">
              {/* 編集中ラベル */}
              {editingId !== null && (
                <div className="flex items-center justify-between bg-yellow-50 border border-yellow-300 rounded px-2 py-1">
                  <span className="text-yellow-700 font-semibold">✏️ 編集中（ID: {editingId}）</span>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700 underline text-xs"
                  >
                    新規作成に戻る
                  </button>
                </div>
              )}

              <div>
                <label className="font-semibold">問題文 *</label>
                <textarea
                  rows={3}
                  value={form.question}
                  onChange={(e) => handleFormChange("question", e.target.value)}
                  className="w-full border rounded px-1 py-0.5 mt-0.5"
                  placeholder="例：補装具費の支給対象として正しいものはどれか。"
                />
              </div>
              {(["A", "B", "C", "D"] as const).map((ch) => (
                <div key={ch}>
                  <label className="font-semibold">選択肢{ch} *</label>
                  <input
                    type="text"
                    value={form[`choice_${ch.toLowerCase()}` as keyof typeof form]}
                    onChange={(e) => handleFormChange(`choice_${ch.toLowerCase()}`, e.target.value)}
                    className="w-full border rounded px-1 py-0.5 mt-0.5"
                  />
                </div>
              ))}
              <div>
                <label className="font-semibold">正解 *</label>
                <select
                  value={form.answer}
                  onChange={(e) => handleFormChange("answer", e.target.value)}
                  className="border rounded px-1 py-0.5 ml-2"
                >
                  {["A", "B", "C", "D"].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold">解説（任意）</label>
                <textarea
                  rows={2}
                  value={form.explanation}
                  onChange={(e) => handleFormChange("explanation", e.target.value)}
                  className="w-full border rounded px-1 py-0.5 mt-0.5"
                />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              <button
                onClick={handleSaveQuestion}
                disabled={saving}
                className={`text-white px-3 py-1 rounded disabled:opacity-50 ${
                  editingId !== null ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? "保存中..." : editingId !== null ? "更新する" : "保存する"}
              </button>
            </div>
          )}

          {/* マークダウン一括インポート */}
          <div className="mt-2 border-t pt-2">
            <button
              onClick={() => {
                setShowImport(!showImport);
                setImportResult(null);
              }}
              className="text-xs text-purple-600 underline"
            >
              {showImport ? "▲ 一括インポートを閉じる" : "▼ マークダウンで一括登録"}
            </button>

            {showImport && (
              <div className="mt-2 flex flex-col gap-2 text-xs">
                <p className="text-gray-500 leading-relaxed">
                  Cursorで生成したマークダウンをそのまま貼り付けてください。
                </p>
                <details className="bg-gray-50 border rounded p-2">
                  <summary className="cursor-pointer font-semibold text-gray-600">
                    フォーマット例を見る
                  </summary>
                  <pre className="mt-1 text-gray-500 whitespace-pre-wrap text-xs leading-relaxed">{`## Q1. 問題文をここに書く

- A. 選択肢A
- B. 選択肢B
- C. 選択肢C
- D. 選択肢D

**正解: B**
**解説:** 解説文をここに書く

---

## Q2. 次の問題文`}</pre>
                </details>

                <textarea
                  rows={8}
                  value={importMarkdown}
                  onChange={(e) => setImportMarkdown(e.target.value)}
                  className="w-full border rounded px-2 py-1 font-mono text-xs"
                  placeholder="## Q1. 問題文&#10;&#10;- A. 選択肢A&#10;- B. 選択肢B&#10;..."
                />

                {importResult && (
                  <div className={`rounded px-2 py-1 ${
                    importResult.imported
                      ? "bg-green-50 border border-green-300"
                      : "bg-red-50 border border-red-300"
                  }`}>
                    {importResult.imported !== undefined && (
                      <p className="text-green-700 font-semibold">
                        ✅ {importResult.imported}問を登録しました
                      </p>
                    )}
                    {importResult.error && (
                      <p className="text-red-600">{importResult.error}</p>
                    )}
                    {importResult.parse_errors && importResult.parse_errors.length > 0 && (
                      <div className="mt-1">
                        <p className="text-orange-600 font-semibold">⚠️ 解析エラー：</p>
                        {importResult.parse_errors.map((e, i) => (
                          <p key={i} className="text-orange-600">・{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing || !importMarkdown.trim()}
                  className="bg-purple-600 text-white px-3 py-1 rounded disabled:opacity-40"
                >
                  {importing ? "登録中..." : "一括登録する"}
                </button>
              </div>
            )}
          </div>

          {/* 登録済み問題一覧（クリックで編集） */}
          {questions.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {questions.map((q, i) => (
                <li
                  key={q.id}
                  onClick={() => handleEditQuestion(q)}
                  className={`text-xs border rounded px-2 py-1 cursor-pointer transition-colors ${
                    editingId === q.id
                      ? "bg-yellow-50 border-yellow-400 text-yellow-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <span className="font-semibold">Q{i + 1}.</span>{" "}
                  {q.question.length > 38 ? q.question.slice(0, 38) + "…" : q.question}
                  <span className="ml-1 text-green-600 font-semibold">（正解:{q.answer}）</span>
                  {editingId === q.id && (
                    <span className="ml-1 text-yellow-600 font-semibold">← 編集中</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
