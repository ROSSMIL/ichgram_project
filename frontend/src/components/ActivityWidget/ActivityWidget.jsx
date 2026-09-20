import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styles from "./ActivityWidget.module.css";
import Avatar from "../Avatar/Avatar";
import API from "../../api/axios";
import { useSocket } from "../../context/useSocket";

const ActivityWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [borderParticles, setBorderParticles] = useState([]);
  const [isClearing, setIsClearing] = useState(false);
  const [newestId, setNewestId] = useState(null);

  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const navigate = useNavigate();
  const location = useLocation();

  const isMessagesPage = location.pathname.startsWith("/messages");

  const activeChatIdRef = useRef(null);
  const ringTimerRef = useRef(null);
  const newestTimerRef = useRef(null);

  useEffect(() => {
    const handleActiveChatChange = (e) => {
      activeChatIdRef.current = e.detail?.chatId || null;
    };

    window.addEventListener("activeChatChanged", handleActiveChatChange);
    return () => {
      window.removeEventListener("activeChatChanged", handleActiveChatChange);
    };
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const { data } = await API.get("/api/notifications");
      setActivities(data.slice(0, 10));
    } catch (err) {
      console.error("Error fetching widget activities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchActivities();
    });
  }, [fetchActivities]);

  const triggerBorderBurst = useCallback(() => {
    const particleCount = 16;
    const sides = ["top", "right", "bottom", "left"];

    const newParticles = Array.from({ length: particleCount }).map((_, i) => {
      const side = sides[i % 4];
      const posPercent = Math.floor(Math.random() * 90 + 5);
      const flyDistance = Math.floor(Math.random() * 25 + 20);
      const size = Math.random() * 2.5 + 2.5;

      let topVal = "0%",
        leftVal = "0%",
        tx = "0px",
        ty = "0px";

      if (side === "top") {
        topVal = "0%";
        leftVal = `${posPercent}%`;
        ty = `-${flyDistance}px`;
        tx = `${(Math.random() - 0.5) * 20}px`;
      } else if (side === "bottom") {
        topVal = "100%";
        leftVal = `${posPercent}%`;
        ty = `${flyDistance}px`;
        tx = `${(Math.random() - 0.5) * 20}px`;
      } else if (side === "left") {
        topVal = `${posPercent}%`;
        leftVal = "0%";
        tx = `-${flyDistance}px`;
        ty = `${(Math.random() - 0.5) * 20}px`;
      } else if (side === "right") {
        topVal = `${posPercent}%`;
        leftVal = "100%";
        tx = `${flyDistance}px`;
        ty = `${(Math.random() - 0.5) * 20}px`;
      }

      return {
        id: Date.now() + i,
        top: topVal,
        left: leftVal,
        tx,
        ty,
        size: `${size}px`,
      };
    });

    setBorderParticles(newParticles);

    setTimeout(() => {
      setBorderParticles([]);
    }, 700);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (newNotif) => {
      const currentOpenChatId = activeChatIdRef.current;
      const incomingChatId = (newNotif.chat?._id || newNotif.chat)?.toString();

      if (
        isMessagesPage &&
        newNotif.type === "message" &&
        currentOpenChatId &&
        currentOpenChatId.toString() === incomingChatId
      ) {
        return;
      }

      const itemWithId = newNotif._id
        ? newNotif
        : { ...newNotif, _id: Date.now() };

      setNewestId(itemWithId._id);
      setActivities((prev) => [itemWithId, ...prev.slice(0, 9)]);
      setIsRinging(true);
      triggerBorderBurst();

      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      if (newestTimerRef.current) clearTimeout(newestTimerRef.current);

      ringTimerRef.current = setTimeout(() => {
        setIsRinging(false);
      }, 600);

      newestTimerRef.current = setTimeout(() => {
        setNewestId(null);
      }, 600);
    };

    const handleNotificationDeleted = (data) => {
      setActivities((prev) =>
        prev.filter((item) => {
          if (data.notificationId && item._id === data.notificationId) {
            return false;
          }

          if (
            data.type &&
            item.type === data.type &&
            data.senderId &&
            (item.sender?._id || item.sender)?.toString() ===
              data.senderId.toString()
          ) {
            if (data.postId) {
              const itemPostId = (item.post?._id || item.post)?.toString();
              if (itemPostId === data.postId.toString()) return false;
            }
            if (data.chatId) {
              const itemChatId = (item.chat?._id || item.chat)?.toString();
              if (itemChatId === data.chatId.toString()) return false;
            }
          }

          return true;
        }),
      );
    };

    socket.on("new notification", handleNewNotif);
    socket.on("notification deleted", handleNotificationDeleted);

    return () => {
      socket.off("new notification", handleNewNotif);
      socket.off("notification deleted", handleNotificationDeleted);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      if (newestTimerRef.current) clearTimeout(newestTimerRef.current);
    };
  }, [socket, isMessagesPage, triggerBorderBurst]);

  const handleClearAll = async () => {
    if (isClearing) return;
    setIsClearing(true);

    setTimeout(async () => {
      try {
        await API.delete("/api/notifications");
        setActivities([]);
      } catch (err) {
        console.error("Failed to clear notifications:", err);
      } finally {
        setIsClearing(false);
      }
    }, 220);
  };

  const handleItemClick = (item) => {
    if (item.type === "message") {
      const chatId = item.chat?._id || item.chat;
      const partnerId = item.sender?._id || item.sender;

      navigate("/messages", {
        state: {
          openChatId: chatId,
          partnerId: partnerId,
        },
      });
    } else if (item.type === "like" || item.type === "comment") {
      if (item.post?._id || item.post) {
        navigate(`/post/${item.post._id || item.post}`);
      }
    } else if (item.type === "follow") {
      if (item.sender?.username) {
        navigate(`/user/${item.sender.username}`);
      }
    }
  };

  const hasActivities = activities.length > 0;

  return (
    <div
      className={`${styles.widgetBox} ${isRinging ? styles.notifyGlow : ""}`}
    >
      {borderParticles.map((p) => (
        <span
          key={p.id}
          className={styles.outerParticle}
          style={{
            top: p.top,
            left: p.left,
            "--tx": p.tx,
            "--ty": p.ty,
            width: p.size,
            height: p.size,
          }}
        />
      ))}

      <div className={styles.widgetHeader}>
        <div className={styles.headerTitleGroup}>
          <div
            className={`${styles.bellWrapper} ${
              hasActivities ? styles.activeBell : ""
            } ${isRinging ? styles.ringing : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
              className={styles.bellIcon}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
          </div>
          <span className={styles.title}>Recent Activity</span>
        </div>

        {hasActivities && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClearAll}
            disabled={isClearing}
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.activityListContainer}>
        {loading ? (
          <div className={styles.skeletonList}>
            <div className={styles.skeletonItem} />
            <div className={styles.skeletonItem} />
            <div className={styles.skeletonItem} />
          </div>
        ) : !hasActivities ? (
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
            <p className={styles.emptyText}>No recent activity</p>
          </div>
        ) : (
          <div
            className={`${styles.activityList} ${
              isClearing ? styles.clearingList : ""
            }`}
          >
            {activities.map((item, idx) => {
              const isNew = item._id === newestId;
              return (
                <div
                  key={item._id || idx}
                  className={`${styles.cardWrapper} ${
                    isNew ? styles.animateExpansion : ""
                  }`}
                >
                  <div
                    className={styles.activityCard}
                    style={{ "--stagger-index": idx }}
                    onClick={() => handleItemClick(item)}
                  >
                    <Link
                      to={`/user/${item.sender?.username}`}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.avatarWrapper}
                    >
                      <Avatar user={item.sender} size={34} />
                      <span className={styles.badge}>
                        {item.type === "like" && "❤️"}
                        {item.type === "comment" && "💬"}
                        {item.type === "follow" && "👤"}
                        {item.type === "message" && "✉️"}
                      </span>
                    </Link>

                    <div className={styles.textContent}>
                      <p className={styles.messageText}>
                        <strong>{item.sender?.username}</strong>{" "}
                        {item.type === "like" && "liked your post"}
                        {item.type === "comment" &&
                          `commented: "${item.commentText || "..."}"`}
                        {item.type === "follow" && "followed you"}
                        {item.type === "message" &&
                          `sent: "${item.messageText || "..."}"`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityWidget;
