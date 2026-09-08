import logoIcon from "../assets/logo assets/forgeai_icon_blue.svg";

/**
 * Shared ForgeAI logo mark.
 *
 * Reuses the existing icon asset from
 * src/assets/logo assets/forgeai_icon_blue.svg
 * everywhere a logo is needed (topbar, login, loading screen)
 * so there is a single source of truth instead of
 * duplicated <img> implementations.
 */
export default function Logo({ className = "", size = 30, alt = "ForgeAI" }) {
    return (
        <img
            src={logoIcon}
            alt={alt}
            className={`forgeai-logo ${className}`.trim()}
            style={{ width: size, height: size }}
            draggable={false}
        />
    );
}
