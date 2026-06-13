"use client";

type Question = {
  id: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  answer: string;
  explanation: string | null;
};

type Props = {
  result: {
    selected: string;
    isCorrect: boolean;
    question: Question;
  } | null;
};

export default function ExplanationPanel({ result }: Props) {
  if (!result || !result.selected) {
    return (
      <div>
        <h2 className="font-bold text-lg border-b pb-1 mb-3">③ 解説</h2>
        <p className="text-gray-400 text-sm">解答後に表示されます</p>
      </div>
    );
  }

  const { selected, isCorrect, question } = result;

  const choiceLabel: Record<string, string> = {
    A: question.choice_a,
    B: question.choice_b,
    C: question.choice_c,
    D: question.choice_d,
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-bold text-lg border-b pb-1">③ 解説</h2>

      {/* 正誤 */}
      <div
        className={`rounded p-2 text-center font-bold text-sm ${
          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {isCorrect ? "✓ 正解！" : "✗ 不正解"}
      </div>

      {/* あなたの回答 */}
      {!isCorrect && (
        <div className="text-sm">
          <span className="text-gray-500">あなたの回答：</span>
          <span className="font-semibold text-red-600">
            {selected}. {choiceLabel[selected]}
          </span>
        </div>
      )}

      {/* 正解 */}
      <div className="text-sm">
        <span className="text-gray-500">正解：</span>
        <span className="font-semibold text-green-700">
          {question.answer}. {choiceLabel[question.answer]}
        </span>
      </div>

      {/* 解説 */}
      {question.explanation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm leading-relaxed">
          <p className="font-semibold text-yellow-800 mb-1">解説</p>
          <p className="text-gray-700">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
