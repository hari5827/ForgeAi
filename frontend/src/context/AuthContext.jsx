import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(
        () => localStorage.getItem("forgeai_token")
    );

    const login = (newToken) => {
        localStorage.setItem("forgeai_token", newToken);
        setToken(newToken);
    };

    const logout = async () => {
        const currentToken = localStorage.getItem("forgeai_token");

        if (currentToken) {
            try {
                await fetch("http://localhost:4000/api/auth/logout", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${currentToken}`
                    }
                });
            } catch (error) {
                console.error("Logout request failed:", error);
            }
        }

        localStorage.removeItem("forgeai_token");
        setToken(null);
    };

    useEffect(() => {
        // Keeps auth state synced if another tab changes localStorage.
        const handleStorage = (event) => {
            if (event.key === "forgeai_token") {
                setToken(event.newValue);
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}