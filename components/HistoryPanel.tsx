"use client";

import { useEffect, useState } from "react";

type Stats = {
  total: number;
  correct: number;
  incorrect: number;
  correct_rate: number | null;
  weak_count: number;
  recent: RecentItem[];
};

type RecentItem = {
  id: number;
  is_correct: boolean;
  answered_at: string;
  question: string;
  theme_name: string;
  level: string;
};

type Props = {
  refreshKey: number;
  onStartWeakQuiz: () => void;
};

export default function HistoryPanel({ refreshKey, onStartWeakQuiz }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/answer-history/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return (
    <div>
      <h2 className="font-bold text-lg border-b pb-1 mb-3">④ 学習履歴</h2>
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  );

  if (!stats) return null;

  const rateColor =
    stats.correct_rate === null
      ? "text-gray-400"
      : stats.correct_rate >= 70
      ? "text-green-600"
      : stats.correct_rate >= 40
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-lg border-b pb-1">④ 学習履歴</h2>

      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 border rounded p-2 text-center">
          <p className="text-xs text-gray-500">総正答率</p>
          <p className={`text-2xl font-bold ${rateColor}`}>
            {stats.correct_rate !== null ? `${stats.correct_rate}%` : "—"}
          </p>
          <p className="text-xs text-gray-400">
            {stats.correct} / {stats.total} 問
          </p>
        </div>
        <div className="bg-gray-50 border rounded p-2 text-center">
          <p className="text-xs text-gray-500">苦手問題数</p>
          <p className="text-2xl font-bold text-red-500">{stats.weak_count}</p>
          <p className="text-xs text-gray-400">問</p>
        </div>
      </div>

      {/* 苦手問題クイズボタン */}
      {stats.weak_count > 0 && (
        <button
          onClick={onStartWeakQuiz}
          className="w-full bg-red-500 text-white py-2 rounded font-semibold text-sm hover:bg-red-600"
        >
          苦手問題を解く（{stats.weak_count}問）
        </button>
      )}

      {/* 最近の学習履歴 */}
      <div>
        <p className="text-sm font-semibold mb-1">最近の解答</p>
        {stats.recent.length === 0 ? (
          <p className="text-gray-400 text-xs">まだ解答履歴がありません</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {stats.recent.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 text-xs border rounded px-2 py-1 bg-white"
              >
                <span
                  className={`mt-0.5 font-bold shrink-0 ${
                    item.is_correct ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {item.is_correct ? "○" : "✗"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-gray-700">{item.question}</p>
                  <p className="text-gray-400">
                    {item.theme_name}・{item.level}　
                    {new Date(item.answered_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
