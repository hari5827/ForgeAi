import {
    useEffect,useState
} from "react";

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

function sleep(ms) {
    return new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}

function Workspace() {
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();


    const [sessionId] = useState(() => {
        const existingSessionId =
            localStorage.getItem(
                "forgeai_session_id"
            );

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

    const [sandboxId, setSandboxId] =useState(null);

    const [previewUrl, setPreviewUrl] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] =useState(null);

    const [fileContent, setFileContent] =useState("");

    const [aiStatus, setAiStatus] =useState("");

    const [prompt, setPrompt] = useState("");

    const [messages, setMessages] = useState([]);
    const [terminalInput, setTerminalInput] = useState("");
    const [terminalOutput, setTerminalOutput] =useState([]);
    const [isExecuting, setIsExecuting] =useState(false);
    const handleClearTerminal = () => {
    setTerminalOutput([]);
      };
    const [showUserMenu, setShowUserMenu] = useState(false);

    const [loading, setLoading] = useState(true);

    const [isSending, setIsSending] =useState(false);
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

                /*
                 * Get or create the sandbox.
                 */
                const sandbox =
                    await getSessionSandbox(
                        token,
                        sessionId
                    );

                if (cancelled) return;

                const sandboxIdFromServer =
                    sandbox.sandboxId;

                setSandboxId(
                    sandboxIdFromServer
                );

                /*
                 * A newly-created sandbox may need
                 * a few seconds before its services
                 * are ready.
                 *
                 * listFiles() is used as the readiness
                 * check because it talks directly to
                 * the sandbox server.
                 */
                let fileResult = null;
                let lastError = null;

                for (
                    let attempt = 0;
                    attempt < 10;
                    attempt++
                ) {
                    if (cancelled) return;

                    try {
                        fileResult =
                            await listFiles(
                                sandboxIdFromServer
                            );

                        break;
                    } catch (err) {
                        lastError = err;

                        if (attempt === 9) {
                            throw lastError;
                        }

                        await sleep(1000);
                    }
                }

                if (
                    cancelled ||
                    !fileResult
                ) {
                    return;
                }

                /*
                 * Map file paths returned by the API.
                 */
                const mappedFiles =
                    fileResult.files.map(
                        (path) => ({
                            path,
                            name: getFileName(path)
                        })
                    );

                setFiles(mappedFiles);

                /*
                 * Select the first file.
                 */
                if (
                    mappedFiles.length > 0
                ) {
                    setActiveFile(
                        mappedFiles[0].path
                    );
                } else {
                    setActiveFile(null);
                    setFileContent("");
                }

                /*
                 * Give the Vite preview/router a small
                 * amount of extra startup time before
                 * mounting the iframe.
                 */
                await sleep(2000);

                if (cancelled) return;

                setPreviewUrl(
                    sandbox.previewUrl
                );

                /*
                 * Load chat history.
                 */
                const historyResult =
                    await getSessionHistory(
                        token,
                        sessionId
                    );

                if (cancelled) return;

                const historyMessages = [];

                for (
                    const item of
                        historyResult.history
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

                setMessages(
                    historyMessages
                );
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "WORKSPACE LOAD FAILED:",
                        err
                    );

                    setError(
                        err?.message ||
                        "Failed to load workspace."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        /*
         * Only initialize once for this mounted
         * Workspace instance.
         */
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

                const result =
                    await readFile(
                        sandboxId,
                        activeFile
                    );

                if (!cancelled) {
                    setFileContent(
                        result.content
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "FILE READ FAILED:",
                        err
                    );

                    setError(
                        err?.message ||
                        "Failed to read file."
                    );
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

            setError(
                err?.message ||
                "Failed to save file."
            );
        } finally {
            setIsSaving(false);
        }
    };

    /*
     * Send prompt to AI.
     */
    const handleSendPrompt = async () => {
        const trimmedPrompt =
            prompt.trim();

        if (
            !trimmedPrompt ||
            isSending ||
            !token ||
            !sessionId
        ) {
            return;
        }

        setIsSending(true);
        setError("");
        setAiStatus("Thinking...");

        /*
         * Add user message immediately.
         */
        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: trimmedPrompt
            }
        ]);

        setPrompt("");

        let planningTimer;

        try {
            planningTimer = setTimeout(() => {
                setAiStatus(
                    "Planning..."
                );
            }, 1000);

            /*
             * AI planning + action execution.
             */
            const result =
                await createAIPlan(
                    token,
                    sessionId,
                    trimmedPrompt
                );

            clearTimeout(planningTimer);

            setAiStatus(
                "Refreshing workspace..."
            );

            /*
             * Get current sandbox again.
             */
            const sandbox =
                await getSessionSandbox(
                    token,
                    sessionId
                );

            if (sandbox?.sandboxId) {
                setSandboxId(
                    sandbox.sandboxId
                );

                /*
                 * Hide preview briefly while refreshed
                 * sandbox state settles.
                 */
                setPreviewUrl(null);

                /*
                 * Refresh files.
                 */
                const fileResult =
                    await listFiles(
                        sandbox.sandboxId
                    );

                const mappedFiles =
                    fileResult.files.map(
                        (path) => ({
                            path,
                            name: getFileName(path)
                        })
                    );

                setFiles(mappedFiles);

                /*
                 * Refresh currently selected file.
                 */
                if (
                    activeFile &&
                    mappedFiles.some(
                        (file) =>
                            file.path ===
                            activeFile
                    )
                ) {
                    const refreshedFile =
                        await readFile(
                            sandbox.sandboxId,
                            activeFile
                        );

                    setFileContent(
                        refreshedFile.content
                    );
                }

                /*
                 * Give preview time to settle.
                 */
                await sleep(1500);

                setPreviewUrl(
                    sandbox.previewUrl
                );
            }

            /*
             * Add assistant response.
             */
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        result?.message ||
                        "Completed"
                }
            ]);

            setAiStatus("Done");

            setTimeout(() => {
                setAiStatus("");
            }, 1200);
        } catch (err) {
            if (planningTimer) {
                clearTimeout(
                    planningTimer
                );
            }

            console.error(
                "AI REQUEST FAILED:",
                err
            );

            setAiStatus("Failed");

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        `Error: ${
                            err?.message ||
                            "Something went wrong."
                        }`
                }
            ]);

            setError(
                err?.message ||
                "Something went wrong."
            );

            setTimeout(() => {
                setAiStatus("");
            }, 1500);
        } finally {
            setIsSending(false);
        }
    };

    /*
     * Execute terminal command.
     */
    const handleTerminalCommand =
        async () => {
            const command =
                terminalInput.trim();

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

                setTerminalOutput(
                    (current) => [
                        ...current,
                        {
                            type: "command",
                            text: `$ ${command}`
                        }
                    ]
                );

                setTerminalInput("");

                const result =
                    await executeCommand(
                        sandboxId,
                        command
                    );

                const commandResult =
                    result.results?.[0];

                if (
                    commandResult?.stdout
                ) {
                    setTerminalOutput(
                        (current) => [
                            ...current,
                            {
                                type: "output",
                                text:
                                    commandResult.stdout
                            }
                        ]
                    );
                }

                if (
                    commandResult?.stderr
                ) {
                    setTerminalOutput(
                        (current) => [
                            ...current,
                            {
                                type: "error",
                                text:
                                    commandResult.stderr
                            }
                        ]
                    );
                }
            } catch (err) {
                console.error(
                    "TERMINAL COMMAND FAILED:",
                    err
                );

                setError(
                    err?.message ||
                    "Terminal command failed."
                );

                setTerminalOutput(
                    (current) => [
                        ...current,
                        {
                            type: "error",
                            text:
                                err?.message ||
                                "Command failed."
                        }
                    ]
                );
            } finally {
                setIsExecuting(false);
            }
        };

    /*
     * New project.
     */
    const handleNewProject = () => {
        const confirmed =
            window.confirm(
                "Start a new project?\n\n" +
                "Your current project will remain in its existing session."
            );

        if (!confirmed) {
            return;
        }

        /*
         * Generate a completely new session.
         */
        const newSessionId =
            crypto.randomUUID();

        localStorage.setItem(
            "forgeai_session_id",
            newSessionId
        );

        /*
         * Reload so Workspace creates/loads
         * the new sandbox.
         */
        window.location.reload();
    };

    /*
     * Logout.
     */
    const handleLogout = async () => {
        setShowUserMenu(false);

        try {
            await logout();
        } finally {
            localStorage.removeItem(
                "forgeai_session_id"
            );

            navigate("/login", {
                replace: true
            });
        }
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

                    <span>
                        ForgeAI
                    </span>
                </div>

                <div className="workspace-actions">

                    <button
                        className="topbar-button"
                        onClick={
                            handleNewProject
                        }
                    >
                        New Project
                    </button>

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
                        disabled={!previewUrl}
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
                                    src={
                                        user.avatar
                                    }
                                    alt=""
                                />
                            ) : (
                                <div className="user-avatar">
                                    {user?.name
                                        ?.charAt(
                                            0
                                        )
                                        ?.toUpperCase() ||
                                        "U"}
                                </div>
                            )}

                            <span className="user-name">
                                {user?.name ||
                                    "User"}
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
                                            src={
                                                user.avatar
                                            }
                                            alt=""
                                        />
                                    ) : (
                                        <div className="user-avatar large">
                                            {user?.name
                                                ?.charAt(
                                                    0
                                                )
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
                                    onClick={
                                        handleLogout
                                    }
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
                        activeFile={
                            activeFile
                        }
                        onSelect={
                            setActiveFile
                        }
                    />

                </aside>

                {/* CENTER */}
                <main className="workspace-main">

                    {/* EDITOR */}
                    <section className="editor-panel">

                        {activeFile ? (
                            <CodeEditor
                                key={
                                    activeFile
                                }
                                fileName={getFileName(
                                    activeFile
                                )}
                                value={
                                    fileContent
                                }
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
                            <span>
                                ForgeAI
                            </span>
                        </div>

                        <div className="chat-messages">

                            {messages.length ===
                            0 ? (
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
                                            key={
                                                index
                                            }
                                            className={`chat-message ${message.role}`}
                                        >

                                            <div className="message-label">
                                                {message.role ===
                                                "user"
                                                    ? "You"
                                                    : "ForgeAI"}
                                            </div>

                                            <div className="message-content">
                                                {
                                                    message.content
                                                }
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
                                        {aiStatus ||
                                            "Building your project..."}
                                    </div>

                                </div>
                            )}

                        </div>

                        {/* AI STATUS */}
                        {aiStatus && (
                            <div className="ai-status">
                                <span className="ai-status-dot" />

                                <span>
                                    {aiStatus}
                                </span>
                            </div>
                        )}

                        <div className="chat-input">

                            <input
                                value={prompt}
                                onChange={(
                                    event
                                ) =>
                                    setPrompt(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                onKeyDown={(
                                    event
                                ) => {
                                    if (
                                        event.key ===
                                            "Enter" &&
                                        !event.shiftKey
                                    ) {
                                        event.preventDefault();
                                        handleSendPrompt();
                                    }
                                }}
                                disabled={
                                    isSending
                                }
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
                        <span>
                            Preview
                        </span>
                    </div>

                    <div className="preview-frame-container">

                        {previewUrl ? (
                            <iframe
                                className="preview-frame"
                                src={
                                    previewUrl
                                }
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

                <div className="panel-header terminal-header">
             <span>Terminal</span>
             <button
        className="terminal-clear-button"
        onClick={handleClearTerminal}
        disabled={terminalOutput.length === 0}
            >
             Clear
           </button>
           </div>

                <div className="terminal-content">

                    <div className="terminal-output">

                        {terminalOutput.length ===
                            0 && (
                            <div className="terminal-empty">
                                Terminal ready...
                            </div>
                        )}

                        {terminalOutput.map(
                            (
                                item,
                                index
                            ) => (
                                <div
                                    key={
                                        index
                                    }
                                    className={`terminal-line ${item.type}`}
                                >
                                    {
                                        item.text
                                    }
                                </div>
                            )
                        )}

                    </div>

                    <div className="terminal-input-row">

                        <span className="terminal-prompt">
                            $
                        </span>

                        <input
                            value={
                                terminalInput
                            }
                            onChange={(
                                event
                            ) =>
                                setTerminalInput(
                                    event
                                        .target
                                        .value
                                )
                            }
                            onKeyDown={(
                                event
                            ) => {
                                if (
                                    event.key ===
                                        "Enter" &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault();
                                    handleTerminalCommand();
                                }
                            }}
                            disabled={
                                isExecuting
                            }
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