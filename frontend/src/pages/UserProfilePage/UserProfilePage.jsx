import { useState, useEffect, useCallback, memo, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import API from "../../api/axios.js";
import styles from "./UserProfilePage.module.css";
import PostModal from "../../components/PostModal/PostModal";
import Avatar from "../../components/Avatar/Avatar";
import AvatarViewModal from "../../components/AvatarViewModal/AvatarViewModal";
import PageHeader from "../../components/PageHeader/PageHeader";

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
            className={styles.avatarContainer}
            onClick={() => setIsAvatarModalOpen(true)}
          >
            <div className={styles.avatarFrame}>
              <Avatar user={user} size={150} />
            </div>
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
            <button
              className={`${styles.followButton} ${
                isFollowing ? styles.followingActive : ""
              }`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "Following" : "Follow"}
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
              className={`${styles.mobileFollowButton} ${
                isFollowing ? styles.followingActive : ""
              }`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "Following" : "Follow"}
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
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {loadingModalList ? (
                  <div className={styles.modalLoading}>Loading users...</div>
                ) : modalUsersList.length > 0 ? (
                  <ul className={styles.usersList}>
                    {modalUsersList.map((modalUser) => (
                      <li key={modalUser._id} className={styles.userItem}>
                        <Link
                          to={`/user/${modalUser.username}`}
                          className={styles.userItemLeftLink}
                          onClick={closeUsersModal}
                        >
                          <div className={styles.avatarWrapper}>
                            <Avatar user={modalUser} size={40} />
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
                              {modalUser.isFollowing ? "Following" : "Follow"}
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actionBtnWrapperPlaceholder} />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.noUsersMessage}>
                    {activeModal === "followers"
                      ? "No followers yet."
                      : "No followings yet."}
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
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
