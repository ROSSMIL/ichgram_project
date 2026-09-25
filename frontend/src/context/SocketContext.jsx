import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios.js";
import { SocketContext } from "./SocketContextInstance.js";

const ENDPOINT = import.meta.env.VITE_SOCKET_URL || "http://localhost:3333";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

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
    if (!token) return;
    try {
      const { data } = await API.get("/api/users/profile");
      setCurrentUser(data);
    } catch (err) {
      console.error("Error fetching user profile for socket:", err);
      if (err.response?.status === 401) {
        setCurrentUser(null);
      }
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    if (token) {

      Promise.resolve().then(() => {
        if (isMounted) {
          fetchProfile();
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [token, fetchProfile]);

  useEffect(() => {
    if (!token || !currentUser) return;

    const s = io(ENDPOINT, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
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
          setTimeout(() => setShowRestored(false), 3000);
        }
        return false;
      });
    });

    s.on("disconnect", (reason) => {
      if (reason !== "io client disconnect") {
        setIsDisconnected(true);
        setShowRestored(false);
      }
    });

    s.on("connect_error", () => {
      setIsDisconnected(true);
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

  return (
    <SocketContext.Provider
      value={{
        socket,
        currentUser: effectiveUser,
        onlineUsers,
        isDisconnected,
      }}
    >
      {children}

      {isDisconnected && (
        <div style={floatingBannerStyle}>
          <div style={spinnerStyle} />
          <span>Connecting to server...</span>
        </div>
      )}

      {showRestored && (
        <div style={restoredBannerStyle}>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Connection restored!</span>
        </div>
      )}
    </SocketContext.Provider>
  );
};

const floatingBannerStyle = {
  position: "fixed",
  top: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 999999,
  backgroundColor: "rgba(22, 22, 26, 0.88)",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  padding: "8px 18px",
  borderRadius: "30px",
  fontSize: "13px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
  animation: "fadeInBanner 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
  pointerEvents: "none",
};

const restoredBannerStyle = {
  ...floatingBannerStyle,
  backgroundColor: "rgba(16, 185, 129, 0.9)",
  color: "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.2)",
};

const spinnerStyle = {
  width: "12px",
  height: "12px",
  border: "2px solid rgba(255, 255, 255, 0.2)",
  borderTopColor: "#ff9500",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

if (
  typeof document !== "undefined" &&
  !document.getElementById("reconnect-banner-styles")
) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "reconnect-banner-styles";
  styleSheet.innerText = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeInBanner {
      from { opacity: 0; transform: translate(-50%, -10px) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
}
