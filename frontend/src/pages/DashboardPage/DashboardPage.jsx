import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import API from "../../api/axios";
import PostModal from "../../components/PostModal/PostModal";
import PostCard from "../../components/PostCard/PostCard";
import FeedFilterPill from "../../components/FeedFilterPill/FeedFilterPill";
import Logo from "../../components/Logo/Logo";
import styles from "./DashboardPage.module.css";
import { useSocket } from "../../context/useSocket";

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
        You&apos;ve explored all the recent moments from creators you follow.
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

const DashboardPage = () => {
  const { isDisconnected } = useSocket() || {};

  const [posts, setPosts] = useState(() => {
    const cached = sessionStorage.getItem("dashboard_posts_cache");
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => posts.length === 0);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");
  const [exploreHiddenUserIds, setExploreHiddenUserIds] = useState(new Set());
  const [autoFocusComment, setAutoFocusComment] = useState(false);

  const token = localStorage.getItem("token");

  const getLoggedInData = useCallback(() => {
    if (!token) return { userId: null, username: null };
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        userId: payload.userId || payload.id || payload._id,
        username: payload.username,
      };
    } catch (error) {
      console.error("Token decoding error", error);
      return { userId: null, username: null };
    }
  }, [token]);

  const { userId: currentUserId } = getLoggedInData();

  const fetchFeedData = useCallback(
    async (isShuffleRequired = false) => {
      if (!token) return;

      try {
        if (isShuffleRequired || posts.length === 0) {
          setLoading(true);
        }

        const [postsRes, profileRes] = await Promise.all([
          API.get("/api/posts"),
          API.get("/api/users/profile"),
        ]);

        setPosts((prevPosts) => {
          let updatedList;
          if (!isShuffleRequired && prevPosts.length > 0) {
            const fetchedPostsMap = new Map(
              postsRes.data.map((p) => [p._id, p]),
            );
            const updatedExistingPosts = prevPosts.map(
              (oldPost) => fetchedPostsMap.get(oldPost._id) || oldPost,
            );

            const existingIds = new Set(prevPosts.map((p) => p._id));
            const newPosts = postsRes.data.filter(
              (p) => !existingIds.has(p._id),
            );

            updatedList = [...newPosts, ...updatedExistingPosts];
          } else {
            updatedList = shuffleArray(postsRes.data);
          }

          sessionStorage.setItem(
            "dashboard_posts_cache",
            JSON.stringify(updatedList),
          );
          return updatedList;
        });

        const followingIds =
          profileRes.data.following
            ?.map((f) => {
              const id = typeof f === "string" ? f : f._id || f.id;
              return id ? id.toString() : "";
            })
            .filter(Boolean) || [];

        setCurrentUserFollowing(followingIds);
        setExploreHiddenUserIds(new Set(followingIds));
      } catch (error) {
        console.error("Error loading feed data:", error);
      } finally {
        setLoading(false);
      }
    },
    [token, posts.length],
  );

  const prevDisconnectedRef = useRef(null);

  useEffect(() => {
    if (prevDisconnectedRef.current === true && isDisconnected === false) {
      fetchFeedData(false);
    }
    prevDisconnectedRef.current = isDisconnected;
  }, [isDisconnected, fetchFeedData]);

  const hasInitialLoadedRef = useRef(false);

  useEffect(() => {
    if (token && !hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      fetchFeedData(false);
    }
  }, [token, fetchFeedData]);

  const handlePostUpdate = useCallback((updatedPost) => {
    setPosts((prevPosts) => {
      const updated = prevPosts.map((p) =>
        p._id === updatedPost._id ? updatedPost : p,
      );
      sessionStorage.setItem("dashboard_posts_cache", JSON.stringify(updated));
      return updated;
    });

    setSelectedPost((prevSelected) => {
      if (prevSelected && prevSelected._id === updatedPost._id) {
        return updatedPost;
      }
      return prevSelected;
    });
  }, []);

  const handlePostCreated = useCallback((newPost) => {
    setPosts((prevPosts) => {
      if (prevPosts.some((p) => p._id === newPost._id)) return prevPosts;
      const updated = [newPost, ...prevPosts];
      sessionStorage.setItem("dashboard_posts_cache", JSON.stringify(updated));
      return updated;
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
      sessionStorage.setItem("dashboard_posts_cache", JSON.stringify(updated));
      return updated;
    });

    setSelectedPost((prev) =>
      prev && prev._id.toString() === targetIdStr ? null : prev,
    );
  }, []);

  useEffect(() => {
    const handleGlobalPostUpdate = (event) => {
      if (event.detail) handlePostUpdate(event.detail);
    };

    const handleGlobalPostCreated = (event) => {
      if (event.detail) handlePostCreated(event.detail);
    };

    const handleGlobalPostDelete = (event) => {
      if (event.detail) handlePostDeleted(event.detail);
    };

    window.addEventListener("postUpdated", handleGlobalPostUpdate);
    window.addEventListener("postCreated", handleGlobalPostCreated);
    window.addEventListener("postDeleted", handleGlobalPostDelete);

    return () => {
      window.removeEventListener("postUpdated", handleGlobalPostUpdate);
      window.removeEventListener("postCreated", handleGlobalPostCreated);
      window.removeEventListener("postDeleted", handleGlobalPostDelete);
    };
  }, [handlePostUpdate, handlePostCreated, handlePostDeleted]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
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
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        if (token) {
          fetchFeedData(true);
        }
      }
    };

    window.addEventListener("refreshDashboard", handleRefresh);

    return () => {
      window.removeEventListener("refreshDashboard", handleRefresh);
    };
  }, [fetchFeedData, token, scrollToTop]);

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);

    if (newFilter === "discover") {
      setExploreHiddenUserIds(new Set(currentUserFollowing));
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const response = await API.post(`/api/users/${targetUserId}/follow`, {});

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

      setPosts((prevPosts) => {
        const updated = prevPosts.map((p) => {
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
        });

        sessionStorage.setItem(
          "dashboard_posts_cache",
          JSON.stringify(updated),
        );
        return updated;
      });
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

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

  const handleCloseModal = () => {
    setSelectedPost(null);
    setAutoFocusComment(false);
  };

  const handleLogoClick = () => {
    scrollToTop();
    const mainContent =
      document.querySelector(".app-content") || document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
    fetchFeedData(true);
  };

  const filteredPosts = posts.filter((post) => {
    const postAuthorId = post.user?._id || post.user?.id || post.user;
    if (!postAuthorId) return true;

    const authorIdStr = postAuthorId.toString();
    const isMe = authorIdStr === currentUserId?.toString();

    if (activeFilter === "following") {
      return currentUserFollowing.includes(authorIdStr);
    }

    if (activeFilter === "discover") {
      if (isMe) return false;
      return !exploreHiddenUserIds.has(authorIdStr);
    }

    return true;
  });

  return (
    <div className={styles.container}>
      <header className={styles.mobileHeader}>
        <Logo
          size="small"
          onClick={handleLogoClick}
          className={styles.mobileHeaderLogo}
        />
      </header>

      <FeedFilterPill
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {loading && posts.length === 0 ? (
        <div className={styles.feedList}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className={styles.skeletonLeftSection}>
                <div className={styles.skeletonHeader}>
                  <div
                    className={`${styles.skeletonAvatar} ${styles.skeletonShimmer}`}
                  />
                  <div className={styles.skeletonHeaderMeta}>
                    <div
                      className={`${styles.skeletonUsername} ${styles.skeletonShimmer}`}
                    />
                    <div
                      className={`${styles.skeletonTime} ${styles.skeletonShimmer}`}
                    />
                  </div>
                </div>

                <div
                  className={`${styles.skeletonImage} ${styles.skeletonShimmer}`}
                />

                <div className={styles.skeletonFooter}>
                  <div className={styles.skeletonActions}>
                    <div
                      className={`${styles.skeletonIcon} ${styles.skeletonShimmer}`}
                    />
                    <div
                      className={`${styles.skeletonIcon} ${styles.skeletonShimmer}`}
                    />
                  </div>
                  <div
                    className={`${styles.skeletonLine} ${styles.skeletonLineShort} ${styles.skeletonShimmer}`}
                  />
                  <div
                    className={`${styles.skeletonLine} ${styles.skeletonLineMedium} ${styles.skeletonShimmer}`}
                  />
                </div>
              </div>

              <div className={styles.skeletonRightSection}>
                <div className={styles.skeletonAuthorCaptionBox}>
                  <div
                    className={`${styles.skeletonAvatarSmall} ${styles.skeletonShimmer}`}
                  />
                  <div className={styles.skeletonCaptionLines}>
                    <div
                      className={`${styles.skeletonLine} ${styles.skeletonLineMedium} ${styles.skeletonShimmer}`}
                    />
                    <div
                      className={`${styles.skeletonLine} ${styles.skeletonLineLong} ${styles.skeletonShimmer}`}
                    />
                  </div>
                </div>

                <div className={styles.skeletonCommentsList}>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={styles.skeletonCommentItem}>
                      <div
                        className={`${styles.skeletonAvatarSmall} ${styles.skeletonShimmer}`}
                      />
                      <div className={styles.skeletonCommentLines}>
                        <div
                          className={`${styles.skeletonLine} ${styles.skeletonLineShort} ${styles.skeletonShimmer}`}
                        />
                        <div
                          className={`${styles.skeletonLine} ${styles.skeletonLineMedium} ${styles.skeletonShimmer}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={`${styles.skeletonQuickInput} ${styles.skeletonShimmer}`}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.feedList}>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <PostCard
                key={post._id}
                post={post}
                index={index}
                currentUserId={currentUserId}
                currentUserFollowing={currentUserFollowing}
                onFollowToggle={handleFollowToggle}
                onOpenModal={(p, focus) => handleOpenModal(p, focus)}
                onPostUpdate={handlePostUpdate}
              />
            ))
          ) : (
            <div className={styles.emptyFeedContainer}>
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
                  <h3 className={styles.emptyFeedTitle}>
                    No posts from following
                  </h3>
                  <p className={styles.emptyFeedSubtitle}>
                    You are not following anyone yet, or creators you follow
                    haven&apos;t shared any moments.
                  </p>
                  <button
                    type="button"
                    className={styles.emptyFeedActionBtn}
                    onClick={() => handleFilterChange("discover")}
                  >
                    <span>Explore New Creators</span>
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
                    There are no new unique creators to discover right now.
                  </p>
                  <button
                    type="button"
                    className={styles.emptyFeedActionBtn}
                    onClick={() => handleFilterChange("all")}
                  >
                    <span>Back to All Feed</span>
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
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <h3 className={styles.emptyFeedTitle}>No posts to show</h3>
                  <p className={styles.emptyFeedSubtitle}>
                    Be the first one to share a photo with the community!
                  </p>
                </div>
              )}
            </div>
          )}

          {filteredPosts.length > 0 && (
            <AllCaughtUpCard onScrollToTop={scrollToTop} />
          )}
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

export default DashboardPage;
