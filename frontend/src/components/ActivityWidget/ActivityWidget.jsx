import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ActivityWidget.module.css";
import Avatar from "../Avatar/Avatar";
import API from "../../api/axios";
import { useSocket } from "../../context/useSocket";

const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const ActivityWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [borderParticles, setBorderParticles] = useState([]);
  const [isClearing, setIsClearing] = useState(false);

  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const navigate = useNavigate();
  const location = useLocation();

  const isMessagesPage = location.pathname.startsWith("/messages");

  const activeChatIdRef = useRef(null);
  const ringTimerRef = useRef(null);

  useEffect(() => {
    const handleActiveChatChange = async (e) => {
      const chatId = e.detail?.chatId || null;
      activeChatIdRef.current = chatId;

      if (chatId) {
        setActivities((prev) =>
          prev.filter((item) => {
            const itemChatId = (item.chat?._id || item.chat)?.toString();
            return itemChatId !== chatId.toString();
          }),
        );

        try {
          await API.delete(`/api/notifications/chat/${chatId}`);
          window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
        } catch (err) {
          console.error("Error clearing notifications for opened chat:", err);
        }
      }
    };

    window.addEventListener("activeChatChanged", handleActiveChatChange);
    return () => {
      window.removeEventListener("activeChatChanged", handleActiveChatChange);
    };
  }, []);

  useEffect(() => {
    const handleClearAllMessages = async () => {
      const messageNotifIds = activities
        .filter((item) => item.type === "message")
        .map((item) => item._id)
        .filter(Boolean);

      setActivities((prev) => prev.filter((item) => item.type !== "message"));

      if (messageNotifIds.length > 0) {
        try {
          await Promise.all(
            messageNotifIds.map((id) => API.delete(`/api/notifications/${id}`)),
          );
          window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
        } catch (err) {
          console.error("Error clearing all message notifications:", err);
        }
      }
    };

    window.addEventListener(
      "clearAllMessageNotifications",
      handleClearAllMessages,
    );
    return () => {
      window.removeEventListener(
        "clearAllMessageNotifications",
        handleClearAllMessages,
      );
    };
  }, [activities]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data } = await API.get("/api/notifications");
      setActivities(data);
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
    const particleCount = 18;
    const sides = ["top", "right", "bottom", "left"];

    const newParticles = Array.from({ length: particleCount }).map((_, i) => {
      const side = sides[i % 4];
      const posPercent = Math.floor(Math.random() * 90 + 5);
      const flyDistance = Math.floor(Math.random() * 20 + 15);
      const size = Math.random() * 2 + 2;

      let topVal = "0%",
        leftVal = "0%",
        tx = "0px",
        ty = "0px";

      const spread = (Math.random() - 0.5) * 30;

      if (side === "top") {
        topVal = "-1px";
        leftVal = `${posPercent}%`;
        ty = `-${flyDistance}px`;
        tx = `${spread}px`;
      } else if (side === "bottom") {
        topVal = "100%";
        leftVal = `${posPercent}%`;
        ty = `${flyDistance}px`;
        tx = `${spread}px`;
      } else if (side === "left") {
        topVal = `${posPercent}%`;
        leftVal = "-1px";
        tx = `-${flyDistance}px`;
        ty = `${spread}px`;
      } else if (side === "right") {
        topVal = `${posPercent}%`;
        leftVal = "100%";
        tx = `${flyDistance}px`;
        ty = `${spread}px`;
      }

      return {
        id: Date.now() + Math.random() + i,
        top: topVal,
        left: leftVal,
        tx,
        ty,
        size: `${size}px`,
        opacity: (Math.random() * 0.4 + 0.6).toFixed(2),
        hue: Math.floor(Math.random() * 20 + 195),
      };
    });

    setBorderParticles(newParticles);

    setTimeout(() => {
      setBorderParticles([]);
    }, 650);
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

      setActivities((prev) => [itemWithId, ...prev]);
      setIsRinging(true);
      triggerBorderBurst();

      window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));

      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);

      ringTimerRef.current = setTimeout(() => {
        setIsRinging(false);
      }, 650);
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
            } else if (data.chatId) {
              const itemChatId = (item.chat?._id || item.chat)?.toString();
              if (itemChatId === data.chatId.toString()) return false;
            } else if (data.type === "follow") {
              return false;
            }
          }

          return true;
        }),
      );
      window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
    };

    socket.on("new notification", handleNewNotif);
    socket.on("notification deleted", handleNotificationDeleted);

    return () => {
      socket.off("new notification", handleNewNotif);
      socket.off("notification deleted", handleNotificationDeleted);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, [socket, isMessagesPage, triggerBorderBurst]);

  const groupedActivities = useMemo(() => {
    if (!activities.length) return [];

    const groupedMap = activities.reduce((map, item) => {
      const type = item.type;
      const senderId = (item.sender?._id || item.sender)?.toString();
      const postId = (item.post?._id || item.post)?.toString();
      const chatId = (item.chat?._id || item.chat)?.toString();

      const groupKey =
        type === "like" && postId
          ? `like_${postId}`
          : type === "message" && (chatId || senderId)
            ? `msg_${chatId || senderId}`
            : `${type}_${senderId}_${item._id}`;

      if (map.has(groupKey)) {
        const existingGroup = map.get(groupKey);
        existingGroup.count += 1;
        existingGroup.items.push(item);

        if (new Date(item.createdAt) > new Date(existingGroup.createdAt)) {
          existingGroup.createdAt = item.createdAt;
          existingGroup.latestItem = item;
        }

        const alreadyHasSender = existingGroup.senders.some(
          (s) => (s._id || s)?.toString() === senderId,
        );
        if (!alreadyHasSender && item.sender) {
          existingGroup.senders.push(item.sender);
        }
      } else {
        map.set(groupKey, {
          _id: groupKey,
          type: item.type,
          post: item.post,
          chat: item.chat,
          createdAt: item.createdAt,
          items: [item],
          senders: item.sender ? [item.sender] : [],
          count: 1,
          latestItem: item,
        });
      }
      return map;
    }, new Map());

    return Array.from(groupedMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);
  }, [activities]);

  const handleClearAll = async () => {
    if (isClearing) return;
    setIsClearing(true);

    try {
      await API.delete("/api/notifications");
      setActivities([]);
      window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleItemClick = (group) => {
    const item = group.latestItem;
    const notificationIdsToDelete = group.items
      .map((i) => i._id)
      .filter(Boolean);

    setActivities((prev) =>
      prev.filter((act) => !notificationIdsToDelete.includes(act._id)),
    );

    window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));

    Promise.all(
      notificationIdsToDelete.map((id) =>
        API.delete(`/api/notifications/${id}`),
      ),
    )
      .then(() => {
        window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
      })
      .catch((err) =>
        console.error("Error auto-deleting notifications on click:", err),
      );

    if (group.type === "message") {
      const chatId = group.chat?._id || group.chat;
      const senderId = item.sender?._id || item.sender;

      navigate("/messages", {
        state: {
          openChatId: chatId ? chatId.toString() : null,
          partnerId: senderId ? senderId.toString() : null,
        },
        replace: true,
      });
    } else if (group.type === "like" || group.type === "comment") {
      if (group.post?._id || group.post) {
        navigate(`/post/${group.post._id || group.post}`);
      }
    } else if (group.type === "follow") {
      if (item.sender?.username) {
        navigate(`/user/${item.sender.username}`);
      }
    }
  };

  const renderBadgeIcon = (type) => {
    switch (type) {
      case "like":
        return (
          <span className={`${styles.badge} ${styles.badgeLike}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
          </span>
        );
      case "comment":
        return (
          <span className={`${styles.badge} ${styles.badgeComment}`}>
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
          <span className={`${styles.badge} ${styles.badgeFollow}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      case "message":
        return (
          <span className={`${styles.badge} ${styles.badgeMessage}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
              <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  const renderGroupText = (group) => {
    const { type, senders, count, latestItem } = group;
    const primaryUsername = senders[0]?.username || "Someone";

    if (type === "like") {
      if (senders.length > 1) {
        const othersCount = senders.length - 1;
        return (
          <>
            <strong>{primaryUsername}</strong> and{" "}
            <strong>
              {othersCount} other{othersCount > 1 ? "s" : ""}
            </strong>{" "}
            liked your post
          </>
        );
      }
      return (
        <>
          <strong>{primaryUsername}</strong> liked your post
        </>
      );
    }

    if (type === "message") {
      if (count > 1) {
        return (
          <>
            <strong>{primaryUsername}</strong> sent you{" "}
            <strong>{count} messages</strong>
          </>
        );
      }
      return (
        <>
          <strong>{primaryUsername}</strong>: &quot;
          {latestItem.messageText || "..."}&quot;
        </>
      );
    }

    if (type === "comment") {
      return (
        <>
          <strong>{primaryUsername}</strong> commented: &quot;
          {latestItem.commentText || "..."}&quot;
        </>
      );
    }

    if (type === "follow") {
      return (
        <>
          <strong>{primaryUsername}</strong> followed you
        </>
      );
    }

    return null;
  };

  const hasActivities = groupedActivities.length > 0;

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
            "--part-opacity": p.opacity,
            "--part-hue": `${p.hue}deg`,
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
          <div className={styles.activityList}>
            <AnimatePresence initial={false}>
              {groupedActivities.map((group) => {
                const hasMultipleSenders = group.senders.length > 1;

                return (
                  <motion.div
                    key={group._id}
                    layout
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      scale: 0.85,
                      x: -15,
                      transition: {
                        duration: 0.22,
                        ease: [0.4, 0, 0.2, 1],
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 32,
                      mass: 0.8,
                    }}
                  >
                    <div
                      className={styles.activityCard}
                      onClick={() => handleItemClick(group)}
                    >
                      <div className={styles.avatarWrapper}>
                        {hasMultipleSenders ? (
                          <div className={styles.avatarStack}>
                            <div className={styles.avatarPrimary}>
                              <Avatar user={group.senders[0]} size={28} />
                            </div>
                            <div className={styles.avatarSecondary}>
                              <Avatar user={group.senders[1]} size={24} />
                            </div>
                          </div>
                        ) : (
                          <Link
                            to={`/user/${group.senders[0]?.username}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Avatar user={group.senders[0]} size={34} />
                          </Link>
                        )}
                        {renderBadgeIcon(group.type)}
                      </div>

                      <div className={styles.textContent}>
                        <p className={styles.messageText}>
                          {renderGroupText(group)}
                        </p>
                        <span className={styles.timeAgo}>
                          {formatTimeAgo(group.createdAt)}
                        </span>
                      </div>

                      {group.count > 1 && group.type === "message" && (
                        <div className={styles.countPill}>{group.count}</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityWidget;
