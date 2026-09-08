import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

const AuthContext = createContext(null);

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(
        () => localStorage.getItem("forgeai_token")
    );

    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            if (!token) {
                setUser(null);
                setAuthLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_URL}/api/auth/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error("Session expired");
                }

                const data = await response.json();

                setUser(data.user);
            } catch (error) {
                console.error(
                    "AUTH SESSION FAILED:",
                    error
                );

                localStorage.removeItem(
                    "forgeai_token"
                );

                setToken(null);
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        }

        loadUser();
    }, [token]);

    const login = (newToken, newUser = null) => {
        localStorage.setItem(
            "forgeai_token",
            newToken
        );

        setToken(newToken);

        if (newUser) {
            setUser(newUser);
        }
    };

    const logout = async () => {
        const currentToken =
            localStorage.getItem("forgeai_token");

        if (currentToken) {
            try {
                await fetch(
                    `${API_URL}/api/auth/logout`,
                    {
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${currentToken}`
                        }
                    }
                );
            } catch (error) {
                console.error(
                    "Logout request failed:",
                    error
                );
            }
        }

        localStorage.removeItem(
            "forgeai_token"
        );

        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                authLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}