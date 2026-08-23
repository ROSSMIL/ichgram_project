import { useState, useEffect, useCallback } from "react";
import API from "../../api/axios";
import PostModal from "../../components/PostModal/PostModal";
import styles from "./ExplorePage.module.css";

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ExplorePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [autoFocusComment, setAutoFocusComment] = useState(false);

  const token = localStorage.getItem("token");

  const getLoggedInData = () => {
    if (!token) return { userId: null };
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        userId: payload.userId || payload.id || payload._id,
      };
    } catch (error) {
      console.error("Token decoding error", error);
      return { userId: null };
    }
  };

  const { userId: currentUserId } = getLoggedInData();

  const fetchExploreData = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) {
          setLoading(true);
        }

        const postsRes = await API.get("/api/posts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const randomizedPosts = shuffleArray(postsRes.data);
        setPosts(randomizedPosts);

        const profileRes = await API.get("/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const followingIds =
          profileRes.data.following
            ?.map((f) => {
              const id = typeof f === "string" ? f : f._id || f.id;
              return id ? id.toString() : "";
            })
            .filter(Boolean) || [];

        setCurrentUserFollowing(followingIds);
      } catch (error) {
        console.error("Error loading explore data:", error);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (token && isMounted) {
        await fetchExploreData();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchExploreData, token]);

  useEffect(() => {
    const handleRefresh = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (token) {
        fetchExploreData(true);
      }
    };

    window.addEventListener("refreshExplore", handleRefresh);

    return () => {
      window.removeEventListener("refreshExplore", handleRefresh);
    };
  }, [fetchExploreData, token]);

  const handleFollowToggle = async (targetUserId) => {
    try {
      const response = await API.post(
        `/api/users/${targetUserId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      let updatedFollowing = [];
      if (response.data.following) {
        updatedFollowing = response.data.following
          .map((f) => {
            const id = typeof f === "string" ? f : f._id || f.id;
            return id ? id.toString() : "";
          })
          .filter(Boolean);
      } else {
        updatedFollowing = currentUserFollowing.includes(targetUserId)
          ? currentUserFollowing.filter((id) => id !== targetUserId)
          : [...currentUserFollowing, targetUserId];
      }

      setCurrentUserFollowing(updatedFollowing);

      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          const postAuthorId = p.user?._id || p.user?.id || p.user;
          if (
            postAuthorId &&
            postAuthorId.toString() === targetUserId.toString()
          ) {
            const isNowFollowing = updatedFollowing.includes(targetUserId);
            return {
              ...p,
              isFollowingAuthor: isNowFollowing,
              user:
                typeof p.user === "object"
                  ? {
                      ...p.user,
                      followers: isNowFollowing
                        ? [...(p.user.followers || []), currentUserId]
                        : (p.user.followers || []).filter((fId) => {
                            const id =
                              typeof fId === "string" ? fId : fId._id || fId.id;
                            return id !== currentUserId;
                          }),
                    }
                  : p.user,
            };
          }
          return p;
        }),
      );
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p._id === updatedPost._id ? updatedPost : p)),
    );

    setSelectedPost((prevSelected) => {
      if (prevSelected && prevSelected._id === updatedPost._id) {
        return updatedPost;
      }
      return prevSelected;
    });
  };

  const handleOpenModal = (post, focusComment = false) => {
    setSelectedPost(post);
    setAutoFocusComment(focusComment);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setAutoFocusComment(false);
  };

  if (loading) {
    return <div className={styles.centered}>Exploring new ideas...</div>;
  }

  return (
    <div className={styles.exploreContainer}>
      {posts.length > 0 ? (
        <div className={styles.postsGrid}>
          {posts.map((post) => (
            <div
              key={post._id}
              className={styles.gridItem}
              onClick={() => handleOpenModal(post)}
            >
              <img
                src={
                  post.url
                    ? post.url.startsWith("http")
                      ? post.url
                      : `${API.defaults.baseURL}/${post.url.replace(/^\//, "")}`
                    : `https://picsum.photos/seed/${post._id}/500/500`
                }
                alt={post.caption || "Explore publication"}
                className={styles.postImage}
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://placehold.co/500x500/e2e8f0/64748b?text=No+Image";
                }}
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
                  <span>{post.likes?.length || 0}</span>
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
          ))}
        </div>
      ) : (
        <div className={styles.emptyGridWrapper}>
          <div className={styles.noPostsContainer}>
            <div className={styles.cameraIconWrapper}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <h2 className={styles.noPostsTitle}>No posts discovered yet</h2>
            <p className={styles.noPostsSubtitle}>
              Check back later! Fresh content from around the globe will appear
              here.
            </p>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostModal
          post={posts.find((p) => p._id === selectedPost._id) || selectedPost}
          onClose={handleCloseModal}
          autoFocusComment={autoFocusComment}
          onPostUpdate={handlePostUpdate}
          currentUserFollowing={currentUserFollowing}
          onFollowToggle={handleFollowToggle}
        />
      )}
    </div>
  );
};

export default ExplorePage;
