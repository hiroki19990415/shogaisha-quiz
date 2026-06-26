"use client";

import { useEffect, useState } from "react";

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
  correct_streak?: number;
};

type AnswerResult = {
  selected: string;
  isCorrect: boolean;
  question: Question;
};

type Mode = "normal" | "weak";

type Props = {
  problemSetId?: number;
  mode?: Mode;
  onAnswered: (result: AnswerResult) => void;
  onHistoryUpdated: () => void;
  onNext?: () => void;
};

const CHOICES = ["A", "B", "C", "D"] as const;

export default function QuizPanel({
  problemSetId,
  mode = "normal",
  onAnswered,
  onHistoryUpdated,
  onNext,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>(mode);

  const loadQuestions = async (m: Mode) => {
    setLoading(true);
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setFinished(false);
    try {
      if (m === "weak") {
        const res = await fetch("/api/questions/weak");
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : []);
      } else if (problemSetId) {
        const res = await fetch(`/api/questions?problemSetId=${problemSetId}`);
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveMode(mode);
    loadQuestions(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemSetId, mode]);

  const handleModeSwitch = (m: Mode) => {
    setActiveMode(m);
    loadQuestions(m);
  };

  const currentQ = questions[currentIndex];

  const handleAnswer = async () => {
    if (!selected || !currentQ) return;
    const isCorrect = selected === currentQ.answer;

    await fetch("/api/answer-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: currentQ.id, is_correct: isCorrect }),
    });

    setAnswered(true);
    onAnswered({ selected, isCorrect, question: currentQ });
    onHistoryUpdated();
  };

  const handleNext = () => {
    onNext?.();
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRestart = () => {
    loadQuestions(activeMode);
  };

  const choiceLabel: Record<string, string> = currentQ
    ? {
        A: currentQ.choice_a,
        B: currentQ.choice_b,
        C: currentQ.choice_c,
        D: currentQ.choice_d,
      }
    : { A: "", B: "", C: "", D: "" };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between border-b pb-1">
        <h2 className="font-bold text-lg">② クイズ画面</h2>
        {/* モード切替タブ */}
        <div className="flex gap-1">
          <button
            onClick={() => handleModeSwitch("normal")}
            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
              activeMode === "normal"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            通常
          </button>
          <button
            onClick={() => handleModeSwitch("weak")}
            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
              activeMode === "weak"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            苦手
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : activeMode === "normal" && !problemSetId ? (
        <p className="text-gray-400 text-sm">← テーマ → 問題集を選択してください</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-400 text-sm">
          {activeMode === "weak"
            ? "苦手問題はまだありません。問題を解いてみましょう！"
            : "この問題集にはまだ問題がありません。"}
        </p>
      ) : finished ? (
        <div className="text-center py-8">
          <p className="text-lg font-bold text-green-600 mb-2">完了！</p>
          <p className="text-sm text-gray-500 mb-4">{questions.length}問を解き終わりました</p>
          <button
            onClick={handleRestart}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            もう一度解く
          </button>
        </div>
      ) : (
        <>
          {/* 苦手問題のコンテキスト表示 */}
          {activeMode === "weak" && currentQ.theme_name && (
            <p className="text-xs text-red-500 font-semibold">
              {currentQ.theme_name}・{currentQ.level}
              {currentQ.correct_streak !== undefined && (
                <span className="ml-1 text-orange-500">
                  （あと{2 - currentQ.correct_streak}回連続正解で苦手解除）
                </span>
              )}
            </p>
          )}

          {/* 進捗 */}
          <p className="text-xs text-gray-500 text-right">
            {currentIndex + 1} / {questions.length} 問
          </p>

          {/* 問題文 */}
          <div className="bg-gray-50 border rounded p-3">
            <p className="text-sm font-semibold leading-relaxed">{currentQ.question}</p>
          </div>

          {/* 選択肢 */}
          <div className="flex flex-col gap-2">
            {CHOICES.map((ch) => {
              let style = "border rounded px-3 py-2 text-sm cursor-pointer text-left ";
              if (!answered) {
                style +=
                  selected === ch
                    ? "bg-blue-100 border-blue-500"
                    : "bg-white border-gray-300 hover:bg-gray-50";
              } else {
                if (ch === currentQ.answer) {
                  style += "bg-green-100 border-green-500 font-semibold";
                } else if (ch === selected && selected !== currentQ.answer) {
                  style += "bg-red-100 border-red-400";
                } else {
                  style += "bg-white border-gray-200 opacity-60";
                }
              }
              return (
                <button
                  key={ch}
                  className={style}
                  disabled={answered}
                  onClick={() => setSelected(ch)}
                >
                  <span className="font-bold mr-2">{ch}.</span>
                  {choiceLabel[ch]}
                </button>
              );
            })}
          </div>

          {/* ボタン */}
          <div className="flex gap-2 mt-auto">
            {!answered ? (
              <button
                onClick={handleAnswer}
                disabled={!selected}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold disabled:opacity-40"
              >
                解答する
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-700 text-white py-2 rounded font-semibold"
              >
                {currentIndex + 1 >= questions.length ? "結果を確認する" : "次の問題へ →"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
