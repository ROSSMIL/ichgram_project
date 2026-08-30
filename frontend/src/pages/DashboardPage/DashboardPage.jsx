import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import PostModal from "../../components/PostModal/PostModal";
import PostCard from "../../components/PostCard/PostCard";
import styles from "./DashboardPage.module.css";
import logoImg from "../../assets/logo.png";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

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

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.mobileHeader}>
          <img
            src={logoImg}
            alt="ICHGRAM"
            className={styles.mobileLogo}
            onClick={handleLogoClick}
          />
        </header>

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
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.mobileHeader}>
        <img
          src={logoImg}
          alt="ICHGRAM"
          className={styles.mobileLogo}
          onClick={handleLogoClick}
        />
      </header>

      <div className={styles.feedList}>
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
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
            <p>Follow some creators or upload your first photo!</p>
          </div>
        )}

        {posts.length > 0 && (
          <div className={styles.allCaughtUp}>
            <div className={styles.checkmarkCircle}>
              <svg viewBox="0 0 24 24" className={styles.checkmarkIcon}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={styles.caughtUpTitle}>
              You've seen all the updates
            </h3>
            <p className={styles.caughtUpSubtitle}>
              You have viewed all new publications
            </p>
          </div>
        )}
      </div>

      {createPortal(
        <button
          className={`${styles.scrollTopBtn} ${showScrollTop ? styles.showScrollBtn : ""}`}
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
