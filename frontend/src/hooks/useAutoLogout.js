import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const IDLE_TIMEOUT = 60 * 60 * 1000;

const useAutoLogout = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const logout = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token) {
      console.log("🔒 Inactivity timeout reached. Logging out...");
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(logout, IDLE_TIMEOUT);
  }, [logout]);

  useEffect(() => {
    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    const handleUserActivity = () => {
      resetTimer();
    };

    resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetTimer]);
};

export default useAutoLogout;
