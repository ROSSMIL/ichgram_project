// src/pages/MessagesPage/components/CheckmarkIcon.jsx
import { memo } from "react";
import PropTypes from "prop-types";
import styles from "../MessagesPage.module.css";

const CheckmarkIcon = memo(({ isRead, isSending }) => {
  if (isSending) {
    return (
      <span
        className={`${styles.readStatus} ${styles.sendingStatus}`}
        title="Sending..."
      >
        <svg
          viewBox="0 0 12 11"
          className={styles.singleCheckSvg}
          style={{ opacity: 0.5 }}
        >
          <path
            d="M1.5 5.5L4.5 8.5L10.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (isRead) {
    return (
      <span className={`${styles.readStatus} ${styles.read}`} title="Read">
        <svg viewBox="0 0 16 11" className={styles.doubleCheckSvg}>
          <path
            d="M1.5 5.5L4.5 8.5L10.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 5.5L8.5 8.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${styles.readStatus} ${styles.unread}`} title="Sent">
      <svg viewBox="0 0 12 11" className={styles.singleCheckSvg}>
        <path
          d="M1.5 5.5L4.5 8.5L10.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
});

CheckmarkIcon.displayName = "CheckmarkIcon";
CheckmarkIcon.propTypes = {
  isRead: PropTypes.bool,
  isSending: PropTypes.bool,
};

export default CheckmarkIcon;
