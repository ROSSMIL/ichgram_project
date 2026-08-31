import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import API from "../../api/axios";
import styles from "./UserProfilePage.module.css";
import PostModal from "../../components/PostModal/PostModal";
import Avatar from "../../components/Avatar/Avatar";

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

  const handleFollowToggle = async () => {
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
  };

  const handleModalFollowToggle = async (targetUserId) => {
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
  };

  const openUsersModal = async (type) => {
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
  };

  const closeUsersModal = () => {
    setIsClosingUsersModal(true);
    setTimeout(() => {
      setActiveModal(null);
      setModalUsersList([]);
      setIsClosingUsersModal(false);
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (activeModal && !isClosingUsersModal) closeUsersModal();
        if (selectedPost) setSelectedPost(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal, isClosingUsersModal, selectedPost]);

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
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <svg
          aria-label="Back"
          color="rgb(38, 38, 38)"
          fill="rgb(38, 38, 38)"
          height="24"
          role="img"
          viewBox="0 0 24 24"
          width="24"
        >
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            x1="2.909"
            x2="21.413"
            y1="12"
            y2="12"
          ></line>
          <polyline
            fill="none"
            points="11.692 3.22 2.909 12 11.692 20.78"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          ></polyline>
        </svg>
      </button>

      <header className={styles.header}>
        <div className={styles.headerTopMobile}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarGradient}>
              <div className={styles.whiteBorderWrapper}>
                <Avatar user={user} size={150} />
              </div>
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
          posts.map((post) => (
            <div
              key={post._id}
              className={styles.gridItem}
              onClick={() => setSelectedPost(post)}
            >
              <img
                src={
                  post.url
                    ? post.url.startsWith("http")
                      ? post.url
                      : `${API.defaults.baseURL}/${post.url.replace(/^\//, "")}`
                    : `https://picsum.photos/seed/${post._id}/500/500`
                }
                alt="Post"
                className={styles.postImage}
              />
              <div className={styles.gridItemOverlay}>
                <div className={styles.overlayStat}>
                  <svg
                    className={styles.overlayIcon}
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
                <div className={styles.overlayStat}>
                  <svg
                    className={styles.overlayIcon}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                  </svg>
                  <span>{post.comments?.length || 0}</span>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default UserProfilePage;
