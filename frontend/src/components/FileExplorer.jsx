import "./FileExplorer.css";

function FileExplorer({ files, activeFile, onSelect }) {
    return (
        <div className="file-explorer">
            <div className="explorer-title">EXPLORER</div>

            <div className="file-tree">
                <div className="folder-name">src</div>

                {files
                    .filter((file) => file.path.startsWith("src/"))
                    .map((file) => (
                        <button
                            key={file.path}
                            className={`file-item ${
                                activeFile === file.path ? "active" : ""
                            }`}
                            onClick={() => onSelect(file.path)}
                        >
                            <span className="file-icon">
                                {file.path.endsWith(".jsx")
                                    ? "JS"
                                    : file.path.endsWith(".css")
                                      ? "#"
                                      : "{}"}
                            </span>

                            <span>{file.name}</span>
                        </button>
                    ))}

                {files
                    .filter((file) => !file.path.startsWith("src/"))
                    .map((file) => (
                        <button
                            key={file.path}
                            className={`file-item ${
                                activeFile === file.path ? "active" : ""
                            }`}
                            onClick={() => onSelect(file.path)}
                        >
                            <span className="file-icon">
                                {}
                            </span>

                            <span>{file.name}</span>
                        </button>
                    ))}
            </div>
        </div>
    );
}

export default FileExplorer;