import { useState, useCallback } from "react";

export default function PromptCopyButton({ post }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!post) {
      return;
    }

    const promptText = `以下のJSONは、あるチャートの構成データです。
このデータを元に、類似のチャートを生成するコード（例: Pythonのmatplotlibなど）や、
データを差し替えた新しいJSONを作成してください。

\`\`\`json
${JSON.stringify(post, null, 2)}
\`\`\`
`;

    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("Failed to copy prompt:", err);
      alert("クリップボードへのコピーに失敗しました。");
    });
  }, [post]);

  if (!post) {
    return null;
  }

  return (
    <button
      type="button"
      className={`copy-prompt-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
    >
      {copied ? "コピーしました！" : "プロンプトをコピー"}
    </button>
  );
}
