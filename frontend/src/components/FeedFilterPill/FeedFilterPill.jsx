import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import styles from "./FeedFilterPill.module.css";

const FeedFilterPill = ({ activeFilter, onFilterChange }) => {
  const containerRef = useRef(null);
  const tabsRef = useRef({});
  const isFirstRender = useRef(true);

  const [gliderStyle, setGliderStyle] = useState(() => ({
    transform: "translateX(0px)",
    width: "0px",
    opacity: 0,
    isReady: false,
  }));

  const updateGlider = useCallback(() => {
    const activeTab = tabsRef.current[activeFilter];

    if (activeTab) {
      const leftOffset = activeTab.offsetLeft;
      const width = activeTab.offsetWidth;

      if (width > 0) {
        setGliderStyle({
          transform: `translateX(${leftOffset}px)`,
          width: `${width}px`,
          opacity: 1,
          isReady: !isFirstRender.current,
        });

        if (isFirstRender.current) {
          requestAnimationFrame(() => {
            isFirstRender.current = false;
          });
        }
      }
    }
  }, [activeFilter]);

  useLayoutEffect(() => {
    updateGlider();
  }, [updateGlider]);

  useEffect(() => {
    window.addEventListener("resize", updateGlider);

    const observer = new MutationObserver(() => {
      updateGlider();
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    return () => {
      window.removeEventListener("resize", updateGlider);
      observer.disconnect();
    };
  }, [updateGlider]);

  const handleTabClick = (filterName) => {
    onFilterChange(filterName);

    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return createPortal(
    <div ref={containerRef} className={styles.filterContainer}>
      <div
        className={`${styles.glider} ${
          !gliderStyle.isReady ? styles.noAnimation : ""
        }`}
        style={{
          transform: gliderStyle.transform,
          width: gliderStyle.width,
          opacity: gliderStyle.opacity,
        }}
      />

      <button
        ref={(el) => (tabsRef.current["all"] = el)}
        type="button"
        className={`${styles.filterTab} ${
          activeFilter === "all" ? styles.active : ""
        }`}
        onClick={() => handleTabClick("all")}
      >
        All
      </button>

      <button
        ref={(el) => (tabsRef.current["following"] = el)}
        type="button"
        className={`${styles.filterTab} ${
          activeFilter === "following" ? styles.active : ""
        }`}
        onClick={() => handleTabClick("following")}
      >
        Following
      </button>

      <button
        ref={(el) => (tabsRef.current["discover"] = el)}
        type="button"
        className={`${styles.filterTab} ${
          activeFilter === "discover" ? styles.active : ""
        }`}
        onClick={() => handleTabClick("discover")}
      >
        Explore
      </button>
    </div>,
    document.body,
  );
};

FeedFilterPill.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default FeedFilterPill;
