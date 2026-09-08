import { useMemo, useState } from "react";
import "./FileExplorer.css";

function getFileIcon(fileName) {
    if (fileName.endsWith(".jsx") || fileName.endsWith(".js")) {
        return "JS";
    }

    if (fileName.endsWith(".css")) {
        return "#";
    }

    if (fileName.endsWith(".html")) {
        return "<>";
    }

    if (fileName.endsWith(".json")) {
        return "{}";
    }

    return "•";
}

function FileExplorer({ files, activeFile, onSelect }) {
    const [expandedFolders, setExpandedFolders] = useState(
        new Set(["src"])
    );

    const tree = useMemo(() => {
        const folders = new Map();
        const rootFiles = [];

        for (const file of files) {
            const parts = file.path.split("/");

            if (parts.length === 1) {
                rootFiles.push(file);
                continue;
            }

            const folder = parts[0];

            if (!folders.has(folder)) {
                folders.set(folder, []);
            }

            folders.get(folder).push(file);
        }

        return {
            folders: Array.from(folders.entries()).sort(
                ([a], [b]) => a.localeCompare(b)
            ),
            rootFiles: rootFiles.sort((a, b) =>
                a.name.localeCompare(b.name)
            )
        };
    }, [files]);

    const toggleFolder = (folderName) => {
        setExpandedFolders((current) => {
            const next = new Set(current);

            if (next.has(folderName)) {
                next.delete(folderName);
            } else {
                next.add(folderName);
            }

            return next;
        });
    };

    return (
        <div className="file-explorer">
            <div className="explorer-title">
                <span>EXPLORER</span>

                <span className="explorer-count">
                    {files.length}
                </span>
            </div>

            <div className="file-tree">

                {tree.folders.map(
                    ([folderName, folderFiles]) => {
                        const isExpanded =
                            expandedFolders.has(folderName);

                        return (
                            <div
                                className="tree-folder"
                                key={folderName}
                            >
                                <button
                                    className="folder-row"
                                    onClick={() =>
                                        toggleFolder(
                                            folderName
                                        )
                                    }
                                >
                                    <span className="folder-chevron">
                                        {isExpanded
                                            ? "▼"
                                            : "▶"}
                                    </span>

                                    <span className="folder-icon">
                                        {isExpanded
                                            ? "▾"
                                            : "▸"}
                                    </span>

                                    <span>
                                        {folderName}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="folder-children">
                                        {folderFiles
                                            .sort((a, b) =>
                                                a.name.localeCompare(
                                                    b.name
                                                )
                                            )
                                            .map(
                                                (file) => (
                                                    <button
                                                        key={
                                                            file.path
                                                        }
                                                        className={`file-row ${
                                                            activeFile ===
                                                            file.path
                                                                ? "active"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            onSelect(
                                                                file.path
                                                            )
                                                        }
                                                    >
                                                        <span className="file-icon">
                                                            {getFileIcon(
                                                                file.name
                                                            )}
                                                        </span>

                                                        <span className="file-name">
                                                            {
                                                                file.name
                                                            }
                                                        </span>
                                                    </button>
                                                )
                                            )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}

                {tree.rootFiles.map((file) => (
                    <button
                        key={file.path}
                        className={`file-row root-file ${
                            activeFile === file.path
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            onSelect(file.path)
                        }
                    >
                        <span className="file-icon">
                            {getFileIcon(file.name)}
                        </span>

                        <span className="file-name">
                            {file.name}
                        </span>
                    </button>
                ))}

                {files.length === 0 && (
                    <div className="explorer-empty">
                        No files
                    </div>
                )}

            </div>
        </div>
    );
}

export default FileExplorer;