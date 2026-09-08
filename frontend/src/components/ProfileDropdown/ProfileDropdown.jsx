import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api/axios";
import Avatar from "../Avatar/Avatar";
import styles from "./ProfileDropdown.module.css";

const UserIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
    />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
    />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
    />
  </svg>
);

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

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
    />
  </svg>
);

const ProfileDropdown = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        return JSON.parse(atob(token.split(".")[1]));
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const [quickMode, setQuickMode] = useState(
    () => localStorage.getItem("quickMode") === "true",
  );

  const [isAnimating, setIsAnimating] = useState(false);
  const [targetTheme, setTargetTheme] = useState("");
  const [overlayText, setOverlayText] = useState("");

  const menuRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const animTimer1Ref = useRef(null);
  const animTimer2Ref = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const { data } = await API.get("/api/users/profile");
        if (isMounted) {
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Failed to load user in ProfileDropdown:", err);
      }
    };

    loadProfile();

    const handleProfileUpdate = () => {
      loadProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("profileUpdated", handleProfileUpdate);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (animTimer1Ref.current) clearTimeout(animTimer1Ref.current);
      if (animTimer2Ref.current) clearTimeout(animTimer2Ref.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 180);
  };

  const handleAvatarClick = () => {
    setIsMenuOpen(false);
    navigate("/profile");
  };

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleToggleTheme = (e) => {
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

    animTimer1Ref.current = setTimeout(() => {
      changeTheme(nextTheme);
    }, 500);

    animTimer2Ref.current = setTimeout(() => {
      setIsAnimating(false);
    }, 1200);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div
      className={styles.dropdownWrapper}
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={styles.triggerBtn}
        onClick={handleAvatarClick}
        aria-label="User profile menu"
      >
        <div className={styles.avatarBorder}>
          {currentUser ? (
            <Avatar user={currentUser} size={36} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <UserIcon />
            </div>
          )}
        </div>
      </button>

      <div
        className={`${styles.dropdownMenu} ${
          isMenuOpen ? styles.menuVisible : ""
        }`}
      >
        {currentUser && (
          <Link
            to="/profile"
            className={styles.userInfoHeader}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className={styles.username}>@{currentUser.username}</span>
            <span className={styles.fullName}>
              {currentUser.fullName || currentUser.username}
            </span>
          </Link>
        )}

        <div className={styles.menuDivider} />

        <Link
          to="/profile"
          className={styles.menuLink}
          onClick={() => setIsMenuOpen(false)}
        >
          <span className={styles.menuIcon}>
            <UserIcon />
          </span>
          <span>Profile</span>
        </Link>

        <Link
          to="/edit-profile"
          className={styles.menuLink}
          onClick={() => setIsMenuOpen(false)}
        >
          <span className={styles.menuIcon}>
            <EditIcon />
          </span>
          <span>Edit Profile</span>
        </Link>

        <div className={styles.menuDivider} />

        <div className={styles.menuSectionTitle}>Preferences</div>

        <div className={styles.menuRowClickable} onClick={handleToggleTheme}>
          <div className={styles.labelGroup}>
            <span className={styles.optionName}>Theme</span>
            <span className={styles.optionDesc}>
              {theme === "light" ? "Light Mode" : "Dark Mode"}
            </span>
          </div>
          <span className={styles.themeIconWrapper}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </span>
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

        <div className={styles.menuDivider} />

        <button
          type="button"
          className={`${styles.menuLink} ${styles.danger}`}
          onClick={handleLogout}
        >
          <span className={styles.menuIcon}>
            <LogoutIcon />
          </span>
          <span>Log Out</span>
        </button>
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

export default ProfileDropdown;
