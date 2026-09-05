import { useState, useEffect, useMemo } from "react";
import styles from "./LoadingHints.module.css";

const DEFAULT_HINTS = [
  {
    tag: "SYSTEM",
    text: "Waking up the free Render server... Worth the wait, I promise! ☕",
  },
  {
    tag: "PRO TIP",
    text: "You can explore all features instantly using Guest Login!",
  },
  {
    tag: "DATABASE",
    text: "Spinning up MongoDB Atlas clusters in the cloud... ☁️",
  },
  {
    tag: "DEV FACT",
    text: "90% of bug fixing is spent staring at console.log() 🐛",
  },
  {
    tag: "HEALTH",
    text: "Unclench your jaw, relax your shoulders, and take a deep breath 🧘‍♂️",
  },
  {
    tag: "API",
    text: "Connecting React frontend to Express backend... Almost ready! ⚡",
  },
  {
    tag: "EASTER EGG",
    text: "Reticulating splines and loading awesome UI components... 🎨",
  },
  {
    tag: "HEALTH",
    text: "Stay hydrated! Grab a sip of water while the server warms up 🚰",
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
  delay = 4000,
  hints = DEFAULT_HINTS,
  className = "",
  testMode = false,
}) => {
  const shuffledHints = useMemo(() => shuffleArray(hints), [hints]);

  const [hintIndex, setHintIndex] = useState(0);
  const [show, setShow] = useState(testMode);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!active && !testMode) return;

    let initialTimer;

    if (!testMode) {
      initialTimer = setTimeout(() => {
        setShow(true);
      }, delay);
    }

    const interval = setInterval(() => {
      setIsFadingOut(true);

      setTimeout(() => {
        setHintIndex((prev) => (prev + 1) % shuffledHints.length);
        setIsFadingOut(false);
      }, 700);
    }, 6000);

    return () => {
      if (initialTimer) clearTimeout(initialTimer);
      clearInterval(interval);
      if (!testMode) {
        setShow(false);
        setHintIndex(0);
        setIsFadingOut(false);
      }
    };
  }, [active, delay, shuffledHints.length, testMode]);

  if ((!active && !testMode) || !show) return null;

  const currentHint = shuffledHints[hintIndex];

  return (
    <div className={`${styles.hintCard} ${className}`}>
      <div
        key={hintIndex}
        className={`${styles.contentWrapper} ${
          isFadingOut ? styles.fadeOut : styles.fadeIn
        }`}
      >
        <span className={styles.icon}>✨</span>
        <p className={styles.hintText}>
          <span className={styles.tag}>{currentHint.tag}:</span>{" "}
          {currentHint.text}
        </p>
      </div>

      <div className={styles.progressBarContainer}>
        <div className={styles.pulseGlowBar} />
      </div>
    </div>
  );
};

export default LoadingHints;
