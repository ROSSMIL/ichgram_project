import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import API from "../../api/axios";
import styles from "./GlobalServerError.module.css";

const GlobalServerError = ({ onSuccess }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const checkServerStatus = useCallback(async () => {
    if (isChecking || cooldown > 0) return;

    setIsChecking(true);

    try {
      const token = localStorage.getItem("token");
      await API.get("/api/users/profile", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      onSuccess();
    } catch {
      setCooldown(4);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, cooldown, onSuccess]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const handleOnline = () => {
      checkServerStatus();
    };

    const handleFocus = () => {
      checkServerStatus();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkServerStatus]);

  return (
    <div className={styles.overlayContainer}>
      <div className={styles.backdropGlow} />

      <div className={styles.errorCard}>
        <div className={styles.iconContainer}>
          <div className={styles.pulseRing} />
          <svg
            viewBox="0 0 24 24"
            className={styles.wrenchIcon}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <span className={styles.statusBadge}>SYSTEM MAINTENANCE</span>

        <h1 className={styles.title}>Backend Under Maintenance</h1>

        <p className={styles.description}>
          Our admin is currently updating system modules or warming up cloud
          nodes. Don’t worry, your data is safe!
        </p>

        <button
          type="button"
          className={styles.retryButton}
          onClick={checkServerStatus}
          disabled={isChecking || cooldown > 0}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${styles.refreshIcon} ${
              isChecking ? styles.spinning : ""
            }`}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>
            {isChecking
              ? "Connecting..."
              : cooldown > 0
                ? `Retry in ${cooldown}s`
                : "Try Reconnecting"}
          </span>
        </button>
      </div>
    </div>
  );
};

GlobalServerError.propTypes = {
  onSuccess: PropTypes.func.isRequired,
};

export default GlobalServerError;
