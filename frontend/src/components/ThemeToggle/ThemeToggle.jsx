import { useState, useEffect, useRef } from "react";
import styles from "./ThemeToggle.module.css";

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
    />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <circle
      cx="12"
      cy="12"
      r="5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
    />
  </svg>
);

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [quickMode, setQuickMode] = useState(() => {
    return localStorage.getItem("quickMode") === "true";
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [targetTheme, setTargetTheme] = useState("");
  const [overlayText, setOverlayText] = useState("");

  const menuRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleToggle = (e) => {
    if (isAnimating) return;

    const nextTheme = theme === "light" ? "dark" : "light";

    if (quickMode || e.shiftKey) {
      changeTheme(nextTheme);
      return;
    }

    const textToShow =
      nextTheme === "dark"
        ? "Switching to Dark Mode"
        : "Switching to Light Mode";

    setTargetTheme(nextTheme);
    setOverlayText(textToShow);
    setIsAnimating(true);
    setIsMenuOpen(false);

    setTimeout(() => {
      changeTheme(nextTheme);
    }, 500);

    setTimeout(() => {
      setIsAnimating(false);
    }, 1200);
  };

  return (
    <div
      className={styles.toggleWrapper}
      ref={menuRef}
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <button
        onClick={handleToggle}
        className={styles.toggleBtn}
        aria-label="Toggle theme"
      >
        <span className={styles.icon}>
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </span>
      </button>

      <div
        className={`${styles.dropdownMenu} ${
          isMenuOpen ? styles.menuVisible : ""
        }`}
      >
        <div className={styles.menuHeader}>
          <span className={styles.menuTitle}>Theme Settings</span>
        </div>

        <div className={styles.menuRow}>
          <div className={styles.labelGroup}>
            <span className={styles.optionName}>Fast Mode</span>
            <span className={styles.optionDesc}>Skip curtain animation</span>
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={quickMode}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setQuickMode(isChecked);
                localStorage.setItem("quickMode", isChecked);
              }}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {isAnimating && (
        <div
          className={`${styles.curtainOverlay} ${styles.curtainActive} ${
            targetTheme === "dark" ? styles.curtainDark : styles.curtainLight
          }`}
        >
          <div className={styles.curtainText}>{overlayText}</div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
