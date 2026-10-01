// src/pages/MessagesPage/components/SenderProfilePortal/SenderProfilePortal.jsx
import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import Avatar from "../../../components/Avatar/Avatar";
import { getLoggedInUsername } from "../../../utils/recentlyViewed";
import styles from "../MessagesPage.module.css";

const SenderProfilePortal = ({
  sender,
  linkRef,
  isHovered,
  isClosing,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const portalRef = useRef(null);

  const isDeleted =
    sender?.isDeleted ||
    sender?.username === "Deleted User" ||
    sender?.username?.startsWith("deleted_user_");

  useEffect(() => {
    if ((isHovered || isClosing) && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isHovered, isClosing, linkRef]);

  if (!isHovered && !isClosing) return null;

  const getProfileLink = (targetUsername) => {
    const currentUsername = getLoggedInUsername();
    if (!targetUsername) return "/profile";

    if (
      currentUsername &&
      currentUsername.toLowerCase() === targetUsername.toLowerCase()
    ) {
      return "/profile";
    }
    return `/user/${targetUsername}`;
  };

  const portalContent = (
    <>
      <Avatar user={sender} size={40} />

      <div className={styles.senderHoverInfo}>
        <span className={styles.senderHoverUsername}>
          {isDeleted ? "Deleted User" : sender?.username || "User"}
        </span>
        <span className={styles.senderHoverFullName}>
          {isDeleted ? "Account Deleted" : sender?.fullName || ""}
        </span>

        {isDeleted ? (
          <div className={styles.deletedHoverBadgePill}>
            <svg
              viewBox="0 0 24 24"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Profile unavailable</span>
          </div>
        ) : (
          <div className={styles.senderHoverActionPill}>
            <span>View Profile</span>
            <div className={styles.arrowCircleBadge}>
              <svg
                viewBox="0 0 24 24"
                className={styles.hoverArrowSvg}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const containerClasses = `${styles.senderHoverCardPortal} ${
    isClosing ? styles.senderHoverCardPortalExit : ""
  } ${isDeleted ? styles.deletedHoverCard : ""}`;

  const containerStyle = {
    position: "absolute",
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    zIndex: 9999,
  };

  return ReactDOM.createPortal(
    !isDeleted ? (
      <Link
        ref={portalRef}
        to={getProfileLink(sender?.username)}
        style={containerStyle}
        className={containerClasses}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {portalContent}
      </Link>
    ) : (
      <div
        ref={portalRef}
        style={containerStyle}
        className={containerClasses}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {portalContent}
      </div>
    ),
    document.body,
  );
};

SenderProfilePortal.propTypes = {
  sender: PropTypes.object,
  linkRef: PropTypes.object,
  isHovered: PropTypes.bool,
  isClosing: PropTypes.bool,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default SenderProfilePortal;
