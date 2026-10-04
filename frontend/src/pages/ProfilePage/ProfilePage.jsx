import { useState, useEffect, useCallback, memo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import API from "../../api/axios.js";
import styles from "./ProfilePage.module.css";
import Avatar from "../../components/Avatar/Avatar";
import AvatarViewModal from "../../components/AvatarViewModal/AvatarViewModal";
import { usePreventBodyScroll } from "../../hooks/usePreventBodyScroll";

const SEEDED_EMAILS = [
  "hub@itcareer.com",
  "tonia@example.com",
  "society@example.com",
  "pixel@example.com",
  "gamer@example.com",
  "nature@example.com",
  "food@example.com",
  "sound@example.com",
  "ninja@example.com",
  "volley@example.com",
];

const SEEDED_USERNAMES = [
  "itcareerhub",
  "tonia_art",
  "society_vibe",
  "pixel_master",
  "gamer_pro",
  "nature_lover",
  "foodie_joy",
  "sound_wave",
  "ninja_code",
  "volley_star",
];

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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [activeModal, setActiveModal] = useState(null);
  const [modalUsersList, setModalUsersList] = useState([]);
  const [loadingModalList, setLoadingModalList] = useState(false);

  const [isClosingSettings, setIsClosingSettings] = useState(false);
  const [isClosingUsersModal, setIsClosingUsersModal] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const usersListRef = useRef(null);

  const [modalTheme, setModalTheme] = useState(() => {
    return document.documentElement.getAttribute("data-theme") || "light";
  });

  const isSeeded = Boolean(
    user?.isSeeded ||
    SEEDED_EMAILS.includes((user?.email || "").toLowerCase()) ||
    SEEDED_USERNAMES.includes((user?.username || "").toLowerCase()),
  );

  const closeSettings = useCallback(() => {
    setIsClosingSettings(true);
    setTimeout(() => {
      setIsSettingsOpen(false);
      setIsClosingSettings(false);
    }, 150);
  }, []);

  const closeUsersModal = useCallback(() => {
    setIsClosingUsersModal(true);
    setTimeout(() => {
      setActiveModal(null);
      setModalUsersList([]);
      setIsClosingUsersModal(false);
    }, 150);
  }, []);

  usePreventBodyScroll(Boolean(activeModal), usersListRef, closeUsersModal);

  usePreventBodyScroll(isSettingsOpen, null, closeSettings);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    navigate("/login");
  }, [navigate]);

  const handleAvatarUpload = useCallback(
    async (file) => {
      if (!file || isSeeded) return;

      const dataToSend = new FormData();
      dataToSend.append("avatar", file);

      try {
        const token = localStorage.getItem("token");
        const { data } = await API.put("/api/users/edit", dataToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(
          (prevUser) => data.user || { ...prevUser, avatar: data.avatar },
        );
        window.dispatchEvent(new Event("profileUpdated"));
      } catch (err) {
        console.error("Error uploading avatar:", err);
      }
    },
    [isSeeded],
  );

  const handleAvatarRemove = useCallback(async () => {
    if (isSeeded) return;

    const dataToSend = new FormData();
    dataToSend.append("deleteAvatar", "true");

    try {
      const token = localStorage.getItem("token");
      await API.put("/api/users/edit", dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser((prevUser) => (prevUser ? { ...prevUser, avatar: "" } : null));
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (err) {
      console.error("Error deleting avatar:", err);
    }
  }, [isSeeded]);

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post,
      ),
    );
  }, []);

  const handlePostDelete = useCallback((deletedPostId) => {
    setPosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== deletedPostId),
    );
  }, []);

  useEffect(() => {
    const handleGlobalPostUpdate = (event) => {
      if (event.detail) {
        handlePostUpdate(event.detail);
      }
    };

    const handleGlobalPostDelete = (event) => {
      if (event.detail) {
        handlePostDelete(event.detail);
      }
    };

    window.addEventListener("postUpdated", handleGlobalPostUpdate);
    window.addEventListener("postDeleted", handleGlobalPostDelete);

    return () => {
      window.removeEventListener("postUpdated", handleGlobalPostUpdate);
      window.removeEventListener("postDeleted", handleGlobalPostDelete);
    };
  }, [handlePostUpdate, handlePostDelete]);

  useEffect(() => {
    const handleGlobalPostCreated = (event) => {
      const newPost = event.detail;

      if (!user || !newPost) return;

      const postAuthorId = newPost.user?._id || newPost.user;
      const isMyPost =
        postAuthorId === user._id || newPost.user?.username === user.username;

      if (isMyPost) {
        setPosts((prevPosts) => {
          if (prevPosts.some((post) => post._id === newPost._id)) {
            return prevPosts;
          }
          return [newPost, ...prevPosts];
        });
      }
    };

    window.addEventListener("postCreated", handleGlobalPostCreated);
    return () => {
      window.removeEventListener("postCreated", handleGlobalPostCreated);
    };
  }, [user]);

  const handleFollowToggle = useCallback(
    async (targetUserId) => {
      const currentFollowing = user?.following || [];
      const isCurrentlyFollowing = currentFollowing.some(
        (f) => (typeof f === "string" ? f : f._id) === targetUserId,
      );
      const nextState = !isCurrentlyFollowing;

      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        const list = prevUser.following || [];
        const updatedFollowing = nextState
          ? [...list, targetUserId]
          : list.filter(
              (id) => (typeof id === "string" ? id : id._id) !== targetUserId,
            );

        return { ...prevUser, following: updatedFollowing };
      });

      setModalUsersList((prevList) =>
        prevList.map((u) =>
          u._id === targetUserId ? { ...u, isFollowing: nextState } : u,
        ),
      );

      setFollowingCount((prev) => Math.max(0, nextState ? prev + 1 : prev - 1));

      try {
        await API.post(`/api/users/${targetUserId}/follow`);
      } catch (err) {
        console.error("Error toggling follow status:", err);

        setFollowingCount((prev) =>
          Math.max(0, nextState ? prev - 1 : prev + 1),
        );
      }
    },
    [user],
  );

  const openUsersModal = useCallback(async (type) => {
    setActiveModal(type);
    setLoadingModalList(true);
    try {
      setUser((currentUser) => {
        if (currentUser) {
          API.get(`/api/users/${currentUser._id}/${type}`)
            .then(({ data }) => {
              const userFollowingIds = (currentUser.following || []).map((f) =>
                typeof f === "string" ? f : f._id || f.id,
              );

              const formattedData = data.map((u) => ({
                ...u,
                isFollowing:
                  type === "following"
                    ? true
                    : userFollowingIds.includes(u._id),
              }));

              setModalUsersList(formattedData);

              if (type === "followers") {
                setFollowersCount(formattedData.length);
              } else if (type === "following") {
                setFollowingCount(formattedData.length);
              }
            })
            .catch((error) => {
              console.error(`Error fetching ${type}:`, error);
              setModalUsersList([]);
            })
            .finally(() => {
              setLoadingModalList(false);
            });
        }
        return currentUser;
      });
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setModalUsersList([]);
      setLoadingModalList(false);
    }
  }, []);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const { data: userData } = await API.get("/api/users/profile");
        setUser(userData);

        const followers =
          typeof userData.followersCount !== "undefined"
            ? userData.followersCount
            : userData.followers
              ? userData.followers.length
              : 0;

        const following =
          typeof userData.followingCount !== "undefined"
            ? userData.followingCount
            : userData.following
              ? userData.following.length
              : 0;

        setFollowersCount(followers);
        setFollowingCount(following);

        const { data: postsData } = await API.get(
          `/api/posts/user/${userData.username}`,
        );
        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching profile and posts:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [navigate]);

  useEffect(() => {
    const updateModalTheme = () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      setModalTheme(current);
    };

    const observer = new MutationObserver(updateModalTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const handleSelectPost = useCallback((post) => {
    window.dispatchEvent(
      new CustomEvent("openPostModal", {
        detail: {
          postId: post._id || post.id,
          post: post,
        },
      }),
    );
  }, []);

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

  if (!user)
    return <div className={styles.loading}>User data not available.</div>;

  const bioText = user.bio || "No bio yet.";
  const BIO_LIMIT = 108;
  const isLongBio = bioText.length > BIO_LIMIT;

  return (
    <div className={styles.profileContainer}>
      <header className={styles.header}>
        <div className={styles.headerTopMobile}>
          <div
            className={`${styles.avatarContainer} ${styles.avatarOnlineContainer}`}
            onClick={() => !isSeeded && setIsAvatarModalOpen(true)}
            style={{ cursor: isSeeded ? "default" : "pointer" }}
          >
            <div className={`${styles.avatarFrame} ${styles.avatarOnlineGlow}`}>
              <Avatar user={user} size={150} showStatus={false} />
            </div>
          </div>

          <div className={styles.mobileRightBlock}>
            <div className={styles.mobileUsernameRow}>
              <h2>{user.username}</h2>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={styles.settingsButton}
              >
                <svg
                  aria-label="Options"
                  color="currentColor"
                  fill="currentColor"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                >
                  <circle
                    cx="12.001"
                    cy="12.001"
                    fill="none"
                    r="10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                  ></circle>
                  <circle cx="7.001" cy="12.001" r="1.5"></circle>
                  <circle cx="12.001" cy="12.001" r="1.5"></circle>
                  <circle cx="17.001" cy="12.001" r="1.5"></circle>
                </svg>
              </button>
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

            <button
              className={styles.editButton}
              onClick={() => navigate("/edit-profile")}
            >
              Edit profile
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={styles.settingsButton}
            >
              <svg
                aria-label="Options"
                color="currentColor"
                fill="currentColor"
                height="24"
                viewBox="0 0 24 24"
                width="24"
              >
                <circle
                  cx="12.001"
                  cy="12.001"
                  fill="none"
                  r="10.5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="7.001" cy="12.001" r="1.5" />
                <circle cx="12.001" cy="12.001" r="1.5" />
                <circle cx="17.001" cy="12.001" r="1.5" />
              </svg>
            </button>
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
              className={styles.mobileEditButton}
              onClick={() => navigate("/edit-profile")}
            >
              Edit profile
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
              onSelectPost={handleSelectPost}
            />
          ))
        ) : (
          <div className={styles.noPostsCard}>
            <div className={styles.noPostsIconWrapper}>
              <div className={styles.noPostsIconPulse} />
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            <h3 className={styles.noPostsTitle}>Share Photos & Moments</h3>

            <p className={styles.noPostsSubtitle}>
              When you share photos and thoughts, they will appear on your
              profile for everyone to see.
            </p>

            <button
              type="button"
              className={styles.createPostBtn}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("openCreatePostModal"));
              }}
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Your First Post</span>
            </button>
          </div>
        )}
      </div>

      {isSettingsOpen &&
        createPortal(
          <div
            className={`${styles.modalOverlay} ${isClosingSettings ? styles.fadeOut : ""}`}
            onClick={closeSettings}
          >
            <div
              className={`${styles.settingsModalContent} ${isClosingSettings ? styles.scaleDown : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.settingsModalHeader}>
                <h3>Account Options</h3>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={closeSettings}
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

              <div className={styles.settingsModalBody}>
                <div className={styles.settingsActionStack}>
                  <button
                    onClick={() => {
                      const nextTheme =
                        modalTheme === "dark" ? "light" : "dark";
                      document.documentElement.setAttribute(
                        "data-theme",
                        nextTheme,
                      );
                      localStorage.setItem("theme", nextTheme);
                      setModalTheme(nextTheme);
                    }}
                    className={styles.modalAction}
                  >
                    {modalTheme === "dark" ? (
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
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    ) : (
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
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                    <span>
                      {modalTheme === "dark" ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className={`${styles.modalAction} ${styles.danger}`}
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
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log out</span>
                  </button>

                  <button
                    onClick={closeSettings}
                    className={styles.modalAction}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
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

              <div ref={usersListRef} className={styles.modalBody}>
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

                          {modalUser._id !== user._id ? (
                            <div className={styles.actionBtnWrapper}>
                              <button
                                className={`${styles.listFollowBtn} ${
                                  modalUser.isFollowing
                                    ? styles.following
                                    : styles.follow
                                }`}
                                onClick={() =>
                                  handleFollowToggle(modalUser._id)
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

      {isAvatarModalOpen && !isSeeded && (
        <AvatarViewModal
          user={user}
          isOwnProfile={true}
          hasCustomAvatar={!!user?.avatar}
          onClose={() => setIsAvatarModalOpen(false)}
          onUploadSave={handleAvatarUpload}
          onRemovePhoto={handleAvatarRemove}
        />
      )}
    </div>
  );
};

export default ProfilePage;
