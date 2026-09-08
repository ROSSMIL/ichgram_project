import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import PostModal from "../../components/PostModal/PostModal";
import PostCard from "../../components/PostCard/PostCard";
import FeedFilterPill from "../../components/FeedFilterPill/FeedFilterPill";
import styles from "./DashboardPage.module.css";
import logoImg from "../../assets/logo.png";

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

      <button className={styles.caughtUpScrollBtn} onClick={onScrollToTop}>
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
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  const [activeFilter, setActiveFilter] = useState("all");

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [autoFocusComment, setAutoFocusComment] = useState(false);

  const token = localStorage.getItem("token");

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getLoggedInData = () => {
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
  };

  const { userId: currentUserId } = getLoggedInData();

  const fetchFeedData = useCallback(
    async (isRefreshing = false) => {
      try {
        if (!isRefreshing) {
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
        console.error("Error loading feed data:", error);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        fetchFeedData();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [fetchFeedData, token]);

  useEffect(() => {
    const handleRefresh = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (token) {
        fetchFeedData(true);
      }
    };

    window.addEventListener("refreshDashboard", handleRefresh);

    return () => {
      window.removeEventListener("refreshDashboard", handleRefresh);
    };
  }, [fetchFeedData, token]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      alert("Could not update follow status.");
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
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      navigate(`/post/${post._id}${focusComment ? "?focus=true" : ""}`);
    } else {
      setSelectedPost(post);
      setAutoFocusComment(focusComment);
    }
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setAutoFocusComment(false);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchFeedData(true);
  };

  const filteredPosts = posts.filter((post) => {
    const postAuthorId = post.user?._id || post.user?.id || post.user;
    if (!postAuthorId) return true;

    const authorIdStr = postAuthorId.toString();

    const isFollowingOrMe =
      authorIdStr === currentUserId?.toString() ||
      currentUserFollowing.includes(authorIdStr);

    if (activeFilter === "following") {
      return isFollowingOrMe;
    }

    if (activeFilter === "discover") {
      return !isFollowingOrMe;
    }

    return true;
  });

  return (
    <div className={styles.container}>
      <FeedFilterPill
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <header className={styles.mobileHeader}>
        <img
          src={logoImg}
          alt="ICHGRAM"
          className={styles.mobileLogo}
          onClick={handleLogoClick}
        />
      </header>

      {loading ? (
        <div className={styles.feedList}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`${styles.skeletonCard} ${styles.skeletonPulse}`}
            >
              <div className={styles.skeletonHeader}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonUsername} />
              </div>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonFooter}>
                <div
                  className={`${styles.skeletonLine} ${styles.skeletonLineShort}`}
                />
                <div
                  className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`}
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
            <div className={styles.emptyFeed}>
              <h2>No posts to show</h2>
              <p>
                {activeFilter === "following"
                  ? "No posts from accounts you follow yet."
                  : activeFilter === "discover"
                    ? "No new creators to explore right now."
                    : "Follow some creators or upload your first photo!"}
              </p>
            </div>
          )}

          {filteredPosts.length > 0 && (
            <AllCaughtUpCard onScrollToTop={scrollToTop} />
          )}
        </div>
      )}

      {createPortal(
        <button
          className={`${styles.scrollTopBtn} ${
            showScrollTop ? styles.showScrollBtn : ""
          }`}
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>,
        document.body,
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
