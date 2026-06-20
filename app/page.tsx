"use client";

import { useState } from "react";
import ThemePanel from "@/components/ThemePanel";
import QuizPanel from "@/components/QuizPanel";
import ExplanationPanel from "@/components/ExplanationPanel";
import HistoryPanel from "@/components/HistoryPanel";

type Question = {
  id: number;
  problem_set_id?: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  answer: string;
  explanation: string | null;
  theme_name?: string;
  level?: string;
  wrong_count?: number;
};

type AnswerResult = {
  selected: string;
  isCorrect: boolean;
  question: Question;
};

type QuizMode = "normal" | "weak";

export default function Home() {
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [selectedProblemSetId, setSelectedProblemSetId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>("normal");

  const handleSelectTheme = (id: number | null) => {
    setSelectedThemeId(id);
    setSelectedProblemSetId(null);
    setAnswerResult(null);
    setQuizMode("normal");
  };

  const handleSelectProblemSet = (id: number | null) => {
    setSelectedProblemSetId(id);
    setAnswerResult(null);
    setQuizMode("normal");
  };

  const handleHistoryUpdated = () => setHistoryKey((k) => k + 1);

  // 問題が更新されたらクイズ画面を再取得（keyを変えて再マウント）
  const [quizRefreshKey, setQuizRefreshKey] = useState(0);
  const handleQuestionsChanged = () => setQuizRefreshKey((k) => k + 1);

  const handleStartWeakQuiz = () => {
    setSelectedProblemSetId(null);
    setAnswerResult(null);
    setQuizMode("weak");
  };

  const quizKey = quizMode === "weak" ? "weak" : `${selectedProblemSetId}-${quizRefreshKey}`;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-xl font-bold mb-4 text-gray-800">
        障害者総合支援法 クイズ学習ツール
      </h1>

      <div className="grid grid-cols-4 gap-3" style={{ minHeight: "80vh" }}>

        {/* ペイン① テーマ・問題集管理 */}
        <div className="bg-white rounded shadow p-3 overflow-y-auto">
          <ThemePanel
            selectedThemeId={selectedThemeId}
            onSelectTheme={handleSelectTheme}
            selectedProblemSetId={selectedProblemSetId}
            onSelectProblemSet={handleSelectProblemSet}
            onQuestionsChanged={handleQuestionsChanged}
          />
        </div>

        {/* ペイン② クイズ画面 */}
        <div className="bg-white rounded shadow p-3 flex flex-col">
          <QuizPanel
            key={quizKey}
            problemSetId={selectedProblemSetId ?? undefined}
            mode={quizMode}
            onAnswered={(result) => setAnswerResult(result)}
            onHistoryUpdated={handleHistoryUpdated}
          />
        </div>

        {/* ペイン③ 解説 */}
        <div className="bg-white rounded shadow p-3">
          <ExplanationPanel result={answerResult} />
        </div>

        {/* ペイン④ 学習履歴 */}
        <div className="bg-white rounded shadow p-3 overflow-y-auto">
          <HistoryPanel
            refreshKey={historyKey}
            onStartWeakQuiz={handleStartWeakQuiz}
          />
        </div>
      </div>
    </div>
  );
}
