import { useState, useEffect, useCallback, useRef, memo } from "react";
import PropTypes from "prop-types";
import API from "../../api/axios";
import FeedFilterPill from "../../components/FeedFilterPill/FeedFilterPill";
import styles from "./ExplorePage.module.css";

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const AllCaughtUpCard = ({ onScrollToTop }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const currentCard = cardRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (currentCard) observer.unobserve(currentCard);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    if (currentCard) {
      observer.observe(currentCard);
    }

    return () => {
      if (currentCard) observer.unobserve(currentCard);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`${styles.allCaughtUp} ${
        isVisible ? styles.caughtUpVisible : ""
      }`}
    >
      <div className={styles.caughtUpHeader}>
        <div className={styles.sparkleIconWrapper}>
          <svg
            viewBox="0 0 24 24"
            className={styles.sparkleIcon}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        </div>
        <h3 className={styles.caughtUpTitle}>You’re All Caught Up</h3>
      </div>

      <p className={styles.caughtUpSubtitle}>
        You&apos;ve explored all available posts from the community.
      </p>

      <button
        type="button"
        className={styles.caughtUpScrollBtn}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onScrollToTop();
        }}
      >
        <span>Back to top</span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.arrowIcon}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
};

AllCaughtUpCard.propTypes = {
  onScrollToTop: PropTypes.func.isRequired,
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
  const [posts, setPosts] = useState(() => {
    const cached = sessionStorage.getItem("explore_posts_cache");
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => posts.length === 0);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

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
    async (forceRefresh = false) => {
      try {
        if (forceRefresh || posts.length === 0) {
          setLoading(true);
        }

        const [postsRes, profileRes] = await Promise.all([
          API.get("/api/posts", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          API.get("/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (forceRefresh) {
          const randomizedPosts = shuffleArray(postsRes.data);
          setPosts(randomizedPosts);
          sessionStorage.setItem(
            "explore_posts_cache",
            JSON.stringify(randomizedPosts),
          );
        } else {
          setPosts((prevPosts) => {
            if (prevPosts.length === 0) {
              const randomizedPosts = shuffleArray(postsRes.data);
              sessionStorage.setItem(
                "explore_posts_cache",
                JSON.stringify(randomizedPosts),
              );
              return randomizedPosts;
            }

            const fetchedPostsMap = new Map(
              postsRes.data.map((p) => [p._id, p]),
            );
            const updatedPosts = prevPosts
              .filter((p) => fetchedPostsMap.has(p._id))
              .map((p) => fetchedPostsMap.get(p._id));

            sessionStorage.setItem(
              "explore_posts_cache",
              JSON.stringify(updatedPosts),
            );
            return updatedPosts;
          });
        }

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
    [token, posts.length],
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (token && isMounted) {
        await fetchExploreData(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchExploreData, token]);

  const handlePostCreated = useCallback((newPost) => {
    if (!newPost || !newPost._id) return;

    setPosts((prevPosts) => {
      if (prevPosts.some((p) => p._id === newPost._id)) {
        return prevPosts;
      }
      const updated = [newPost, ...prevPosts];
      sessionStorage.setItem("explore_posts_cache", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prevPosts) => {
      const newPosts = prevPosts.map((p) =>
        p._id === updatedPost._id ? updatedPost : p,
      );
      sessionStorage.setItem("explore_posts_cache", JSON.stringify(newPosts));
      return newPosts;
    });
  }, []);

  const handlePostDeleted = useCallback((deletedPayload) => {
    let targetId = deletedPayload;

    if (deletedPayload && typeof deletedPayload === "object") {
      targetId =
        deletedPayload._id ||
        deletedPayload.id ||
        deletedPayload.postId ||
        (deletedPayload.detail &&
          (deletedPayload.detail._id ||
            deletedPayload.detail.id ||
            deletedPayload.detail.postId));
    }

    if (!targetId) return;

    const targetIdStr = targetId.toString();

    setPosts((prevPosts) => {
      const updated = prevPosts.filter((p) => p._id.toString() !== targetIdStr);
      sessionStorage.setItem("explore_posts_cache", JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    const handleGlobalPostCreated = (event) => {
      if (event.detail) {
        handlePostCreated(event.detail);
      }
    };

    const handleGlobalPostUpdate = (event) => {
      if (event.detail) {
        handlePostUpdate(event.detail);
      }
    };

    const handleGlobalPostDelete = (event) => {
      if (event.detail) {
        handlePostDeleted(event.detail);
      }
    };

    window.addEventListener("postCreated", handleGlobalPostCreated);
    window.addEventListener("postUpdated", handleGlobalPostUpdate);
    window.addEventListener("postDeleted", handleGlobalPostDelete);

    return () => {
      window.removeEventListener("postCreated", handleGlobalPostCreated);
      window.removeEventListener("postUpdated", handleGlobalPostUpdate);
      window.removeEventListener("postDeleted", handleGlobalPostDelete);
    };
  }, [handlePostCreated, handlePostUpdate, handlePostDeleted]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    const mainContent =
      document.querySelector(".app-content") || document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      const mainContent =
        document.querySelector(".app-content") ||
        document.querySelector("main");

      const mainScroll = mainContent ? mainContent.scrollTop : 0;
      const winScroll =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop;

      const isAtTop = mainScroll <= 5 && winScroll <= 5;

      if (!isAtTop) {
        scrollToTop();
      } else {
        if (token) {
          setPosts([]);
          sessionStorage.removeItem("explore_posts_cache");
          fetchExploreData(true);
        }
      }
    };

    window.addEventListener("refreshExplore", handleRefresh);

    return () => {
      window.removeEventListener("refreshExplore", handleRefresh);
    };
  }, [fetchExploreData, token, scrollToTop]);
  useEffect(() => {
    const handleUserFollowToggled = (e) => {
      const { targetUserId, isFollowing } = e.detail || {};
      if (!targetUserId) return;
      const target = String(targetUserId);

      setCurrentUserFollowing((prev) =>
        isFollowing
          ? prev.includes(target)
            ? prev
            : [...prev, target]
          : prev.filter((id) => id !== target),
      );
    };

    window.addEventListener("userFollowToggled", handleUserFollowToggled);
    return () =>
      window.removeEventListener("userFollowToggled", handleUserFollowToggled);
  }, []);
  const handleOpenModal = useCallback((post, focusComment = false) => {
    window.dispatchEvent(
      new CustomEvent("openPostModal", {
        detail: {
          postId: post._id || post.id,
          post: post,
          focusComment: focusComment,
        },
      }),
    );
  }, []);

  const filteredPosts = posts.filter((post) => {
    const postAuthorId = post.user?._id || post.user?.id || post.user;
    if (!postAuthorId) return true;

    const authorIdStr = postAuthorId.toString();
    const isMe = authorIdStr === currentUserId?.toString();
    const isFollowing = currentUserFollowing.includes(authorIdStr);

    if (activeFilter === "following") {
      return isFollowing;
    }

    if (activeFilter === "discover") {
      return !isMe && !isFollowing;
    }

    return true;
  });

  return (
    <div className={styles.exploreContainer}>
      <FeedFilterPill
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {loading && posts.length === 0 ? (
        <div className={styles.postsGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <div
              key={n}
              className={`${styles.skeletonGridItem} ${styles.skeletonShimmer}`}
            />
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <>
          <div className={styles.postsGrid}>
            {filteredPosts.map((post, idx) => (
              <ExploreItem
                key={post._id}
                post={post}
                index={idx}
                onOpenModal={handleOpenModal}
              />
            ))}
          </div>

          <AllCaughtUpCard onScrollToTop={scrollToTop} />
        </>
      ) : (
        <div className={styles.emptyGridWrapper}>
          {activeFilter === "following" && (
            <div className={styles.emptyFeedCard}>
              <div className={styles.emptyFeedIconWrapper}>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <h3 className={styles.emptyFeedTitle}>No posts from following</h3>
              <p className={styles.emptyFeedSubtitle}>
                You aren&apos;t following anyone with published posts yet, or
                their posts are not available.
              </p>
              <button
                type="button"
                className={styles.emptyFeedActionBtn}
                onClick={() => setActiveFilter("discover")}
              >
                <span>Discover New Creators</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}

          {activeFilter === "discover" && (
            <div className={styles.emptyFeedCard}>
              <div className={styles.emptyFeedIconWrapper}>
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
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3 className={styles.emptyFeedTitle}>
                You&apos;ve explored everything
              </h3>
              <p className={styles.emptyFeedSubtitle}>
                There are no new unique posts or creators to discover right now.
                Check back soon!
              </p>
              <button
                type="button"
                className={styles.emptyFeedActionBtn}
                onClick={() => setActiveFilter("all")}
              >
                <span>Back to All Explore</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}

          {activeFilter === "all" && (
            <div className={styles.emptyFeedCard}>
              <div className={styles.emptyFeedIconWrapper}>
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
              <h3 className={styles.emptyFeedTitle}>No posts discovered yet</h3>
              <p className={styles.emptyFeedSubtitle}>
                Be the first one to share a moment with the entire community!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
