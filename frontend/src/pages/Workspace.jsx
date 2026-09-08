import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CodeEditor from "../components/CodeEditor";
import FileExplorer from "../components/FileExplorer";
import {
    getSessionSandbox,
    listFiles,
    readFile,
    writeFile,
    createAIPlan,
    getSessionHistory,
    executeCommand
} from "../services/api";
import "./Workspace.css";

function getFileName(filePath) {
    return filePath.split("/").pop();
}

function Workspace() {
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();

    const [sessionId] = useState(() => {
        const existingSessionId =
            localStorage.getItem("forgeai_session_id");

        if (existingSessionId) {
            return existingSessionId;
        }

        const newSessionId = crypto.randomUUID();

        localStorage.setItem(
            "forgeai_session_id",
            newSessionId
        );

        return newSessionId;
    });

    const [sandboxId, setSandboxId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [aiStatus, setAiStatus] = useState("");
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState([]);

    const [terminalInput, setTerminalInput] = useState("");
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [isExecuting, setIsExecuting] = useState(false);

    const [showUserMenu, setShowUserMenu] = useState(false);

    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    /*
     * Load sandbox, preview, files and chat history.
     */
    useEffect(() => {
        let cancelled = false;

        async function loadWorkspace() {
            try {
                setLoading(true);
                setError("");

                const sandbox = await getSessionSandbox(
                    token,
                    sessionId
                );

                if (cancelled) return;

                setSandboxId(sandbox.sandboxId);
                setPreviewUrl(sandbox.previewUrl);

                const fileResult = await listFiles(
                    sandbox.sandboxId
                );

                if (cancelled) return;

                const mappedFiles = fileResult.files.map(
                    (path) => ({
                        path,
                        name: getFileName(path)
                    })
                );

                setFiles(mappedFiles);

                if (mappedFiles.length > 0) {
                    setActiveFile(mappedFiles[0].path);
                }

                const historyResult =
                    await getSessionHistory(
                        token,
                        sessionId
                    );

                if (cancelled) return;

                const historyMessages = [];

                for (
                    const item of historyResult.history
                ) {
                    historyMessages.push({
                        role: "user",
                        content: item.prompt
                    });

                    historyMessages.push({
                        role: "assistant",
                        content:
                            item.result?.message ||
                            "Completed"
                    });
                }

                setMessages(historyMessages);
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "WORKSPACE LOAD FAILED:",
                        err
                    );

                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        if (token) {
            loadWorkspace();
        }

        return () => {
            cancelled = true;
        };
    }, [token, sessionId]);

    /*
     * Read selected file from sandbox.
     */
    useEffect(() => {
        if (!sandboxId || !activeFile) {
            return;
        }

        let cancelled = false;

        async function loadFile() {
            try {
                setError("");

                const result = await readFile(
                    sandboxId,
                    activeFile
                );

                if (!cancelled) {
                    setFileContent(result.content);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "FILE READ FAILED:",
                        err
                    );

                    setError(err.message);
                }
            }
        }

        loadFile();

        return () => {
            cancelled = true;
        };
    }, [sandboxId, activeFile]);

    /*
     * Monaco change handler.
     */
    const handleFileChange = (content) => {
        setFileContent(content);
    };

    /*
     * Save current file to sandbox.
     */
    const handleSave = async () => {
        if (
            !sandboxId ||
            !activeFile ||
            isSaving
        ) {
            return;
        }

        try {
            setIsSaving(true);
            setError("");

            await writeFile(
                sandboxId,
                activeFile,
                fileContent
            );
        } catch (err) {
            console.error(
                "FILE SAVE FAILED:",
                err
            );

            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    /*
     * Send prompt to AI.
     */
    const handleSendPrompt = async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || sending) return;

    setSending(true);
    setAiStatus("Thinking...");

    try {
        setAiStatus("Planning...");

        const result = await createAIPlan(
            token,
            sessionId,
            trimmedPrompt
        );

        setAiStatus("Executing...");

        // Existing refresh logic
        const updatedFiles = await listFiles(sandboxId);
        setFiles(updatedFiles);

        if (activeFile) {
            const content = await readFile(sandboxId, activeFile);
            setEditorContent(content);
        }

        // Existing chat update logic
        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                content: trimmedPrompt
            },
            {
                role: "assistant",
                content: result?.message || "Completed"
            }
        ]);

        setPrompt("");
        setAiStatus("Done");
    } catch (error) {
        console.error(error);
        setAiStatus("Failed");
    } finally {
        setSending(false);

        setTimeout(() => {
            setAiStatus("");
        }, 1500);
    }
};

    /*
     * Execute terminal command.
     */
    const handleTerminalCommand = async () => {
        const command = terminalInput.trim();

        if (
            !command ||
            !sandboxId ||
            isExecuting
        ) {
            return;
        }

        try {
            setIsExecuting(true);
            setError("");

            setTerminalOutput((current) => [
                ...current,
                {
                    type: "command",
                    text: `$ ${command}`
                }
            ]);

            setTerminalInput("");

            const result = await executeCommand(
                sandboxId,
                command
            );

            const commandResult =
                result.results?.[0];

            if (commandResult?.stdout) {
                setTerminalOutput((current) => [
                    ...current,
                    {
                        type: "output",
                        text: commandResult.stdout
                    }
                ]);
            }

            if (commandResult?.stderr) {
                setTerminalOutput((current) => [
                    ...current,
                    {
                        type: "error",
                        text: commandResult.stderr
                    }
                ]);
            }
        } catch (err) {
            console.error(
                "TERMINAL COMMAND FAILED:",
                err
            );

            setError(err.message);

            setTerminalOutput((current) => [
                ...current,
                {
                    type: "error",
                    text: err.message
                }
            ]);
        } finally {
            setIsExecuting(false);
        }
    };

    /*
     * Logout.
     */
    const handleLogout = async () => {
        setShowUserMenu(false);

        await logout();

        localStorage.removeItem(
            "forgeai_session_id"
        );

        navigate("/login", {
            replace: true
        });
    };

    if (loading) {
        return (
            <div className="workspace-loading">
                Loading ForgeAI workspace...
            </div>
        );
    }

    return (
        <div className="workspace">

            {/* TOP BAR */}
            <header className="workspace-topbar">

                <div className="workspace-brand">
                    <div className="workspace-brand-mark">
                        F
                    </div>

                    <span>ForgeAI</span>
                </div>

                <div className="workspace-actions">

                    <button
                        className="topbar-button"
                        onClick={() => {
                            if (previewUrl) {
                                window.open(
                                    previewUrl,
                                    "_blank"
                                );
                            }
                        }}
                    >
                        Preview
                    </button>

                    <button
                        className="topbar-button"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving
                            ? "Saving..."
                            : "Save"}
                    </button>

                    {/* USER MENU */}
                    <div className="user-menu-container">

                        <button
                            className="user-profile-button"
                            onClick={() =>
                                setShowUserMenu(
                                    (current) =>
                                        !current
                                )
                            }
                        >
                            {user?.avatar ? (
                                <img
                                    className="user-avatar-image"
                                    src={user.avatar}
                                    alt=""
                                />
                            ) : (
                                <div className="user-avatar">
                                    {user?.name
                                        ?.charAt(0)
                                        ?.toUpperCase() ||
                                        "U"}
                                </div>
                            )}

                            <span className="user-name">
                                {user?.name || "User"}
                            </span>

                            <span className="user-chevron">
                                ▾
                            </span>
                        </button>

                        {showUserMenu && (
                            <div className="user-dropdown">

                                <div className="user-dropdown-header">

                                    {user?.avatar ? (
                                        <img
                                            className="user-avatar-image large"
                                            src={user.avatar}
                                            alt=""
                                        />
                                    ) : (
                                        <div className="user-avatar large">
                                            {user?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() ||
                                                "U"}
                                        </div>
                                    )}

                                    <div>
                                        <div className="user-dropdown-name">
                                            {user?.name ||
                                                "ForgeAI User"}
                                        </div>

                                        <div className="user-dropdown-email">
                                            {user?.email ||
                                                ""}
                                        </div>
                                    </div>

                                </div>

                                <div className="user-dropdown-divider" />

                                <button
                                    className="user-dropdown-item logout-item"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>

                            </div>
                        )}

                    </div>

                </div>
            </header>

            {/* ERROR */}
            {error && (
                <div className="workspace-error">
                    {error}
                </div>
            )}

            {/* MAIN WORKSPACE */}
            <div className="workspace-body">

                {/* EXPLORER */}
                <aside className="workspace-sidebar">

                    <FileExplorer
                        files={files}
                        activeFile={activeFile}
                        onSelect={setActiveFile}
                    />

                </aside>

                {/* CENTER */}
                <main className="workspace-main">

                    {/* EDITOR */}
                    <section className="editor-panel">

                        {activeFile ? (
                            <CodeEditor
                                key={activeFile}
                                fileName={getFileName(
                                    activeFile
                                )}
                                value={fileContent}
                                onChange={
                                    handleFileChange
                                }
                            />
                        ) : (
                            <div className="editor-placeholder">
                                <span>
                                    No files found
                                </span>
                            </div>
                        )}

                    </section>

                    {/* AI CHAT */}
                    <section className="chat-panel">

                        <div className="panel-header">
                            <span>ForgeAI</span>
                        </div>

                        <div className="chat-messages">

                            {messages.length === 0 ? (
                                <div className="chat-placeholder">

                                    <h2>
                                        What do you want to build?
                                    </h2>

                                    <p>
                                        Describe your idea and
                                        ForgeAI will build it
                                        in your sandbox.
                                    </p>

                                </div>
                            ) : (
                                messages.map(
                                    (
                                        message,
                                        index
                                    ) => (
                                        <div
                                            key={index}
                                            className={`chat-message ${message.role}`}
                                        >

                                            <div className="message-label">
                                                {message.role ===
                                                "user"
                                                    ? "You"
                                                    : "ForgeAI"}
                                            </div>

                                            <div className="message-content">
                                                {message.content}
                                            </div>

                                        </div>
                                    )
                                )
                            )}

                            {isSending && (
                                <div className="chat-message assistant">

                                    <div className="message-label">
                                        ForgeAI
                                    </div>

                                    <div className="message-content">
                                        Building your project...
                                    </div>

                                </div>
                            )}

                        </div>

                        <div className="chat-input">

                            <input
                                value={prompt}
                                onChange={(event) =>
                                    setPrompt(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key ===
                                            "Enter" &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        handleSendPrompt();
                                    }
                                }}
                                disabled={isSending}
                                placeholder={
                                    isSending
                                        ? "ForgeAI is building..."
                                        : "Ask ForgeAI to build something..."
                                }
                            />

                            <button
                                onClick={
                                    handleSendPrompt
                                }
                                disabled={
                                    isSending ||
                                    !prompt.trim()
                                }
                            >
                                {isSending
                                    ? "..."
                                    : "Send"}
                            </button>

                        </div>

                    </section>

                </main>

                {/* PREVIEW */}
                <aside className="workspace-preview">

                    <div className="panel-header">
                        <span>Preview</span>
                    </div>

                    <div className="preview-frame-container">

                        {previewUrl ? (
                            <iframe
                                className="preview-frame"
                                src={previewUrl}
                                title="ForgeAI Live Preview"
                            />
                        ) : (
                            <div className="preview-placeholder">
                                <span>
                                    Starting preview...
                                </span>
                            </div>
                        )}

                    </div>

                </aside>

            </div>

            {/* TERMINAL */}
            <section className="workspace-terminal">

                <div className="panel-header">
                    <span>Terminal</span>
                </div>

                <div className="terminal-content">

                    <div className="terminal-output">

                        {terminalOutput.length === 0 && (
                            <div className="terminal-empty">
                                Terminal ready...
                            </div>
                        )}

                        {terminalOutput.map(
                            (item, index) => (
                                <div
                                    key={index}
                                    className={`terminal-line ${item.type}`}
                                >
                                    {item.text}
                                </div>
                            )
                        )}

                    </div>

                    <div className="terminal-input-row">

                        <span className="terminal-prompt">
                            $
                        </span>

                        <input
                            value={terminalInput}
                            onChange={(event) =>
                                setTerminalInput(
                                    event.target.value
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                        "Enter" &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault();
                                    handleTerminalCommand();
                                }
                            }}
                            disabled={isExecuting}
                            placeholder={
                                isExecuting
                                    ? "Running..."
                                    : "Enter command..."
                            }
                        />

                    </div>

                </div>

            </section>

        </div>
    );
}

export default Workspace;