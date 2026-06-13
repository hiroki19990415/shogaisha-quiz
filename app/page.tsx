"use client";

import { useState } from "react";
import ThemePanel from "@/components/ThemePanel";
import QuizPanel from "@/components/QuizPanel";
import ExplanationPanel from "@/components/ExplanationPanel";

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

type AnswerResult = {
  selected: string;
  isCorrect: boolean;
  question: Question;
};

export default function Home() {
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [selectedProblemSetId, setSelectedProblemSetId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const handleSelectTheme = (id: number | null) => {
    setSelectedThemeId(id);
    setSelectedProblemSetId(null);
    setAnswerResult(null);
  };

  const handleSelectProblemSet = (id: number | null) => {
    setSelectedProblemSetId(id);
    setAnswerResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4 text-gray-800">
        障害者総合支援法 クイズ学習ツール
      </h1>

      {/* 4ペイン グリッド */}
      <div className="grid grid-cols-4 gap-3" style={{ minHeight: "80vh" }}>

        {/* ペイン① テーマ・問題集管理 */}
        <div className="bg-white rounded shadow p-3 overflow-y-auto">
          <ThemePanel
            selectedThemeId={selectedThemeId}
            onSelectTheme={handleSelectTheme}
            selectedProblemSetId={selectedProblemSetId}
            onSelectProblemSet={handleSelectProblemSet}
          />
        </div>

        {/* ペイン② クイズ画面 */}
        <div className="bg-white rounded shadow p-3">
          <h2 className="font-bold text-lg border-b pb-1 mb-3">② クイズ画面</h2>
          {selectedProblemSetId ? (
            <QuizPanel
              key={selectedProblemSetId}
              problemSetId={selectedProblemSetId}
              onAnswered={(result) => setAnswerResult(result)}
              onHistoryUpdated={() => setHistoryKey((k) => k + 1)}
            />
          ) : (
            <p className="text-gray-400 text-sm">
              ← テーマ → 問題集を選択してください
            </p>
          )}
        </div>

        {/* ペイン③ 解説 */}
        <div className="bg-white rounded shadow p-3">
          <ExplanationPanel result={answerResult} />
        </div>

        {/* ペイン④ 学習履歴（次ステップで実装） */}
        <div className="bg-white rounded shadow p-3">
          <h2 className="font-bold text-lg border-b pb-1 mb-3">④ 学習履歴</h2>
          <p className="text-gray-400 text-sm" key={historyKey}>
            （次のステップで実装します）
          </p>
        </div>
      </div>
    </div>
  );
}
