import styles from "./Avatar.module.css";

const Avatar = ({ user, size = 44 }) => {
  if (!user) return null;

  const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
  let avatarUrl;

  if (user.avatar) {
    if (user.avatar.startsWith("http") || user.avatar.startsWith("blob")) {
      avatarUrl = user.avatar;
    } else {
      avatarUrl = `${BACKEND_URL}/${user.avatar}`;
    }
  } else {
    avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      user.username || "User",
    )}`;
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
      />
    </div>
  );
};

export default Avatar;
