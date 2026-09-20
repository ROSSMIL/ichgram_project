import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios.js";
import { SocketContext } from "./SocketContextInstance.js";

const ENDPOINT = import.meta.env.VITE_SOCKET_URL || "http://localhost:3333";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const location = useLocation();

  const token = localStorage.getItem("token");

  // 1. Створення та керування Socket підключенням
  useEffect(() => {
    if (!token) return;

    // Створюємо сокет чисто через websocket для Render
    const s = io(ENDPOINT, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    const initUser = async () => {
      try {
        const { data } = await API.get("/api/users/profile");
        setCurrentUser(data);
        s.emit("setup", data);
      } catch (err) {
        console.error("Error setting up global socket user:", err);
      }
    };

    s.on("connect", initUser);
    s.on("presence update", (usersMap) => {
      setOnlineUsers(usersMap);
    });

    // Оновлення стану сокета всередині асинхронного таймера прибирає варнінг "setState during render/effect"
    const timer = setTimeout(() => {
      setSocket(s);
    }, 0);

    return () => {
      clearTimeout(timer);
      s.off("connect", initUser);
      s.off("presence update");
      s.disconnect();

      // Асинхронне очищення станів при unmount або виході
      setTimeout(() => {
        setSocket(null);
        setCurrentUser(null);
        setOnlineUsers({});
      }, 0);
    };
  }, [token]);

  // 2. Відслідковування активності по сторінках
  useEffect(() => {
    if (!socket || !currentUser) return;

    const getActivityTypeByPath = (path) => {
      if (path === "/dashboard") return "dashboard";
      if (path === "/explore") return "explore";
      if (path === "/messages") return "messages";
      if (path === "/notifications") return "notifications";
      if (path === "/edit-profile") return "edit_profile";
      if (path.startsWith("/profile")) return "profile";
      if (path.startsWith("/user/")) return "user_profile";
      if (path.startsWith("/post/")) return "post";
      return "online";
    };

    const emitActivity = () => {
      socket.emit("change activity", {
        userId: currentUser._id || currentUser.id,
        activity: getActivityTypeByPath(location.pathname),
      });
    };

    if (socket.connected) {
      emitActivity();
    } else {
      socket.once("connect", emitActivity);
    }
  }, [location.pathname, currentUser, socket]);

  return (
    <SocketContext.Provider value={{ socket, currentUser, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
