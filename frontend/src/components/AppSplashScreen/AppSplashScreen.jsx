import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import LoadingHints from "../LoadingHints/LoadingHints";
import styles from "./AppSplashScreen.module.css";

const LOGO_LETTERS_CONFIG = [
  { char: "I", xOffset: -84 },
  { char: "C", xOffset: -58 },
  { char: "H", xOffset: -30 },
  { char: "G", xOffset: 0 },
  { char: "R", xOffset: 30 },
  { char: "A", xOffset: 58 },
  { char: "M", xOffset: 88 },
];

const GAME_STYLE_HINTS = [
  {
    tag: "SYSTEM",
    text: "Waking up free Render server... Cleaning up snot and warming CPUs!",
  },
  {
    tag: "EASTER EGG",
    text: "Reticulating 3D splines and carefully polishing all UI pixels...",
  },
  {
    tag: "DEV FACT",
    text: "90% of bug fixing time is spent staring at console.log() output.",
  },
  {
    tag: "DATABASE",
    text: "Feeding MongoDB Atlas hamsters to spin up cloud database fast...",
  },
  {
    tag: "PRO TIP",
    text: "Unclench your jaw, relax your shoulders, and grab a sip of water!",
  },
  {
    tag: "API",
    text: "Connecting WebSockets and shaking hands with Express backend...",
  },
  {
    tag: "HEALTH",
    text: "Take a deep breath and stretch your back while server warms up.",
  },
];

const AppSplashScreen = ({
  isFinished = false,
  onAnimationComplete,
  testMode = false,
}) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  const [showHints, setShowHints] = useState(testMode);

  useEffect(() => {
    if (testMode) return;

    const hintsTimer = setTimeout(() => {
      setShowHints(true);
    }, 3500);

    return () => clearTimeout(hintsTimer);
  }, [testMode]);

  useEffect(() => {
    if (testMode || !isFinished) return;

    const animationFrame = requestAnimationFrame(() => {
      setIsLeaving(true);
    });

    const timer = setTimeout(() => {
      setShouldRender(false);
      if (onAnimationComplete) onAnimationComplete();
    }, 600);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timer);
    };
  }, [isFinished, onAnimationComplete, testMode]);

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.splashContainer} ${
        isLeaving ? styles.splashLeaving : ""
      }`}
    >
      {testMode && (
        <div className={styles.testBadge}>SPLASH TEST MODE ACTIVE</div>
      )}

      <div className={styles.centerContent}>
        <div className={styles.orbitLogoWrapper}>
          <div className={styles.ambientGlow} />

          <div className={styles.lettersContainer}>
            {LOGO_LETTERS_CONFIG.map((item, index) => {
              const totalLetters = LOGO_LETTERS_CONFIG.length;
              const angle = (360 / totalLetters) * index;

              return (
                <span
                  key={index}
                  className={styles.orbitChar}
                  style={{
                    "--i": index,
                    "--angle": `${angle}deg`,
                    "--x-offset": `${item.xOffset}px`,
                  }}
                >
                  {item.char}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {showHints && (
        <div className={styles.cornerHintsWrapper}>
          <LoadingHints
            active={true}
            delay={0}
            hints={GAME_STYLE_HINTS}
            testMode={testMode}
          />
        </div>
      )}
    </div>
  );
};

AppSplashScreen.propTypes = {
  isFinished: PropTypes.bool,
  onAnimationComplete: PropTypes.func,
  testMode: PropTypes.bool,
};

export default AppSplashScreen;
