// src/pages/MessagesPage/components/HeaderStatusTextSwitcher.jsx
import { useState, useEffect, useRef, useLayoutEffect, memo } from "react";
import PropTypes from "prop-types";
import styles from "../MessagesPage.module.css";

const HeaderStatusTextSwitcher = memo(({ statusKey, isUserOnline }) => {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [delayedStatus, setDelayedStatus] = useState(null);
  const [bubbleWidth, setBubbleWidth] = useState("auto");

  const activeDisplayStatus = !isUserOnline
    ? "offline"
    : delayedStatus || (statusKey === "messages" ? "online" : "online");

  useEffect(() => {
    if (!isUserOnline) return;

    let timer;
    if (statusKey === "messages") {
      timer = setTimeout(() => {
        setDelayedStatus("messages");
      }, 300);
    } else {
      timer = setTimeout(() => {
        setDelayedStatus("online");
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [statusKey, isUserOnline]);

  useLayoutEffect(() => {
    if (measureRef.current) {
      const rect = measureRef.current.getBoundingClientRect();
      const targetWidth = Math.ceil(rect.width) + 26;
      setBubbleWidth(`${targetWidth}px`);
    }
  }, [activeDisplayStatus, isUserOnline]);

  if (!isUserOnline) {
    return (
      <div className={`${styles.headerStatusBubble} ${styles.bubbleOffline}`}>
        <span className={`${styles.bubbleDot} ${styles.dotOffline}`} />
        <span className={styles.statusContentInner}>Offline</span>
      </div>
    );
  }

  const isDirect = activeDisplayStatus === "messages";

  return (
    <div
      ref={containerRef}
      className={`${styles.headerStatusBubble} ${
        isDirect ? styles.bubbleDirect : styles.bubbleOnline
      }`}
      style={{ width: bubbleWidth }}
    >
      <div
        ref={measureRef}
        className={styles.measureContainer}
        aria-hidden="true"
      >
        <span className={styles.bubbleDot} />
        {isDirect ? (
          <span className={styles.statusContentInner}>
            <svg
              aria-label="Direct"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "5px" }}
            >
              <line x1="22" x2="9.218" y1="2" y2="10.083" />
              <polygon
                fill="currentColor"
                points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
              />
            </svg>
            In Direct Messages
          </span>
        ) : (
          <span className={styles.statusContentInner}>Online</span>
        )}
      </div>

      <span
        className={`${styles.bubbleDot} ${
          isDirect ? styles.dotPulse : styles.dotOnline
        }`}
      />

      <div className={styles.statusTextViewport}>
        <span key={activeDisplayStatus} className={styles.statusTextAnimated}>
          {isDirect ? (
            <span className={styles.statusContentInner}>
              <svg
                aria-label="Direct"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: "5px" }}
              >
                <line x1="22" x2="9.218" y1="2" y2="10.083" />
                <polygon
                  fill="currentColor"
                  points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
                />
              </svg>
              In Direct Messages
            </span>
          ) : (
            <span className={styles.statusContentInner}>Online</span>
          )}
        </span>
      </div>
    </div>
  );
});

HeaderStatusTextSwitcher.displayName = "HeaderStatusTextSwitcher";
HeaderStatusTextSwitcher.propTypes = {
  statusKey: PropTypes.string,
  isUserOnline: PropTypes.bool,
};

export default HeaderStatusTextSwitcher;
