import { useState } from "react";
import { useSocket } from "../../context/useSocket.js";
import styles from "./Avatar.module.css";

const Avatar = ({ user, size = 44, showStatus = true }) => {
  if (!user) return null;
  const avatarKey = `${user._id}_${user.avatar}`;

  return (
    <AvatarImage
      key={avatarKey}
      user={user}
      size={size}
      showStatus={showStatus}
    />
  );
};

const AvatarImage = ({ user, size, showStatus }) => {
  const [hasError, setHasError] = useState(false);
  const { onlineUsers } = useSocket() || {};

  const userId = (
    typeof user === "object" ? user._id || user.id : user
  )?.toString();
  const userPresence = onlineUsers?.[userId];
  const isOnline = Boolean(userPresence);

  const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
  const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    user.username || "User",
  )}`;

  let avatarUrl;

  if (hasError || !user.avatar) {
    avatarUrl = fallbackUrl;
  } else if (user.avatar.startsWith("http") || user.avatar.startsWith("blob")) {
    avatarUrl = user.avatar;
  } else {
    avatarUrl = `${BACKEND_URL}/${user.avatar}`;
  }

  return (
    <div
      className={styles.avatarWrapper}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      title={
        isOnline
          ? `${user.username}: ${userPresence.status}`
          : `${user.username} is offline`
      }
    >
      <img
        src={avatarUrl}
        alt={`${user.username}'s avatar`}
        className={styles.avatar}
        onError={() => setHasError(true)}
      />
      {showStatus && (
        <span
          className={`${styles.statusDot} ${
            isOnline ? styles.online : styles.offline
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
