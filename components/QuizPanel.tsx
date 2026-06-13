"use client";

import { useEffect, useState } from "react";

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

type Props = {
  problemSetId: number;
  onAnswered: (result: AnswerResult) => void;
  onHistoryUpdated: () => void;
};

const CHOICES = ["A", "B", "C", "D"] as const;

export default function QuizPanel({ problemSetId, onAnswered, onHistoryUpdated }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setFinished(false);

    fetch(`/api/questions?problemSetId=${problemSetId}`)
      .then((r) => r.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [problemSetId]);

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
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
      onAnswered({ selected: "", isCorrect: false, question: questions[currentIndex + 1] });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setFinished(false);
  };

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>;
  if (questions.length === 0)
    return <p className="text-gray-400 text-sm">この問題集にはまだ問題がありません。</p>;

  if (finished) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-bold text-green-600 mb-4">問題集を完了しました！</p>
        <button
          onClick={handleRestart}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          もう一度解く
        </button>
      </div>
    );
  }

  const choiceLabel: Record<string, string> = {
    A: currentQ.choice_a,
    B: currentQ.choice_b,
    C: currentQ.choice_c,
    D: currentQ.choice_d,
  };

  return (
    <div className="flex flex-col gap-4">
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
            style += selected === ch
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

      {/* 解答・次へボタン */}
      <div className="flex gap-2">
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
    </div>
  );
}
