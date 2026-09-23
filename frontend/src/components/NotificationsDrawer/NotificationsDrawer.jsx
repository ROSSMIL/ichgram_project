import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import styles from "./NotificationsDrawer.module.css";
import Avatar from "../Avatar/Avatar";
import API from "../../api/axios";
import { useSocket } from "../../context/useSocket";

const NotificationsDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isClosing, setIsClosing] = useState(false);

  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const navigate = useNavigate();

  const tabsContainerRef = useRef(null);
  const tabsRef = useRef({});
  const [gliderStyle, setGliderStyle] = useState({
    transform: "translateX(0px)",
    width: "0px",
    opacity: 0,
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/notifications");
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async () => {
    try {
      await API.patch("/api/notifications/read");
    } catch (err) {
      console.error("Error marking notifications read:", err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchNotifications();
      markAsRead();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, fetchNotifications, markAsRead]);

  const updateGlider = useCallback(() => {
    const activeTabEl = tabsRef.current[activeTab];
    const container = tabsContainerRef.current;
    if (activeTabEl && container) {
      const activeRect = activeTabEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const leftOffset = activeRect.left - containerRect.left - 3;
      setGliderStyle({
        transform: `translateX(${leftOffset}px)`,
        width: `${activeRect.width}px`,
        opacity: 1,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const anim = requestAnimationFrame(updateGlider);
    return () => cancelAnimationFrame(anim);
  }, [isOpen, updateGlider]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (newNotif) => {
      if (newNotif.type === "message") return;
      setNotifications((prev) => [newNotif, ...prev]);
    };

    socket.on("new notification", handleNewNotif);
    return () => {
      socket.off("new notification", handleNewNotif);
    };
  }, [socket]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  const handleFollowToggle = async (e, userId) => {
    e.stopPropagation();
    try {
      await API.post(`/api/users/follow/${userId}`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.sender?._id === userId
            ? { ...item, isFollowing: !item.isFollowing }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleItemClick = (notif) => {
    handleClose();
    if (notif.type === "like" || notif.type === "comment") {
      if (notif.post?._id || notif.post) {
        navigate(`/post/${notif.post._id || notif.post}`);
      }
    } else if (notif.type === "follow") {
      if (notif.sender?.username) {
        navigate(`/user/${notif.sender.username}`);
      }
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (item.type === "message") return false;
    if (activeTab === "follows") return item.type === "follow";
    if (activeTab === "interactions")
      return item.type === "like" || item.type === "comment";
    return true;
  });

  const renderBadgeIcon = (type) => {
    switch (type) {
      case "like":
        return (
          <span className={`${styles.typeBadge} ${styles.badgeLike}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
          </span>
        );
      case "comment":
        return (
          <span className={`${styles.typeBadge} ${styles.badgeComment}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      case "follow":
        return (
          <span className={`${styles.typeBadge} ${styles.badgeFollow}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayLeaving : ""}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.drawerBox} ${
          isClosing ? styles.drawerLeaving : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerIndicator} onClick={handleClose} />

        <div className={styles.headerTop}>
          <h2 className={styles.title}>Notifications</h2>

          <div ref={tabsContainerRef} className={styles.modeTabs}>
            <div className={styles.glider} style={gliderStyle} />
            {["all", "follows", "interactions"].map((tab) => (
              <button
                key={tab}
                ref={(el) => (tabsRef.current[tab] = el)}
                type="button"
                className={`${styles.tabBtn} ${
                  activeTab === tab ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "interactions"
                  ? "Activity"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.resultsContainer}>
          {loading ? (
            <div className={styles.loader}>Loading updates...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className={styles.emptyIconSvg}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className={styles.notificationsList}>
              {filteredNotifications.map((notif, idx) => (
                <div
                  key={notif._id || idx}
                  className={`${styles.notifItem} ${
                    !notif.isRead ? styles.unread : ""
                  }`}
                  style={{ "--stagger-index": idx }}
                  onClick={() => handleItemClick(notif)}
                >
                  <Link
                    to={`/user/${notif.sender?.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className={styles.avatarLink}
                  >
                    <Avatar user={notif.sender} size={42} />
                    {renderBadgeIcon(notif.type)}
                  </Link>

                  <div className={styles.notifContent}>
                    <p className={styles.notifText}>
                      <strong>{notif.sender?.username}</strong>{" "}
                      {notif.type === "like" && "liked your post."}
                      {notif.type === "comment" &&
                        `commented: "${notif.commentText || "..."}"`}
                      {notif.type === "follow" && "started following you."}
                    </p>
                  </div>

                  {notif.post?.url && (
                    <img
                      src={notif.post.url}
                      alt="Post preview"
                      className={styles.postPreview}
                    />
                  )}

                  {notif.type === "follow" && (
                    <button
                      type="button"
                      className={styles.followActionBtn}
                      onClick={(e) => handleFollowToggle(e, notif.sender?._id)}
                    >
                      {notif.isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

NotificationsDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default NotificationsDrawer;
