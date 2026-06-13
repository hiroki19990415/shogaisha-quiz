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

export default function ProblemPanel({ themeId, selectedProblemSetId, onSelectProblemSet }: Props) {
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newLevel, setNewLevel] = useState<string>("初級");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);

  useEffect(() => {
    if (selectedProblemSetId) fetchQuestions(selectedProblemSetId);
    else setQuestions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProblemSetId]);

  const handleAddProblemSet = async () => {
    const res = await fetch("/api/problem-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme_id: themeId, level: newLevel }),
    });
    if (res.ok) await fetchProblemSets();
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_set_id: selectedProblemSetId,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
      } else {
        setForm(emptyForm);
        setShowQuestionForm(false);
        await fetchProblemSets();
        await fetchQuestions(selectedProblemSetId);
      }
    } finally {
      setSaving(false);
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

      {/* 問題登録 */}
      {selectedProblemSetId && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-600">
              登録済み問題：{questions.length}問
            </p>
            <button
              onClick={() => { setShowQuestionForm(!showQuestionForm); setError(""); }}
              className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs"
            >
              {showQuestionForm ? "閉じる" : "+ 問題を追加"}
            </button>
          </div>

          {/* 問題登録フォーム */}
          {showQuestionForm && (
            <div className="border rounded p-2 bg-gray-50 flex flex-col gap-2 text-xs">
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
                className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          )}

          {/* 登録済み問題一覧 */}
          {questions.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {questions.map((q, i) => (
                <li key={q.id} className="text-xs text-gray-600 border rounded px-2 py-1 bg-white">
                  Q{i + 1}. {q.question.length > 40 ? q.question.slice(0, 40) + "…" : q.question}
                  <span className="ml-1 text-green-600 font-semibold">（正解:{q.answer}）</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
