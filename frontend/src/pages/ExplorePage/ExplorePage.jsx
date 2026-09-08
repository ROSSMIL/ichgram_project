import { useState, useEffect, useCallback, useRef, memo } from "react";
import PropTypes from "prop-types";
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

const ExploreItem = memo(({ post, index, onOpenModal }) => {
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
      onClick={() => onOpenModal(post)}
    >
      <div className={styles.floatWrapper}>
        <img
          src={imageUrl}
          alt={post.caption || "Explore publication"}
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

ExploreItem.displayName = "ExploreItem";

ExploreItem.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    url: PropTypes.string,
    caption: PropTypes.string,
    likesCount: PropTypes.number,
    likes: PropTypes.array,
    comments: PropTypes.array,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onOpenModal: PropTypes.func.isRequired,
};

const ExplorePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [autoFocusComment, setAutoFocusComment] = useState(false);

  const token = localStorage.getItem("token");

  const getLoggedInData = useCallback(() => {
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
  }, [token]);

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

  const handleFollowToggle = useCallback(
    async (targetUserId) => {
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
                                typeof fId === "string"
                                  ? fId
                                  : fId._id || fId.id;
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
    },
    [token, currentUserFollowing, currentUserId],
  );

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p._id === updatedPost._id ? updatedPost : p)),
    );

    setSelectedPost((prevSelected) => {
      if (prevSelected && prevSelected._id === updatedPost._id) {
        return updatedPost;
      }
      return prevSelected;
    });
  }, []);

  const handleOpenModal = useCallback((post, focusComment = false) => {
    setSelectedPost(post);
    setAutoFocusComment(focusComment);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedPost(null);
    setAutoFocusComment(false);
  }, []);

  if (loading) {
    return (
      <div className={styles.exploreContainer}>
        <div className={styles.postsGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <div
              key={n}
              className={`${styles.skeletonGridItem} ${styles.skeletonShimmer}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.exploreContainer}>
      {posts.length > 0 ? (
        <div className={styles.postsGrid}>
          {posts.map((post, idx) => (
            <ExploreItem
              key={post._id}
              post={post}
              index={idx}
              onOpenModal={handleOpenModal}
            />
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
