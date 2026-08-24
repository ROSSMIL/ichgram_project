import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../api/axios.js";
import styles from "./ProfilePage.module.css";
import PostModal from "../../components/PostModal/PostModal";
import Avatar from "../../components/Avatar/Avatar";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [activeModal, setActiveModal] = useState(null);
  const [modalUsersList, setModalUsersList] = useState([]);
  const [loadingModalList, setLoadingModalList] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post,
      ),
    );
    setSelectedPost(updatedPost);
  };

  const handlePostDelete = (deletedPostId) => {
    setPosts((prevPosts) =>
      prevPosts.filter((post) => post._id !== deletedPostId),
    );
    setSelectedPost(null);
  };

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

  const handleFollowToggle = async (targetUserId) => {
    try {
      const isCurrentlyFollowing = user?.following?.some(
        (f) => (typeof f === "string" ? f : f._id) === targetUserId,
      );

      const nextState = !isCurrentlyFollowing;

      await API.post(`/api/users/${targetUserId}/follow`);

      setModalUsersList((prevList) =>
        prevList.map((u) =>
          u._id === targetUserId ? { ...u, isFollowing: nextState } : u,
        ),
      );

      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        const currentFollowing = prevUser.following || [];

        let updatedFollowing;
        if (nextState) {
          updatedFollowing = [...currentFollowing, targetUserId];
        } else {
          updatedFollowing = currentFollowing.filter(
            (id) => (typeof id === "string" ? id : id._id) !== targetUserId,
          );
        }

        return { ...prevUser, following: updatedFollowing };
      });

      setFollowingCount((prev) => {
        const newCount = nextState ? prev + 1 : prev - 1;
        return newCount < 0 ? 0 : newCount;
      });
    } catch (error) {
      console.error("Error toggling follow status:", error);
    }
  };

  const closeUsersModal = () => {
    setActiveModal(null);
    setModalUsersList([]);
  };

  const openUsersModal = async (type) => {
    setActiveModal(type);
    setLoadingModalList(true);
    try {
      const { data } = await API.get(`/api/users/${user._id}/${type}`);

      const userFollowingIds = (user.following || []).map((f) =>
        typeof f === "string" ? f : f._id || f.id,
      );

      const formattedData = data.map((u) => ({
        ...u,
        isFollowing:
          type === "following" ? true : userFollowingIds.includes(u._id),
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
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (activeModal) closeUsersModal();
        if (selectedPost) setSelectedPost(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen, activeModal, selectedPost]);

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
                style={{ width: "80px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "80px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "80px" }}
              />
            </div>
            <div className={styles.bioSection}>
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "160px", marginBottom: "8px" }}
              />
              <div
                className={`${styles.skeletonTextLine} ${styles.skeletonPulse}`}
                style={{ width: "240px" }}
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
        <div className={styles.avatarContainer}>
          <div className={styles.avatarGradient}>
            <div className={styles.whiteBorderWrapper}>
              <Avatar user={user} size={143} />
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
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
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

          <div className={styles.statsRow}>
            <span>
              <strong>{posts.length}</strong> posts
            </span>
            <span
              onClick={() => openUsersModal("followers")}
              className={styles.clickableStat}
              style={{ cursor: "pointer" }}
            >
              <strong>{followersCount}</strong> followers
            </span>
            <span
              onClick={() => openUsersModal("following")}
              className={styles.clickableStat}
              style={{ cursor: "pointer" }}
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
              <img src={post.url} alt="Post" className={styles.postImage} />

              {/* INSTAGRAM HOVER OVERLAY */}
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
              When you share photos, they will appear here.
            </p>
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className={styles.settingsModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleLogout}
              className={`${styles.modalAction} ${styles.danger}`}
            >
              Log out
            </button>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className={styles.modalAction}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostModal
          key={selectedPost._id}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPostUpdate={handlePostUpdate}
          onPostDelete={handlePostDelete}
          currentUserFollowing={user.following || []}
          onFollowToggle={handleFollowToggle}
        />
      )}

      {activeModal && (
        <div className={styles.modalOverlay} onClick={closeUsersModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>{activeModal === "followers" ? "Followers" : "Following"}</h3>
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

                      {modalUser._id !== user._id ? (
                        <div className={styles.actionBtnWrapper}>
                          <button
                            className={`${styles.listFollowBtn} ${
                              modalUser.isFollowing
                                ? styles.following
                                : styles.follow
                            }`}
                            onClick={() => handleFollowToggle(modalUser._id)}
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
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
