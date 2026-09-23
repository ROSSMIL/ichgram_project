import {
  useState,
  useEffect,
  useCallback,
  memo,
  useRef,
  useLayoutEffect,
} from "react";
import PropTypes from "prop-types";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useSocket } from "../../context/useSocket.js";
import API from "../../api/axios.js";
import styles from "./UserProfilePage.module.css";
import PostModal from "../../components/PostModal/PostModal";
import Avatar from "../../components/Avatar/Avatar";
import AvatarViewModal from "../../components/AvatarViewModal/AvatarViewModal";
import PageHeader from "../../components/PageHeader/PageHeader";

import { saveToRecentlyViewed } from "../../utils/recentlyViewed.js";

const renderActivityStatus = (statusKey) => {
  const iconProps = {
    width: 13,
    height: 13,
    fill: "none",
    color: "currentColor",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      marginRight: "5px",
      flexShrink: 0,
    },
  };

  switch (statusKey) {
    case "dashboard":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Home" viewBox="0 0 24 24" {...iconProps}>
            <path d="M9 16.5 A3 3 0 0 1 15 16.5 V22 H22 V11.5 L12 2 L2 11.5 V22 H9 Z" />
          </svg>
          Viewing Feed
        </span>
      );

    case "explore":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Explore" viewBox="0 0 24 24" {...iconProps}>
            <polygon
              fill="currentColor"
              points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953"
            />
            <circle cx="12.004" cy="12.004" r="10.5" />
          </svg>
          Exploring Trends
        </span>
      );

    case "messages":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Direct" viewBox="0 0 24 24" {...iconProps}>
            <line x1="22" x2="9.218" y1="2" y2="10.083" />
            <polygon
              fill="currentColor"
              points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
            />
          </svg>
          In Direct Messages
        </span>
      );

    case "notifications":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Notifications" viewBox="0 0 24 24" {...iconProps}>
            <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.65 5.618-5.91 8.526L12 21l-3.59-3.352C5.15 14.74 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941L12 7.428l1.117-1.775a4.21 4.21 0 0 1 3.675-1.949Z" />
          </svg>
          Viewing Notifications
        </span>
      );

    case "edit_profile":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Edit Profile" viewBox="0 0 24 24" {...iconProps}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Editing Profile
        </span>
      );

    case "profile":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Profile" viewBox="0 0 24 24" {...iconProps}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Viewing Profile
        </span>
      );

    case "user_profile":
      return (
        <span className={styles.statusContentInner}>
          <svg
            aria-label="Checking User Profile"
            viewBox="0 0 24 24"
            {...iconProps}
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Checking User Profile
        </span>
      );

    case "post":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Reading Post" viewBox="0 0 24 24" {...iconProps}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="16" x2="13" y2="16" />
          </svg>
          Reading Post
        </span>
      );

    case "online":
      return (
        <span className={styles.statusContentInner}>
          <svg aria-label="Online" viewBox="0 0 24 24" {...iconProps}>
            <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
          </svg>
          Online
        </span>
      );

    default:
      return (
        <span className={styles.statusContentInner}>
          {statusKey || "Offline"}
        </span>
      );
  }
};

const useDwellPresence = (presence, dwellTime = 3500) => {
  const [debouncedPresence, setDebouncedPresence] = useState(presence);

  useEffect(() => {
    if (!presence) {
      const timer = setTimeout(() => {
        setDebouncedPresence(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!debouncedPresence) {
      const timer = setTimeout(() => {
        setDebouncedPresence(presence);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setDebouncedPresence(presence);
    }, dwellTime);

    return () => clearTimeout(timer);
  }, [presence, dwellTime, debouncedPresence]);

  return debouncedPresence;
};

const StatusTextSwitcher = memo(({ statusKey, isUserOnline }) => {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [bubbleWidth, setBubbleWidth] = useState("auto");

  useLayoutEffect(() => {
    if (measureRef.current) {
      const rect = measureRef.current.getBoundingClientRect();
      const targetWidth = Math.ceil(rect.width) + 26;
      setBubbleWidth(`${targetWidth}px`);
    }
  }, [statusKey, isUserOnline]);

  return (
    <div
      ref={containerRef}
      className={`${styles.avatarStatusBubble} ${
        isUserOnline ? styles.bubbleOnline : styles.bubbleOffline
      }`}
      style={{ width: bubbleWidth }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={measureRef}
        className={styles.measureContainer}
        aria-hidden="true"
      >
        <span className={styles.bubbleDot} />
        {renderActivityStatus(statusKey)}
      </div>

      <span className={styles.bubbleDot} />
      <div className={styles.statusTextViewport}>
        <span key={statusKey} className={styles.statusTextAnimated}>
          {renderActivityStatus(statusKey)}
        </span>
      </div>
    </div>
  );
});

StatusTextSwitcher.displayName = "StatusTextSwitcher";

StatusTextSwitcher.propTypes = {
  statusKey: PropTypes.string,
  isUserOnline: PropTypes.bool,
};

const ProfilePostItem = memo(({ post, index, onSelectPost }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const itemRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    const currentItem = itemRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (currentItem) observer.unobserve(currentItem);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -30px 0px",
      },
    );

    if (currentItem) {
      observer.observe(currentItem);
    }

    return () => {
      if (currentItem) observer.unobserve(currentItem);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!itemRef.current || window.innerWidth <= 768) return;

    const card = itemRef.current;
    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    const glossX = (x / rect.width) * 100;
    const glossY = (y / rect.height) * 100;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    requestRef.current = requestAnimationFrame(() => {
      card.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
      card.style.setProperty("--gloss-x", `${glossX.toFixed(1)}%`);
      card.style.setProperty("--gloss-y", `${glossY.toFixed(1)}%`);
      card.style.setProperty("--gloss-opacity", "1");
    });
  };

  const handleMouseLeave = () => {
    if (!itemRef.current || window.innerWidth <= 768) return;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    const card = itemRef.current;
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--gloss-opacity", "0");
  };

  const imageUrl = post.url
    ? post.url.startsWith("http")
      ? post.url
      : `${API.defaults.baseURL}/${post.url.replace(/^\//, "")}`
    : `https://picsum.photos/seed/${post._id}/500/500`;

  return (
    <div
      ref={itemRef}
      className={`${styles.gridItem} ${isVisible ? styles.itemVisible : ""}`}
      style={{
        "--post-bg": `url(${imageUrl})`,
        "--i": index % 12,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectPost(post)}
    >
      <div className={styles.floatWrapper}>
        <img
          src={imageUrl}
          alt="Post"
          className={`${styles.postImage} ${isLoaded ? styles.imageLoaded : ""}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/500x500/e2e8f0/64748b?text=No+Image";
            setIsLoaded(true);
          }}
        />

        <div className={styles.glossOverlay} />

        <div className={styles.statsBadge}>
          <div className={styles.badgeStat}>
            <svg
              className={styles.badgeIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>
              {post.likesCount !== undefined
                ? post.likesCount
                : post.likes?.length || 0}
            </span>
          </div>
          <div className={styles.badgeStat}>
            <svg
              className={styles.badgeIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
            </svg>
            <span>{post.comments?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ProfilePostItem.displayName = "ProfilePostItem";

ProfilePostItem.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    url: PropTypes.string,
    likesCount: PropTypes.number,
    likes: PropTypes.array,
    comments: PropTypes.array,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onSelectPost: PropTypes.func.isRequired,
};

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const { onlineUsers } = useSocket();

  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [activeModal, setActiveModal] = useState(null);
  const [modalUsersList, setModalUsersList] = useState([]);
  const [loadingModalList, setLoadingModalList] = useState(false);

  const [isClosingUsersModal, setIsClosingUsersModal] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfileAndPosts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const myRes = await API.get("/api/users/profile", { headers });
        setCurrentUser(myRes.data);

        const userRes = await API.get(`/api/users/${username}`, { headers });
        const userData = userRes.data;

        if (userData.isMe) {
          navigate("/profile", { replace: true });
          return;
        }

        setUser(userData);
        saveToRecentlyViewed(userData);

        setIsFollowing(userData.isFollowing || false);
        setFollowersCount(userData.followersCount || 0);
        setFollowingCount(userData.followingCount || 0);

        const postsRes = await API.get(`/api/posts/user/${username}`, {
          headers,
        });
        setPosts(postsRes.data || []);
      } catch (error) {
        console.error("Error fetching user profile and posts:", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfileAndPosts();
    }
  }, [username, navigate]);

  const handleOpenChat = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      const { data } = await API.post(
        "/api/chat",
        { userId: user._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      navigate("/messages", {
        state: {
          openChatId: data._id,
          partnerId: user._id,
        },
      });
    } catch (err) {
      console.error("Error opening chat with user:", err);
    }
  };

  const handleFollowToggle = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      const response = await API.post(
        `/api/users/${user._id}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updatedIsFollowing = response.data.isFollowing;
      setIsFollowing(updatedIsFollowing);

      setFollowersCount((prev) =>
        updatedIsFollowing ? prev + 1 : Math.max(0, prev - 1),
      );

      setCurrentUser((prevMy) => {
        if (!prevMy) return prevMy;
        const currentFollowing = prevMy.following || [];
        let updatedFollowing;

        if (updatedIsFollowing) {
          updatedFollowing = [...currentFollowing, user._id];
        } else {
          updatedFollowing = currentFollowing.filter(
            (id) => (typeof id === "string" ? id : id._id) !== user._id,
          );
        }

        return { ...prevMy, following: updatedFollowing };
      });
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  }, [user]);

  const handleModalFollowToggle = useCallback(
    async (targetUserId) => {
      try {
        const token = localStorage.getItem("token");
        const response = await API.post(
          `/api/users/${targetUserId}/follow`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const nextState = response.data.isFollowing;

        setModalUsersList((prevList) =>
          prevList.map((u) =>
            u._id === targetUserId ? { ...u, isFollowing: nextState } : u,
          ),
        );

        setCurrentUser((prevMy) => {
          if (!prevMy) return prevMy;
          const currentFollowing = prevMy.following || [];
          let updatedFollowing;

          if (nextState) {
            updatedFollowing = [...currentFollowing, targetUserId];
          } else {
            updatedFollowing = currentFollowing.filter(
              (id) => (typeof id === "string" ? id : id._id) !== targetUserId,
            );
          }

          return { ...prevMy, following: updatedFollowing };
        });

        if (user && user._id === targetUserId) {
          setIsFollowing(nextState);
          setFollowersCount((prev) =>
            nextState ? prev + 1 : Math.max(0, prev - 1),
          );
        }
      } catch (error) {
        console.error("Error toggling modal follow status:", error);
      }
    },
    [user],
  );

  const closeUsersModal = useCallback(() => {
    setIsClosingUsersModal(true);
    setTimeout(() => {
      setActiveModal(null);
      setModalUsersList([]);
      setIsClosingUsersModal(false);
    }, 150);
  }, []);

  const openUsersModal = useCallback(
    async (type) => {
      if (!user) return;
      setActiveModal(type);
      setLoadingModalList(true);
      try {
        const token = localStorage.getItem("token");
        const { data } = await API.get(`/api/users/${user._id}/${type}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const myFollowingIds = (currentUser?.following || []).map((f) =>
          typeof f === "string" ? f : f._id || f.id,
        );

        const formattedData = data.map((u) => ({
          ...u,
          isFollowing: myFollowingIds.includes(u._id),
        }));

        setModalUsersList(formattedData);

        if (type === "followers") {
          setFollowersCount(formattedData.length);
        } else if (type === "following") {
          setFollowingCount(formattedData.length);
        }
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        setModalUsersList([]);
      } finally {
        setLoadingModalList(false);
      }
    },
    [user, currentUser],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activeModal && !isClosingUsersModal) closeUsersModal();
        if (selectedPost) setSelectedPost(null);
        if (isAvatarModalOpen) setIsAvatarModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeModal,
    isClosingUsersModal,
    selectedPost,
    isAvatarModalOpen,
    closeUsersModal,
  ]);

  const userIdStr = (user?._id || user?.id)?.toString();
  const rawPresence = onlineUsers?.[userIdStr];

  const isUserOnline = Boolean(rawPresence);
  const presence = useDwellPresence(rawPresence, 3500);

  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <header className={styles.header}>
          <div className={styles.avatarContainer}>
            <div
              className={`${styles.skeletonAvatarCircle} ${styles.skeletonPulse}`}
            />
          </div>
          <section className={styles.userInfo}>
            <div className={styles.usernameRow}>
              <div
                className={`${styles.skeletonTitleLine} ${styles.skeletonPulse}`}
              />
            </div>
            <div className={styles.statsRow}>
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "70px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "70px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "70px" }}
              />
            </div>
            <div className={styles.bioSection}>
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "140px", marginBottom: "8px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "200px" }}
              />
            </div>
          </section>
        </header>

        <div className={styles.postsGrid}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className={`${styles.skeletonGridItem} ${styles.skeletonPulse}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <div className={styles.loading}>User not found.</div>;

  const bioText = user.bio || "No bio yet.";
  const BIO_LIMIT = 108;
  const isLongBio = bioText.length > BIO_LIMIT;

  return (
    <div className={styles.profileContainer}>
      <PageHeader />
      <header className={styles.header}>
        <div className={styles.headerTopMobile}>
          <div
            className={`${styles.avatarContainer} ${
              isUserOnline ? styles.avatarOnlineContainer : ""
            }`}
            onClick={() => setIsAvatarModalOpen(true)}
          >
            <div
              className={`${styles.avatarFrame} ${
                isUserOnline ? styles.avatarOnlineGlow : ""
              }`}
            >
              <Avatar user={user} size={150} showStatus={false} />
            </div>

            <StatusTextSwitcher
              statusKey={
                isUserOnline ? presence?.status || "online" : "offline"
              }
              isUserOnline={isUserOnline}
            />
          </div>

          <div className={styles.mobileRightBlock}>
            <div className={styles.mobileUsernameRow}>
              <h2>{user.username}</h2>
            </div>

            <div className={`${styles.statsRow} ${styles.mobileStats}`}>
              <div className={styles.statItem}>
                <strong>{posts.length}</strong>
                <span>posts</span>
              </div>
              <div
                onClick={() => openUsersModal("followers")}
                className={`${styles.statItem} ${styles.clickableStat}`}
              >
                <strong>{followersCount}</strong>
                <span>followers</span>
              </div>
              <div
                onClick={() => openUsersModal("following")}
                className={`${styles.statItem} ${styles.clickableStat}`}
              >
                <strong>{followingCount}</strong>
                <span>following</span>
              </div>
            </div>
          </div>
        </div>

        <section className={styles.userInfo}>
          <div className={styles.usernameRow}>
            <h2>{user.username}</h2>

            <div className={styles.actionsGroup}>
              <button
                className={`${styles.followButton} ${
                  isFollowing ? styles.followingActive : ""
                }`}
                onClick={handleFollowToggle}
              >
                {isFollowing ? (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Following</span>
                  </>
                ) : (
                  <span>Follow</span>
                )}
              </button>

              <button
                className={styles.messageIconButton}
                onClick={handleOpenChat}
                aria-label="Message user"
                title="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>

          <div className={`${styles.statsRow} ${styles.desktopStats}`}>
            <span>
              <strong>{posts.length}</strong> posts
            </span>
            <span
              onClick={() => openUsersModal("followers")}
              className={styles.clickableStat}
            >
              <strong>{followersCount}</strong> followers
            </span>
            <span
              onClick={() => openUsersModal("following")}
              className={styles.clickableStat}
            >
              <strong>{followingCount}</strong> following
            </span>
          </div>

          <div className={styles.bioSection}>
            <h1>{user.fullName || user.username}</h1>
            <p
              className={styles.bioText}
              style={{
                cursor: isLongBio && isBioExpanded ? "pointer" : "default",
              }}
              onClick={() =>
                isLongBio && isBioExpanded && setIsBioExpanded(false)
              }
            >
              {isLongBio && !isBioExpanded
                ? `${bioText.slice(0, BIO_LIMIT)}...`
                : bioText}
              {isLongBio && !isBioExpanded && (
                <button
                  className={styles.moreButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBioExpanded(true);
                  }}
                >
                  more
                </button>
              )}
            </p>

            {user.website && (
              <a
                href={
                  user.website.startsWith("http")
                    ? user.website
                    : `https://${user.website}`
                }
                target="_blank"
                rel="noreferrer"
                className={styles.bioLink}
              >
                🔗 {user.website}
              </a>
            )}
          </div>

          <div className={styles.mobileActionsRow}>
            <button
              className={`${styles.mobileFollowButton} ${
                isFollowing ? styles.followingActive : ""
              }`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "✓ Following" : "Follow"}
            </button>
            <button
              className={styles.mobileMessageIconButton}
              onClick={handleOpenChat}
              aria-label="Message user"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </section>
      </header>

      <div
        className={
          posts.length > 0 ? styles.postsGrid : styles.emptyGridWrapper
        }
      >
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <ProfilePostItem
              key={post._id}
              post={post}
              index={index}
              onSelectPost={setSelectedPost}
            />
          ))
        ) : (
          <div className={styles.noPostsContainer}>
            <div className={styles.cameraIconWrapper}>
              <svg
                aria-label="Camera"
                color="currentColor"
                fill="currentColor"
                height="44"
                role="img"
                viewBox="0 0 24 24"
                width="44"
              >
                <circle
                  cx="12.001"
                  cy="12.005"
                  fill="none"
                  r="4.3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M19.336 10.425a1.895 1.895 0 1 1-1.896-1.897 1.896 1.896 0 0 1 1.896 1.897ZM5.65 7.424l.951-2.28a1.91 1.91 0 0 1 1.758-1.144h7.284a1.91 1.91 0 0 1 1.758 1.144l.95 2.28h2.649a2.002 2.002 0 0 1 2 2v10a2.002 2.002 0 0 1-2 2H3a2.002 2.002 0 0 1-2-2v-10a2.002 2.002 0 0 1 2-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <h3 className={styles.noPostsTitle}>No posts yet</h3>
            <p className={styles.noPostsSubtitle}>
              When this user shares photos, they will appear here.
            </p>
          </div>
        )}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          currentUserFollowing={currentUser?.following || []}
          onFollowToggle={handleFollowToggle}
        />
      )}

      {activeModal &&
        createPortal(
          <div
            className={`${styles.modalOverlay} ${isClosingUsersModal ? styles.fadeOut : ""}`}
            onClick={closeUsersModal}
          >
            <div
              className={`${styles.modalContent} ${isClosingUsersModal ? styles.scaleDown : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {activeModal === "followers" ? "Followers" : "Following"}
                </h3>
                <button
                  className={styles.closeModalBtn}
                  onClick={closeUsersModal}
                  aria-label="Close modal"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.modalBody}>
                {loadingModalList ? (
                  <div className={styles.modalLoading}>
                    <div className={styles.spinner} />
                    <span>Loading users...</span>
                  </div>
                ) : modalUsersList.length > 0 ? (
                  <div className={styles.modalListCard}>
                    <ul className={styles.usersList}>
                      {modalUsersList.map((modalUser, idx) => (
                        <li
                          key={modalUser._id}
                          className={styles.userItem}
                          style={{ "--stagger-index": idx }}
                        >
                          <Link
                            to={`/user/${modalUser.username}`}
                            className={styles.userItemLeftLink}
                            onClick={closeUsersModal}
                          >
                            <div className={styles.avatarWrapper}>
                              <Avatar user={modalUser} size={42} />
                            </div>
                            <div className={styles.userNames}>
                              <span className={styles.userUsername}>
                                {modalUser.username}
                              </span>
                              <span className={styles.userFullName}>
                                {modalUser.fullName || modalUser.username}
                              </span>
                            </div>
                          </Link>

                          {currentUser && modalUser._id !== currentUser._id ? (
                            <div className={styles.actionBtnWrapper}>
                              <button
                                className={`${styles.listFollowBtn} ${
                                  modalUser.isFollowing
                                    ? styles.following
                                    : styles.follow
                                }`}
                                onClick={() =>
                                  handleModalFollowToggle(modalUser._id)
                                }
                              >
                                {modalUser.isFollowing ? (
                                  <>
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Following</span>
                                  </>
                                ) : (
                                  "Follow"
                                )}
                              </button>
                            </div>
                          ) : (
                            <div
                              className={styles.actionBtnWrapperPlaceholder}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className={styles.noUsersMessage}>
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.emptyUsersIcon}
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <p>
                      {activeModal === "followers"
                        ? "No followers yet."
                        : "No followings yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isAvatarModalOpen && (
        <AvatarViewModal
          user={user}
          isOwnProfile={false}
          showStatus={false}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
