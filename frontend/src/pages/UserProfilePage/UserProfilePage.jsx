import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../api/axios";
import styles from "./UserProfilePage.module.css";
import PostModal from "../../components/PostModal/PostModal";
import Avatar from "../../components/Avatar/Avatar";

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { username } = useParams();

  const [user, setUser] = useState(null);
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
    } catch (error) {
      console.error("Error toggling follow:", error);
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
      setModalUsersList(data);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      setModalUsersList([]);
    } finally {
      setLoadingModalList(false);
    }
  };

  const closeUsersModal = () => {
    setActiveModal(null);
    setModalUsersList([]);
  };

  if (loading) return <div className={styles.loading}>Loading profile...</div>;
  if (!user) return <div className={styles.loading}>User not found.</div>;

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
              className={`${styles.followButton} ${
                isFollowing ? styles.followingActive : ""
              }`}
              onClick={handleFollowToggle}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>

          <div className={styles.statsRow}>
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
              style={{ cursor: "pointer" }}
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
          currentUserFollowing={isFollowing ? [user._id.toString()] : []}
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

export default UserProfilePage;
