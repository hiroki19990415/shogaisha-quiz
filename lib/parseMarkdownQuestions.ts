export type ParsedQuestion = {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  answer: string;
  explanation: string;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  errors: string[];
};

/**
 * マークダウン形式の問題文を解析して構造化データに変換する
 *
 * 以下のフォーマットに幅広く対応（## あり・なし、- あり・なし）:
 *
 * [## ]Q1[.] 問題文
 * [- ]A[.] 選択肢A
 * [- ]B[.] 選択肢B
 * [- ]C[.] 選択肢C
 * [- ]D[.] 選択肢D
 * [**]正解[:：] B[**]
 * [**]解説[:：][**] 解説文
 */
export function parseMarkdownQuestions(markdown: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  // 区切り：--- または Q番号行 のどちらかで分割
  let blocks: string[] = [];

  if (/^---+$/m.test(markdown)) {
    // --- で明示的に区切られている場合
    blocks = markdown
      .split(/^---+$/m)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } else {
    // Q番号行（## Q1. や Q1. など）で分割
    blocks = markdown
      .split(/(?=^(?:##\s+)?Q\d+[.．])/m)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  }

  if (blocks.length === 0) {
    errors.push("問題が1件も見つかりませんでした。フォーマット例を確認してください。");
    return { questions, errors };
  }

  blocks.forEach((block, idx) => {
    const num = idx + 1;

    // 問題文行：## Q1. テキスト または Q1. テキスト
    const questionMatch = block.match(/^(?:##\s+)?Q\d+[.．]?\s*(.+)/m);
    if (!questionMatch) {
      errors.push(`ブロック${num}: 問題文（Q${num}. 〇〇）が見つかりません`);
      return;
    }
    const question = questionMatch[1].trim();

    // 選択肢：「- A. テキスト」「A. テキスト」「A） テキスト」のいずれかに対応
    const choiceRegex =
      /^(?:[-*]\s+)?([ABCD])[.．）\)]\s*(.+)/gm;
    const choices: Record<string, string> = {};
    let m;
    while ((m = choiceRegex.exec(block)) !== null) {
      choices[m[1]] = m[2].trim();
    }

    for (const ch of ["A", "B", "C", "D"]) {
      if (!choices[ch]) {
        errors.push(
          `Q${num}（${question.slice(0, 20)}…）: 選択肢${ch}が見つかりません`
        );
        return;
      }
    }

    // 正解：「**正解: B**」「正解：B」「正解: B」などに対応
    const answerMatch = block.match(
      /\*{0,2}正解[：:]\s*\*{0,2}\s*([ABCD])\*{0,2}/
    );
    if (!answerMatch) {
      errors.push(
        `Q${num}（${question.slice(0, 20)}…）: 正解（正解: A/B/C/D）が見つかりません`
      );
      return;
    }
    const answer = answerMatch[1];

    // 解説：「**解説:** テキスト」「解説：テキスト」などに対応
    const explanationMatch = block.match(
      /\*{0,2}解説[：:]\*{0,2}\s*([\s\S]+)/
    );
    const explanation = explanationMatch
      ? explanationMatch[1].replace(/\*{1,2}/g, "").trim()
      : "";

    questions.push({
      question,
      choice_a: choices["A"],
      choice_b: choices["B"],
      choice_c: choices["C"],
      choice_d: choices["D"],
      answer,
      explanation,
    });
  });

  return { questions, errors };
}
