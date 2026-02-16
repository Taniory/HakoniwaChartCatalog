import { useEffect, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";

SyntaxHighlighter.registerLanguage("javascript", javascript);

const PRETTIER_OPTIONS = {
    parser: "babel",
    printWidth: 100,
    tabWidth: 2,
    trailingComma: "all",
    semi: true,
    singleQuote: false,
};

export default function CodeBlock({ code }) {
    const rawCode = String(code || "");
    const [formattedCode, setFormattedCode] = useState(rawCode);

    useEffect(() => {
        let cancelled = false;

        async function runFormat() {
            if (!rawCode.trim()) {
                setFormattedCode("");
                return;
            }

            try {
                const [{ format }, babelPlugin, estreePlugin] = await Promise.all([
                    import("prettier/standalone"),
                    import("prettier/plugins/babel"),
                    import("prettier/plugins/estree"),
                ]);
                const babel = babelPlugin.default || babelPlugin;
                const estree = estreePlugin.default || estreePlugin;
                const result = await format(rawCode, {
                    ...PRETTIER_OPTIONS,
                    plugins: [babel, estree],
                });
                if (!cancelled) {
                    setFormattedCode(result);
                }
            } catch {
                if (!cancelled) {
                    setFormattedCode(rawCode);
                }
            }
        }

        void runFormat();
        return () => {
            cancelled = true;
        };
    }, [rawCode]);

    return (
        <SyntaxHighlighter
            language="javascript"
            style={oneDark}
            className="code-block"
            customStyle={{
                margin: 0,
                border: "1px solid var(--border)",
                borderRadius: "9px",
                background: "#101923",
                fontSize: "12px",
                lineHeight: "1.45",
            }}
            wrapLongLines
        >
            {formattedCode}
        </SyntaxHighlighter>
    );
}
