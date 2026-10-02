import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import API from "../api/axios.js";
import { SocketContext } from "./SocketContextInstance.js";
import styles from "./SocketBanner.module.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const ENDPOINT =
  import.meta.env.VITE_SOCKET_URL || RAW_API_URL.replace(/\/api\/?$/, "");

const ConnectingBanner = ({ active }) => {
  const [shouldRender, setShouldRender] = useState(active);
  const [isExiting, setIsExiting] = useState(false);

  if (active && !shouldRender) {
    setShouldRender(true);
    setIsExiting(false);
  } else if (!active && shouldRender && !isExiting) {
    setIsExiting(true);
  }

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.floatingBanner} ${
        isExiting ? styles.bannerExit : styles.bannerEnter
      }`}
      onAnimationEnd={() => {
        if (isExiting) {
          setShouldRender(false);
          setIsExiting(false);
        }
      }}
    >
      <div className={styles.spinner} />
      <span>Connecting to server...</span>
    </div>
  );
};

ConnectingBanner.propTypes = {
  active: PropTypes.bool.isRequired,
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isDisconnected, setIsDisconnected] = useState(false);

  const [showRestored, setShowRestored] = useState(false);
  const [isRestoredExiting, setIsRestoredExiting] = useState(false);

  const location = useLocation();
  const activeChatIdRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const handleActiveChatChanged = (e) => {
      activeChatIdRef.current = e.detail?.chatId || null;
    };

    window.addEventListener("activeChatChanged", handleActiveChatChanged);
    return () => {
      window.removeEventListener("activeChatChanged", handleActiveChatChanged);
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setCurrentUser((prev) => (prev ? null : prev));
      return;
    }

    try {
      const { data } = await API.get("/api/users/profile");
      setCurrentUser(data);
    } catch (err) {
      console.error("Error fetching user profile for socket:", err);
      if (err.response?.status === 401 || err.response?.status === 404) {
        localStorage.removeItem("token");
        localStorage.removeItem("guest_device_id");
        setCurrentUser(null);

        setIsDisconnected(false);
        setShowRestored(false);
      }
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    if (token) {
      queueMicrotask(async () => {
        if (isSubscribed) {
          await fetchProfile();
        }
      });
    } else {
      queueMicrotask(() => {
        if (isSubscribed) {
          setCurrentUser((prev) => (prev === null ? prev : null));

          setIsDisconnected(false);
          setShowRestored(false);
        }
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [token, fetchProfile]);

  useEffect(() => {
    if (!token || !currentUser) {
      return;
    }

    const s = io(ENDPOINT, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
    });

    s.on("connect", () => {
      setSocket(s);
      s.emit("setup", currentUser);

      if (activeChatIdRef.current) {
        s.emit("join chat", activeChatIdRef.current);
      }

      setIsDisconnected((prev) => {
        if (prev) {
          setShowRestored(true);
          setIsRestoredExiting(false);

          setTimeout(() => {
            setIsRestoredExiting(true);
          }, 2500);
        }
        return false;
      });
    });

    s.on("disconnect", (reason) => {
      if (reason !== "io client disconnect" && localStorage.getItem("token")) {
        setIsDisconnected(true);
        setShowRestored(false);
      }
    });

    s.on("connect_error", () => {
      if (localStorage.getItem("token")) {
        setIsDisconnected(true);
      }
    });

    s.on("presence update", (usersMap) => {
      setOnlineUsers(usersMap);
    });

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("connect_error");
      s.off("presence update");
      s.disconnect();
      setSocket(null);
      setIsDisconnected(false);
      setShowRestored(false);
    };
  }, [token, currentUser]);

  useEffect(() => {
    const handleForceReconnect = async () => {
      await fetchProfile();
      if (socket) {
        if (!socket.connected) {
          socket.connect();
        } else if (currentUser) {
          socket.emit("setup", currentUser);
          if (activeChatIdRef.current) {
            socket.emit("join chat", activeChatIdRef.current);
          }
        }
      }
    };

    window.addEventListener("forceSocketReconnect", handleForceReconnect);
    return () => {
      window.removeEventListener("forceSocketReconnect", handleForceReconnect);
    };
  }, [socket, currentUser, fetchProfile]);

  useEffect(() => {
    const handleFocus = () => {
      if (socket && localStorage.getItem("token")) {
        if (!socket.connected) {
          socket.connect();
        } else if (currentUser) {
          socket.emit("setup", currentUser);
          if (activeChatIdRef.current) {
            socket.emit("join chat", activeChatIdRef.current);
          }
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [socket, currentUser]);

  const getActivityTypeByPath = useCallback((path) => {
    if (path === "/dashboard") return "dashboard";
    if (path === "/explore") return "explore";
    if (path === "/messages") return "messages";
    if (path === "/notifications") return "notifications";
    if (path === "/edit-profile") return "edit_profile";
    if (path.startsWith("/profile")) return "profile";
    if (path.startsWith("/user/")) return "user_profile";
    if (path.startsWith("/post/")) return "post";
    return "online";
  }, []);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const myId = currentUser._id || currentUser.id;

    const emitActivity = () => {
      socket.emit("change activity", {
        userId: myId,
        activity: getActivityTypeByPath(location.pathname),
      });
    };

    if (socket.connected) {
      emitActivity();
    }

    socket.on("connect", emitActivity);

    return () => {
      socket.off("connect", emitActivity);
    };
  }, [location.pathname, currentUser, socket, getActivityTypeByPath]);

  const effectiveUser = token ? currentUser : null;
  const shouldShowDisconnected = isDisconnected && !!token && !!currentUser;

  return (
    <SocketContext.Provider
      value={{
        socket,
        currentUser: effectiveUser,
        onlineUsers,
        isDisconnected: shouldShowDisconnected,
      }}
    >
      {children}

      <ConnectingBanner active={shouldShowDisconnected} />

      {showRestored && (
        <div
          className={`${styles.floatingBanner} ${styles.restoredBanner} ${
            isRestoredExiting ? styles.bannerExit : styles.bannerEnter
          }`}
          onAnimationEnd={() => {
            if (isRestoredExiting) {
              setShowRestored(false);
              setIsRestoredExiting(false);
            }
          }}
        >
          <div className={styles.restoredIcon}>
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span>Connection restored!</span>
        </div>
      )}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
