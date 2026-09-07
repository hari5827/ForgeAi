import Editor from "@monaco-editor/react";
import "./CodeEditor.css";

function CodeEditor({ fileName = "App.jsx", value = "", onChange }) {
    const getLanguage = () => {
        if (fileName.endsWith(".jsx")) return "javascript";
        if (fileName.endsWith(".js")) return "javascript";
        if (fileName.endsWith(".css")) return "css";
        if (fileName.endsWith(".html")) return "html";
        if (fileName.endsWith(".json")) return "json";
        return "plaintext";
    };

    return (
        <div className="code-editor">
            <div className="editor-tab">
                <span>{fileName}</span>
            </div>

            <Editor
                height="100%"
                language={getLanguage()}
                value={value}
                onChange={(nextValue) => onChange?.(nextValue ?? "")}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "Cascadia Code, Consolas, monospace",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: {
                        top: 12
                    }
                }}
            />
        </div>
    );
}

export default CodeEditor;