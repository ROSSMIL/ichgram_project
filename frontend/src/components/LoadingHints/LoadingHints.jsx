import { useState, useEffect, useMemo } from "react";
import styles from "./LoadingHints.module.css";

const HINT_ICONS = {
  SYSTEM: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  "PRO TIP": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  ),
  DATABASE: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  "DEV FACT": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  HEALTH: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  API: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  "EASTER EGG": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const DEFAULT_HINTS = [
  {
    tag: "SYSTEM",
    text: "Waking up free Render server... Worth the wait, I promise!",
  },
  {
    tag: "PRO TIP",
    text: "You can explore all features instantly using Guest Login option.",
  },
  {
    tag: "DATABASE",
    text: "Spinning up MongoDB Atlas clusters in the cloud for you...",
  },
  {
    tag: "DEV FACT",
    text: "90% of bug fixing time is spent staring at console.log() output.",
  },
  {
    tag: "HEALTH",
    text: "Unclench your jaw, relax your shoulders, and take a deep breath.",
  },
  {
    tag: "API",
    text: "Connecting React frontend to Express backend... Almost ready!",
  },
  {
    tag: "EASTER EGG",
    text: "Reticulating splines and loading awesome UI components...",
  },
  {
    tag: "HEALTH",
    text: "Stay hydrated! Grab a sip of water while server warms up.",
  },
];

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const LoadingHints = ({
  active,
  delay = 3500,
  hints = DEFAULT_HINTS,
  className = "",
  testMode = false,
}) => {
  const shuffledHints = useMemo(() => shuffleArray(hints), [hints]);

  const [hintIndex, setHintIndex] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [show, setShow] = useState(() => testMode);

  useEffect(() => {
    if (!active && !testMode) {
      return;
    }

    let initialTimer;
    let intervalTimer;

    const startCycle = () => {
      setHintIndex(0);
      setIsChanging(false);

      intervalTimer = setInterval(() => {
        setIsChanging(true);

        setTimeout(() => {
          setHintIndex((prev) => (prev + 1) % shuffledHints.length);
          setIsChanging(false);
        }, 350);
      }, 5200);
    };

    if (testMode) {
      startCycle();
    } else {
      initialTimer = setTimeout(() => {
        setShow(true);
        startCycle();
      }, delay);
    }

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
    };
  }, [active, delay, shuffledHints.length, testMode]);

  if ((!active && !testMode) || !show) return null;

  const currentHint = shuffledHints[hintIndex];

  return (
    <div className={`${styles.hintCard} ${className}`}>
      <div className={styles.loaderTrack}>
        <div className={styles.loaderBeam} />
      </div>

      <div
        key={hintIndex}
        className={`${styles.contentWrapper} ${
          isChanging ? styles.slideOut : styles.slideIn
        }`}
      >
        <div className={styles.badgeRow}>
          <div className={styles.tagBadge}>
            <span className={styles.icon}>
              {HINT_ICONS[currentHint.tag] || HINT_ICONS.SYSTEM}
            </span>
            <span className={styles.tagText}>{currentHint.tag}</span>
          </div>
        </div>

        <p className={styles.hintText}>{currentHint.text}</p>
      </div>
    </div>
  );
};

export default LoadingHints;
