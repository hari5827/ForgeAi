const ALLOWED_ACTIONS = new Set([
    "create_file",
    "update_file",
    "delete_file",
    "run_command"
]);

const ALLOWED_COMMANDS = new Set([
    "npm",
    "mkdir",
    "ls",
    "cat",
    "pwd"
]);
function validatePath(path) {
    if (
        typeof path !== "string" ||
        !path.trim() ||
        path.startsWith("/") ||
        path.includes("..") ||
        path.includes("\\")
    ) {
        throw new Error(`Invalid file path: ${path}`);
    }
}
function validateCommand(command) {
    const trimmed = command.trim();

    if (!trimmed) {
        throw new Error("Command cannot be empty");
    }
    const dangerousPatterns = [
        "&&",
        "||",
        ";",
        "|",
        ">",
        "<",
        "`",
        "$(",
        "\n",
        "\r"
    ];

    for (const pattern of dangerousPatterns) {
        if (trimmed.includes(pattern)) {
            throw new Error(
                `Command contains forbidden operator: ${pattern}`
            );
        }
    }
    const parts = trimmed.split(/\s+/);
    const executable = parts[0];

    if (!ALLOWED_COMMANDS.has(executable)) {
        throw new Error(
            `Command not allowed: ${executable}`
        );
    }
    const args = parts.slice(1);
    switch (executable) {
        case "npm":
            validateNpmCommand(args);
            break;

        case "mkdir":
            validateMkdirCommand(args);
            break;

        case "ls":
        case "cat":
            validateBasicCommand(args);
            break;

        case "pwd":
            if (args.length > 0) {
                throw new Error("pwd does not accept arguments");
            }
            break;
    }
}
function validateNpmCommand(args) {
    if (args.length === 0) {
        throw new Error("npm requires a subcommand");
    }
    const subcommand = args[0];
    const allowedSubcommands = new Set([
        "install",
        "run"
    ]);

    if (!allowedSubcommands.has(subcommand)) {
        throw new Error(
            `npm subcommand not allowed: ${subcommand}`
        );
    }

    if (subcommand === "run") {
        if (!args[1]) {
            throw new Error(
                "npm run requires a script name"
            );
        }

        if (
            args[1].startsWith("-") ||
            args[1].includes("/") ||
            args[1].includes("\\")
        ) {
            throw new Error(
                "Invalid npm script name"
            );
        }

        return;
    }
    if (subcommand === "install") {
        for (const arg of args.slice(1)) {
            if (
                arg.startsWith("-") &&
                ![
                    "--save",
                    "--save-dev",
                    "--legacy-peer-deps"
                ].includes(arg)
            ) {
                throw new Error(
                    `npm option not allowed: ${arg}`
                );
            }
        }
    }
}

function validateMkdirCommand(args) {
    if (args.length === 0) {
        throw new Error(
            "mkdir requires a directory path"
        );
    }
    for (const arg of args) {
        if (arg.startsWith("-")) {
            if (arg !== "-p") {
                throw new Error(
                    `mkdir option not allowed: ${arg}`
                );
            }

            continue;
        }

        validatePath(arg);
    }
}
function validateBasicCommand(args) {
    for (const arg of args) {
        if (
            arg.startsWith("-") &&
            ![
                "-l",
                "-a",
                "-la",
                "-al"
            ].includes(arg)
        ) {
            throw new Error(
                `Command option not allowed: ${arg}`
            );
        }

        if (!arg.startsWith("-")) {
            validatePath(arg);
        }
    }
}
function validateAction(action) {
    if (!action || typeof action !== "object") {
        throw new Error("Invalid action");
    }

    if (!ALLOWED_ACTIONS.has(action.action)) {
        throw new Error(
            `Unsupported action: ${action.action}`
        );
    }
    switch (action.action) {
        case "create_file":
        case "update_file":
            validatePath(action.path);

            if (typeof action.content !== "string") {
                throw new Error(
                    `${action.action} requires string content`
                );
            }

            break;

        case "delete_file":
            validatePath(action.path);
            break;

        case "run_command":
            if (typeof action.command !== "string") {
                throw new Error(
                    "run_command requires a command"
                );
            }

            validateCommand(action.command);
            break;
    }

    return true;
}
export function validateActions(actions) {
    if (!Array.isArray(actions)) {
        throw new Error("Actions must be an array");
    }

    if (actions.length === 0) {
        throw new Error(
            "At least one action is required"
        );
    }

    if (actions.length > 50) {
        throw new Error("Too many actions");
    }

    actions.forEach(validateAction);

    return true;
}