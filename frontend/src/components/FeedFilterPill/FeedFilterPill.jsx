import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import styles from "./FeedFilterPill.module.css";

const FeedFilterPill = ({ activeFilter, onFilterChange }) => {
  const containerRef = useRef(null);
  const tabsRef = useRef({});
  const [gliderStyle, setGliderStyle] = useState({
    transform: "translateX(0px)",
    width: "0px",
    opacity: 0,
  });

  const updateGlider = useCallback(() => {
    const activeTab = tabsRef.current[activeFilter];
    const container = containerRef.current;

    if (activeTab && container) {
      const activeRect = activeTab.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const leftOffset = activeRect.left - containerRect.left - 4;
      const width = activeRect.width;

      setGliderStyle({
        transform: `translateX(${leftOffset}px)`,
        width: `${width}px`,
        opacity: 1,
      });
    }
  }, [activeFilter]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      updateGlider();
    });

    window.addEventListener("resize", updateGlider);

    const observer = new MutationObserver(() => {
      updateGlider();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(animationFrame);
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
      <div className={styles.glider} style={gliderStyle} />

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
