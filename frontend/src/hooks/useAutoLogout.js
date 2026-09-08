import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const IDLE_TIMEOUT = 60 * 60 * 1000;

const useAutoLogout = () => {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    const token = localStorage.getItem("token");
    const isGuest = localStorage.getItem("isGuest");

    if (token || isGuest) {
      console.log("🔒 Inactivity timeout reached. Logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      localStorage.removeItem("lastActivity");

      window.dispatchEvent(new Event("profileUpdated"));
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isGuest = localStorage.getItem("isGuest");

    if (!token && !isGuest) return;

    const lastActivity = localStorage.getItem("lastActivity");
    const now = Date.now();

    if (lastActivity && now - parseInt(lastActivity, 10) > IDLE_TIMEOUT) {
      handleLogout();
      return;
    }

    localStorage.setItem("lastActivity", now.toString());

    let idleTimer = setTimeout(handleLogout, IDLE_TIMEOUT);

    let lastSave = Date.now();
    const handleUserActivity = () => {
      const currentTime = Date.now();

      if (currentTime - lastSave > 5000) {
        localStorage.setItem("lastActivity", currentTime.toString());
        lastSave = currentTime;
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleLogout, IDLE_TIMEOUT);
    };

    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [handleLogout]);
};

export default useAutoLogout;
