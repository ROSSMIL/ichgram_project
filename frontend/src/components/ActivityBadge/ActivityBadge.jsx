import styles from "./ActivityBadge.module.css";

const ACTIVITIES = {
  dashboard: {
    label: "Viewing Feed",
    icon: (
      <svg
        aria-label="Home"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="currentColor"
      >
        <path
          d="M9 16.5 A3 3 0 0 1 15 16.5 V22 H22 V11.5 L12 2 L2 11.5 V22 H9 Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  explore: {
    label: "Exploring Trends",
    icon: (
      <svg
        aria-label="Explore"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="currentColor"
      >
        <polygon
          points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953"
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <circle
          cx="12.004"
          cy="12.004"
          r="10.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  messages: {
    label: "In Direct Messages",
    icon: (
      <svg
        aria-label="Direct"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="currentColor"
      >
        <line
          x1="22"
          x2="9.218"
          y1="2"
          y2="10.083"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <polygon
          points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  edit_profile: { label: "Editing Profile", icon: null },
  profile: { label: "Viewing Profile", icon: null },
  user_profile: { label: "Checking User Profile", icon: null },
  post: { label: "Reading Post", icon: null },
  online: { label: "Online", icon: null },
};

const ActivityBadge = ({ statusKey }) => {
  const activity = ACTIVITIES[statusKey] || {
    label: statusKey || "Offline",
    icon: null,
  };

  return (
    <span className={styles.badgeContent}>
      {activity.icon && (
        <span className={styles.badgeIcon}>{activity.icon}</span>
      )}
      <span className={styles.badgeLabel}>{activity.label}</span>
    </span>
  );
};

export default ActivityBadge;
