import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import Avatar from "../Avatar/Avatar";
import styles from "./PostCard.module.css";

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return "just now";
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min.`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return diffInHours === 1 ? "1 hour" : `${diffInHours} hours`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return diffInDays === 1 ? "1 day" : `${diffInDays} days`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4)
    return diffInWeeks === 1 ? "1 week" : `${diffInWeeks} weeks`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12)
    return diffInMonths === 1 ? "1 month" : `${diffInMonths} months`;
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 year" : `${diffInYears} years`;
};

const PostCard = ({
  post,
  currentUserId,
  currentUsername,
  onOpenModal,
  onFollowToggle,
  currentUserFollowing,
  onPostUpdate,
}) => {
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const clickTimerRef = useRef(null);

  const [prevPostId, setPrevPostId] = useState(post._id);
  const [localLike, setLocalLike] = useState(null);

  if (post._id !== prevPostId) {
    setPrevPostId(post._id);
    setLocalLike(null);
  }

  const captionText = post.caption || "";
  const CAPTION_LIMIT = 70;
  const isLongCaption = captionText.length > CAPTION_LIMIT;

  const authorId = post?.user?._id || post?.user?.id || post?.user;
  const authorUsername = post?.user?.username || "user";
  const authorUser = post.user || {
    username: authorUsername,
    avatar: post.user?.avatar,
  };

  const initialIsLiked =
    post && currentUserId && post.likes
      ? post.likes.some((like) => {
          const id = typeof like === "string" ? like : like._id || like.id;
          return id === currentUserId;
        })
      : false;

  const isLiked =
    localLike === "liked"
      ? true
      : localLike === "unliked"
        ? false
        : initialIsLiked;

  const serverLikesCount =
    post?.likesCount !== undefined ? post.likesCount : post?.likes?.length || 0;

  let likesCount = serverLikesCount;
  if (localLike === "liked" && !initialIsLiked) {
    likesCount = serverLikesCount + 1;
  } else if (localLike === "unliked" && initialIsLiked) {
    likesCount = Math.max(0, serverLikesCount - 1);
  }

  let isFollowing = false;
  if (post && authorId) {
    if (currentUserFollowing) {
      isFollowing = currentUserFollowing.includes(authorId.toString());
    } else if (post.user && post.user.followers) {
      isFollowing = post.user.followers.some((fId) => {
        const id = typeof fId === "string" ? fId : fId._id || fId.id;
        return id === currentUserId;
      });
    } else {
      isFollowing = post.isFollowingAuthor || false;
    }
  }

  const isAuthor =
    currentUserId &&
    authorId &&
    authorId.toString() === currentUserId.toString();

  const toggleLikeApiCall = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const previousLocalLike = localLike;
    const newLocalLike = isLiked ? "unliked" : "liked";
    setLocalLike(newLocalLike);

    try {
      const token = localStorage.getItem("token");

      const response = await API.put(
        `/api/posts/${post._id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data && typeof onPostUpdate === "function") {
        onPostUpdate(response.data);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setLocalLike(previousLocalLike);
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikeToggle = (e) => {
    e.stopPropagation();
    toggleLikeApiCall();
  };

  const handleImageClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);

      if (!isLiked) {
        toggleLikeApiCall();
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        onOpenModal(post, false);
        clickTimerRef.current = null;
      }, 250);
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleFollowClick = async (e) => {
    e.stopPropagation();
    if (!onFollowToggle || !authorId || isFollowLoading) return;

    setIsFollowLoading(true);
    try {
      await onFollowToggle(authorId.toString());
    } catch (err) {
      console.error("Error toggling follow in card:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    if (typeof onOpenModal === "function") {
      onOpenModal(post, true);
    }
  };

  const getProfileLink = (username) => {
    if (
      currentUsername &&
      currentUsername.toLowerCase() === username.toLowerCase()
    ) {
      return "/profile";
    }
    return `/user/${username}`;
  };

  const handleCaptionClick = (e) => {
    e.stopPropagation();
    if (isLongCaption && isCaptionExpanded) {
      setIsCaptionExpanded(false);
    }
  };

  return (
    <article className={styles.postCard}>
      <header className={styles.header} onClick={(e) => e.stopPropagation()}>
        <div className={styles.userInfo}>
          <div>
            <Link to={getProfileLink(authorUsername)}>
              <Avatar user={authorUser} size={32} />
            </Link>
          </div>
          <div className={styles.userMeta}>
            <div>
              <Link
                to={getProfileLink(authorUsername)}
                className={styles.username}
              >
                {authorUsername}
              </Link>
            </div>
            <span className={styles.dot}>•</span>
            <span className={styles.time}>{formatTimeAgo(post.createdAt)}</span>

            {!isAuthor && (
              <>
                <span className={styles.dot}>•</span>
                <button
                  className={`${styles.followBtn} ${isFollowing ? styles.following : styles.follow}`}
                  onClick={handleFollowClick}
                  disabled={isFollowLoading}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        className={styles.imageContainer}
        onClick={handleImageClick}
        style={{ cursor: "pointer", position: "relative" }}
      >
        <img src={post.url} alt="Post content" className={styles.postImg} />

        {showHeartAnim && (
          <div className={styles.heartOverlay}>
            <svg viewBox="0 0 24 24" className={styles.animatedHeart}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}
      </div>

      <div
        className={styles.interactionArea}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.actionsRow}>
          <button className={styles.actionBtn} onClick={handleLikeToggle}>
            <svg
              aria-label="Like"
              height="24"
              viewBox="0 0 24 24"
              width="24"
              className={isLiked ? styles.likedHeart : styles.unlikedHeart}
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
          </button>

          <button className={styles.actionBtn} onClick={handleCommentClick}>
            <svg
              aria-label="Comment"
              height="24"
              viewBox="0 0 24 24"
              width="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </button>
        </div>

        <div className={styles.likesCount}>
          {likesCount.toLocaleString()} likes
        </div>

        {post.caption && (
          <div
            className={styles.captionSection}
            onClick={handleCaptionClick}
            style={{
              cursor:
                isLongCaption && isCaptionExpanded ? "pointer" : "default",
            }}
          >
            <span>
              <Link
                to={getProfileLink(authorUsername)}
                className={styles.captionUsername}
              >
                {authorUsername}
              </Link>
            </span>{" "}
            <span className={styles.captionText}>
              {isLongCaption && !isCaptionExpanded
                ? `${captionText.slice(0, CAPTION_LIMIT)}...`
                : captionText}

              {isLongCaption && !isCaptionExpanded && (
                <button
                  className={styles.moreButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCaptionExpanded(true);
                  }}
                >
                  more
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export default PostCard;
