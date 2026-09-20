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
    if (notif.type === "message") {
      navigate("/messages");
    } else if (notif.type === "like" || notif.type === "comment") {
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
    if (activeTab === "follows") return item.type === "follow";
    if (activeTab === "interactions")
      return item.type === "like" || item.type === "comment";
    if (activeTab === "messages") return item.type === "message";
    return true;
  });

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
            {["all", "follows", "interactions", "messages"].map((tab) => (
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
              <span className={styles.emptyIcon}>🔔</span>
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
                    <span className={styles.typeBadge}>
                      {notif.type === "like" && "❤️"}
                      {notif.type === "comment" && "💬"}
                      {notif.type === "follow" && "👤"}
                      {notif.type === "message" && "✉️"}
                    </span>
                  </Link>

                  <div className={styles.notifContent}>
                    <p className={styles.notifText}>
                      <strong>{notif.sender?.username}</strong>{" "}
                      {notif.type === "like" && "liked your post."}
                      {notif.type === "comment" &&
                        `commented: "${notif.commentText || "..."}"`}
                      {notif.type === "follow" && "started following you."}
                      {notif.type === "message" &&
                        `sent a message: "${notif.messageText || "..."}"`}
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
