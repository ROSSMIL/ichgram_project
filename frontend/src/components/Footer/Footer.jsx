import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer = ({ onSearchToggle, isSearchOpen, openCreateModal }) => {
  const footerRef = useRef(null);

  useEffect(() => {
    const updateFooterHeight = () => {
      const isAnyModalOpen = !!document.querySelector("[class*='modal']");

      if (footerRef.current) {
        if (isAnyModalOpen) {
          document.documentElement.style.setProperty("--footer-height", "0px");
        } else {
          const height = footerRef.current.offsetHeight;
          document.documentElement.style.setProperty(
            "--footer-height",
            `${height}px`,
          );
        }
      }
    };

    updateFooterHeight();

    window.addEventListener("resize", updateFooterHeight);

    const observer = new MutationObserver(updateFooterHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", updateFooterHeight);
      observer.disconnect();
    };
  }, []);

  return (
    <footer ref={footerRef} className={styles.footer}>
      <div className={styles.footerLinks}>
        <Link to="/dashboard">Home</Link>
        <button
          type="button"
          className={`${styles.searchButton} ${isSearchOpen ? styles.active : ""}`}
          onClick={onSearchToggle}
        >
          Search
        </button>
        <Link to="/explore">Explore</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/notifications">Notifications</Link>
        <Link
          to="#"
          className={styles.createLink}
          onClick={(e) => {
            e.preventDefault();
            openCreateModal();
          }}
        >
          Create
        </Link>
      </div>
      <div className={styles.footerCopyright}>© 2026 ICHgram</div>
    </footer>
  );
};

export default Footer;
