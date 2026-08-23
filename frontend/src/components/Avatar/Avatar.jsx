import { useState } from "react";
import styles from "./Avatar.module.css";

const Avatar = ({ user, size = 44 }) => {
  if (!user) return null;
  const avatarKey = `${user._id}_${user.avatar}`;

  return <AvatarImage key={avatarKey} user={user} size={size} />;
};
const AvatarImage = ({ user, size }) => {
  const [hasError, setHasError] = useState(false);

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
    >
      <img
        src={avatarUrl}
        alt={`${user.username}'s avatar`}
        className={styles.avatar}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

export default Avatar;
