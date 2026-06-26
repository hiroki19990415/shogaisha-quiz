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
type MobileTab = "manage" | "quiz" | "explain" | "history";

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: "manage", label: "① 管理" },
  { id: "quiz",   label: "② クイズ" },
  { id: "explain",label: "③ 解説" },
  { id: "history",label: "④ 履歴" },
];

export default function Home() {
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [selectedProblemSetId, setSelectedProblemSetId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>("normal");
  const [quizRefreshKey, setQuizRefreshKey] = useState(0);

  // モバイル用タブ
  const [mobileTab, setMobileTab] = useState<MobileTab>("quiz");

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
    // 問題集を選んだらクイズタブへ移動（モバイル）
    setMobileTab("quiz");
  };

  const handleHistoryUpdated = () => setHistoryKey((k) => k + 1);
  const handleQuestionsChanged = () => setQuizRefreshKey((k) => k + 1);

  const handleStartWeakQuiz = () => {
    setSelectedProblemSetId(null);
    setAnswerResult(null);
    setQuizMode("weak");
    setMobileTab("quiz");
  };

  // 回答後 → 解説タブへ自動移動（モバイル）
  const handleAnswered = (result: AnswerResult) => {
    setAnswerResult(result);
    setMobileTab("explain");
  };

  // 次の問題へ → クイズタブへ自動移動（モバイル）
  const handleNext = () => {
    setMobileTab("quiz");
  };

  const quizKey = quizMode === "weak" ? "weak" : `${selectedProblemSetId}-${quizRefreshKey}`;

  const quizPanel = (
    <QuizPanel
      key={quizKey}
      problemSetId={selectedProblemSetId ?? undefined}
      mode={quizMode}
      onAnswered={handleAnswered}
      onHistoryUpdated={handleHistoryUpdated}
      onNext={handleNext}
    />
  );

  const themePanel = (
    <ThemePanel
      selectedThemeId={selectedThemeId}
      onSelectTheme={handleSelectTheme}
      selectedProblemSetId={selectedProblemSetId}
      onSelectProblemSet={handleSelectProblemSet}
      onQuestionsChanged={handleQuestionsChanged}
    />
  );

  const explanationPanel = <ExplanationPanel result={answerResult} />;

  const historyPanel = (
    <HistoryPanel
      refreshKey={historyKey}
      onStartWeakQuiz={handleStartWeakQuiz}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-lg font-bold text-gray-800 px-4 pt-4 pb-2">
        障害者総合支援法 クイズ学習ツール
      </h1>

      {/* ===== モバイルレイアウト（md未満） ===== */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* タブバー（画面上部に固定） */}
        <div className="sticky top-0 z-10 flex border-b bg-white shadow-sm">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                mobileTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50"
                  : "text-gray-500"
              }`}
            >
              {tab.label}
              {/* 解説タブにバッジ（回答済みのとき） */}
              {tab.id === "explain" && answerResult && mobileTab !== "explain" && (
                <span className="ml-1 inline-block w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 bg-white p-4 overflow-y-auto">
          {mobileTab === "manage"  && themePanel}
          {mobileTab === "quiz"    && quizPanel}
          {mobileTab === "explain" && explanationPanel}
          {mobileTab === "history" && historyPanel}
        </div>
      </div>

      {/* ===== PCレイアウト（md以上）4ペイン ===== */}
      <div className="hidden md:grid grid-cols-4 gap-3 px-4 pb-4" style={{ minHeight: "80vh" }}>
        <div className="bg-white rounded shadow p-3 overflow-y-auto">
          {themePanel}
        </div>
        <div className="bg-white rounded shadow p-3 flex flex-col">
          {quizPanel}
        </div>
        <div className="bg-white rounded shadow p-3">
          {explanationPanel}
        </div>
        <div className="bg-white rounded shadow p-3 overflow-y-auto">
          {historyPanel}
        </div>
      </div>
    </div>
  );
}
