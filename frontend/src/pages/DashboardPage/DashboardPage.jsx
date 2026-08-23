import { useState, useEffect, useCallback } from "react";
import API from "../../api/axios";
import PostModal from "../../components/PostModal/PostModal";
import PostCard from "../../components/PostCard/PostCard";
import styles from "./DashboardPage.module.css";

const DashboardPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

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

        console.log("Response from /profile:", profileRes.data);

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
    setSelectedPost(post);
    setAutoFocusComment(focusComment);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
    setAutoFocusComment(false);
  };

  if (loading) {
    return <div className={styles.centered}>Loading feed...</div>;
  }

  return (
    <div className={styles.container}>
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
