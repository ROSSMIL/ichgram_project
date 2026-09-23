import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./ScrollToTopButton.module.css";

const ScrollToTopButton = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const scrollToTop = useCallback(() => {
    setIsClicked(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    const appContent =
      document.querySelector(".app-content") || document.querySelector("main");
    if (appContent) {
      appContent.scrollTo({ top: 0, behavior: "smooth" });
    }

    setTimeout(() => {
      setIsClicked(false);
    }, 400);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const appContent =
        document.querySelector(".app-content") ||
        document.querySelector("main");

      const scrollOffset =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        (appContent ? appContent.scrollTop : 0) ||
        0;

      if (scrollOffset > 150) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("wheel", handleScroll, { passive: true });

    const appContent =
      document.querySelector(".app-content") || document.querySelector("main");
    if (appContent) {
      appContent.addEventListener("scroll", handleScroll, { passive: true });
    }

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("wheel", handleScroll);
      if (appContent) {
        appContent.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  return createPortal(
    <button
      type="button"
      className={`${styles.scrollTopBtn} ${
        showScrollTop ? styles.showScrollBtn : ""
      } ${isClicked ? styles.clicked : ""}`}
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.arrowIcon}
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>,
    document.body,
  );
};

export default ScrollToTopButton;
