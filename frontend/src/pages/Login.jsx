import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const googleButtonRef = useRef(null);

    const [error, setError] = useState("");

   useEffect(() => {
    const initializeGoogle = () => {
        if (!window.google?.accounts?.id || !googleButtonRef.current) {
            console.log("Google Identity Services not ready");
            return;
        }

        googleButtonRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
            googleButtonRef.current,
            {
                theme: "filled_black",
                size: "large",
                width: 360,
                text: "continue_with",
                shape: "rectangular",
            }
        );
    };

    const existingScript = document.getElementById("google-gsi-script");

    if (existingScript) {
        if (window.google?.accounts?.id) {
            initializeGoogle();
        } else {
            existingScript.addEventListener("load", initializeGoogle);
        }

        return;
    }

    const script = document.createElement("script");

    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;

    document.head.appendChild(script);
}, []);

    const handleGoogleResponse = async (response) => {
        setError("");

        if (!response?.credential) {
            setError("Google authentication failed.");
            return;
        }

        try {
            const apiResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/api/auth/google`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        credential: response.credential
                    })
                }
            );

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(
                    data.message || "Google authentication failed."
                );
            }

            login(data.token);

            navigate("/workspace", { replace: true });
        } catch (error) {
            console.error("GOOGLE LOGIN FAILED:", error);
            setError(error.message || "Unable to sign in.");
        }
    };

    return (
        <main className="login-page">
            <div className="login-glow login-glow-one" />
            <div className="login-glow login-glow-two" />

            <section className="login-card">
                <div className="login-brand">
                    <div className="brand-mark">F</div>
                    <span>ForgeAI</span>
                </div>

                <div className="login-content">
                    <p className="login-eyebrow">
                        AI DEVELOPMENT WORKSPACE
                    </p>

                    <h1>
                        Build faster with
                        <span> ForgeAI.</span>
                    </h1>

                    <p className="login-description">
                        Describe what you want to build.
                        ForgeAI handles the code, sandbox, and execution.
                    </p>

                    <div className="google-button-wrapper">
                        <div ref={googleButtonRef} />
                    </div>

                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <p className="login-note">
                        Secure authentication powered by Google
                    </p>
                </div>
            </section>
        </main>
    );
}

export default Login;