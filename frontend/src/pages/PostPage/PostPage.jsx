import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import API from "../../api/axios";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./PostPage.module.css";

const safeSlice = (str, maxLen = 150) => {
  if (str.length <= maxLen) return str;

  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    let result = "";
    for (const segment of segmenter.segment(str)) {
      if ((result + segment.segment).length > maxLen) break;
      result += segment.segment;
    }
    return result;
  }

  return Array.from(str).slice(0, maxLen).join("");
};

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

const isPostEdited = (post) => {
  return Boolean(post?.isEdited);
};

const checkIsLiked = (postObj, userId) => {
  if (!postObj || !userId || !postObj.likes) return false;
  return postObj.likes.some((like) => {
    if (typeof like === "string") return like === userId;
    return (like._id || like.id) === userId;
  });
};

const PostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const autoFocusComment =
    queryParams.get("focus") === "true" ||
    queryParams.get("autoFocus") === "true" ||
    location.state?.autoFocusComment;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [animateHeart, setAnimateHeart] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);

  const [showMenu, setShowMenu] = useState(false);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState(null);

  const emojiPickerRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentsAreaRef = useRef(null);
  const likeBtnRef = useRef(null);
  const clickTimerRef = useRef(null);
  const postMenuRef = useRef(null);

  function getLoggedInUsername() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username;
    } catch {
      return null;
    }
  }

  function getLoggedInUserId() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.userId || payload.id || payload._id;
    } catch {
      return null;
    }
  }

  const currentUserId = getLoggedInUserId();
  const currentUsername = getLoggedInUsername();

  const scrollToBottom = useCallback(() => {
    if (commentsAreaRef.current) {
      commentsAreaRef.current.scrollTop = commentsAreaRef.current.scrollHeight;
    }
  }, []);

  const handleFocusCommentInput = useCallback(() => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
    setTimeout(scrollToBottom, 300);
  }, [scrollToBottom]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await API.get(`/api/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetchedPost = res.data;
        setPost(fetchedPost);
        setComments(fetchedPost.comments || []);
        setLikesCount(
          fetchedPost.likesCount !== undefined
            ? fetchedPost.likesCount
            : fetchedPost.likes?.length || 0,
        );
        setIsLiked(checkIsLiked(fetchedPost, currentUserId));
      } catch (err) {
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPost();
  }, [id, currentUserId]);

  useLayoutEffect(() => {
    if (autoFocusComment) {
      const tryFocus = () => {
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      };

      tryFocus();
      const t1 = setTimeout(tryFocus, 50);
      const t2 = setTimeout(tryFocus, 150);
      const t3 = setTimeout(tryFocus, 300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [autoFocusComment]);

  useLayoutEffect(() => {
    if (post) {
      scrollToBottom();
    }
  }, [post, comments.length, scrollToBottom]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (postMenuRef.current && !postMenuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (!event.target.closest(`.${styles.commentMenuWrapper}`)) {
        setActiveCommentMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerHapticFeedback = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  const toggleLikeApiCall = async () => {
    if (isLiking || !post) return;
    setIsLiking(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    if (nextLikedState) {
      triggerHapticFeedback();
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 500);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await API.put(
        `/api/posts/${post._id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data) {
        setLikesCount(response.data.likes?.length || 0);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleLikeToggle = () => {
    toggleLikeApiCall();
  };

  const handleImageClick = (e) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      const imgRect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - imgRect.left;
      const clickY = e.clientY - imgRect.top;

      const heartId = Date.now() + Math.random();
      const isFirstLike = !isLiked;

      let flyDeltaX = 0;
      let flyDeltaY = 0;

      if (isFirstLike && likeBtnRef.current) {
        const btnRect = likeBtnRef.current.getBoundingClientRect();
        const targetX = btnRect.left + btnRect.width / 2 - imgRect.left;
        const targetY = btnRect.top + btnRect.height / 2 - imgRect.top;

        flyDeltaX = targetX - clickX;
        flyDeltaY = targetY - clickY;
      }

      const randomRotation = isFirstLike
        ? 0
        : Math.floor(Math.random() * 30) - 15;

      const newHeart = {
        id: heartId,
        x: (clickX / imgRect.width) * 100,
        y: (clickY / imgRect.height) * 100,
        rotate: randomRotation,
        isFlying: isFirstLike,
        flyX: `${flyDeltaX}px`,
        flyY: `${flyDeltaY}px`,
      };

      setFloatingHearts((prev) => [...prev, newHeart]);
      triggerHapticFeedback();

      if (isFirstLike) {
        setTimeout(() => {
          toggleLikeApiCall();
        }, 550);

        setTimeout(() => {
          setFloatingHearts((prev) =>
            prev.filter((item) => item.id !== heartId),
          );
        }, 650);
      } else {
        setTimeout(() => {
          setFloatingHearts((prev) =>
            prev.filter((item) => item.id !== heartId),
          );
        }, 1200);
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const response = await API.post(
        `/api/posts/${post._id}/comment`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setComments(response.data.comments);
      setNewComment("");
      setShowEmojiPicker(false);
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const input = commentInputRef.current;

    if (!input) {
      setNewComment((prev) => {
        if ((prev + emoji).length > 150) return prev;
        return prev + emoji;
      });
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentValue = input.value;

    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);

    if ((before + emoji + after).length > 150) return;

    const updatedText = before + emoji + after;
    setNewComment(updatedText);
    const newCursorPos = start + emoji.length;

    requestAnimationFrame(() => {
      if (document.activeElement !== input) {
        input.focus();
      }
      input.setSelectionRange(newCursorPos, newCursorPos);

      input.style.height = "20px";
      if (updatedText) {
        input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
      }
    });
  };

  const handleTriggerEdit = () => {
    setShowMenu(false);
    window.dispatchEvent(new CustomEvent("openEditPost", { detail: post }));
  };

  const handleDeletePost = async () => {
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/api/posts/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowMenu(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleDeleteComment = async (targetId) => {
    if (!targetId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await API.delete(
        `/api/posts/${post._id}/comment/${targetId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComments(response.data.comments);
      setActiveCommentMenuId(null);
    } catch (error) {
      console.error("Error during comment deletion:", error);
    }
  };

  const getProfileLink = (targetUsername) => {
    if (!targetUsername) return "/profile";
    if (
      currentUsername &&
      currentUsername.toLowerCase() === targetUsername.toLowerCase()
    ) {
      return "/profile";
    }
    return `/user/${targetUsername}`;
  };

  const authorUsername = post?.user?.username || "user";
  const authorUser = post?.user || {
    username: authorUsername,
    avatar: post?.user?.avatar,
    fullName: post?.user?.fullName || authorUsername,
  };
  const authorId = post?.user?._id || post?.user?.id || post?.user;

  const isAuthor =
    (currentUserId &&
      authorId &&
      authorId.toString() === currentUserId.toString()) ||
    (currentUsername &&
      currentUsername.toLowerCase() === authorUsername.toLowerCase());

  const edited = isPostEdited(post);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <span>Loading post...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.loadingContainer}>
        <span>Post not found.</span>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.containerBox}>
        <div className={styles.imageSection}>
          <div className={styles.imageContainer} onClick={handleImageClick}>
            <div
              className={styles.blurredBg}
              style={{ backgroundImage: `url(${post.url})` }}
            />
            <img src={post.url} alt="Post content" className={styles.postImg} />

            {floatingHearts.map((heart) => (
              <div
                key={heart.id}
                className={`${styles.heartPulseAura} ${
                  heart.isFlying ? styles.flyingHeartAura : ""
                }`}
                style={{
                  top: `${heart.y}%`,
                  left: `${heart.x}%`,
                  "--heart-rotate": `${heart.rotate}deg`,
                  "--fly-x": heart.flyX,
                  "--fly-y": heart.flyY,
                }}
              >
                <div className={styles.glassHeartCircle}>
                  <svg viewBox="0 0 24 24" className={styles.modernHeartIcon}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.infoSection}>
          <header className={styles.header}>
            <div className={styles.headerLeftGroup}>
              <button
                className={styles.backBtn}
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <svg
                  aria-label="Back"
                  color="currentColor"
                  fill="currentColor"
                  height="20"
                  viewBox="0 0 24 24"
                  width="20"
                >
                  <polyline
                    fill="none"
                    points="16.5 3 7.5 12 16.5 21"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  ></polyline>
                </svg>
              </button>

              <div className={styles.userInfo}>
                <Link
                  to={getProfileLink(authorUsername)}
                  className={styles.authorBadge}
                >
                  <Avatar user={authorUser} size={32} />
                  <span className={styles.username}>{authorUsername}</span>
                </Link>

                <div className={styles.userMeta}>
                  <span className={styles.dot}>•</span>
                  <span className={styles.time}>
                    {formatTimeAgo(post.createdAt)}
                  </span>

                  {edited && (
                    <>
                      <span className={styles.dot}>•</span>
                      <span
                        className={styles.editedBadge}
                        title={
                          post.updatedAt
                            ? `Edited ${formatTimeAgo(post.updatedAt)} ago`
                            : "Edited"
                        }
                      >
                        edited
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isAuthor && (
              <div className={styles.menuWrapper} ref={postMenuRef}>
                <button
                  className={`${styles.moreOptions} ${
                    showMenu ? styles.activeMoreOptions : ""
                  }`}
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="More options"
                >
                  <svg
                    aria-label="More options"
                    color="currentColor"
                    fill="currentColor"
                    height="20"
                    viewBox="0 0 24 24"
                    width="20"
                  >
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="6" cy="12" r="1.5"></circle>
                    <circle cx="18" cy="12" r="1.5"></circle>
                  </svg>
                </button>

                {showMenu && (
                  <div className={styles.popoverMenu}>
                    <button
                      className={styles.popoverItem}
                      onClick={handleTriggerEdit}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>Edit post</span>
                    </button>

                    <button
                      className={`${styles.popoverItem} ${styles.dangerItem}`}
                      onClick={handleDeletePost}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete post</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </header>

          {post.caption && (
            <div className={styles.stickyCaptionArea}>
              <div className={styles.authorCaptionBox}>
                <Avatar user={authorUser} size={30} />
                <div className={styles.captionBody}>
                  <div className={styles.captionHeader}>
                    <Link
                      to={getProfileLink(authorUsername)}
                      className={styles.captionUsername}
                    >
                      {authorUsername}
                    </Link>
                    <span className={styles.commentTimeAgo}>
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>
                  <span className={styles.captionText}>{post.caption}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.commentsArea} ref={commentsAreaRef}>
            {comments.length > 0 ? (
              comments.map((comment) => {
                const commenterUsername =
                  comment.user?.username || comment.username || "user";
                const commenterUser = comment.user || {
                  username: commenterUsername,
                  avatar: comment.avatar,
                };
                const commenterId =
                  comment.user?._id || comment.user?.id || comment.user;
                const isMyComment =
                  currentUserId &&
                  commenterId &&
                  commenterId.toString() === currentUserId.toString();
                const commentId = comment._id || comment.createdAt;
                const isCommentMenuOpen = activeCommentMenuId === commentId;

                return (
                  <div key={commentId} className={styles.commentCard}>
                    <Avatar user={commenterUser} size={28} />
                    <div className={styles.commentBody}>
                      <div className={styles.commentHeader}>
                        <Link
                          to={getProfileLink(commenterUsername)}
                          className={styles.commentUser}
                        >
                          {commenterUsername}
                        </Link>
                        <span className={styles.commentTimeAgo}>
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <span className={styles.commentText}>{comment.text}</span>
                    </div>

                    {isMyComment && (
                      <div className={styles.commentMenuWrapper}>
                        <button
                          className={`${styles.commentMoreBtn} ${
                            isCommentMenuOpen ? styles.activeCommentMoreBtn : ""
                          }`}
                          onClick={() =>
                            setActiveCommentMenuId(
                              isCommentMenuOpen ? null : commentId,
                            )
                          }
                          title="Comment options"
                          aria-label="Comment options"
                        >
                          <svg
                            aria-label="Comment options"
                            color="currentColor"
                            fill="currentColor"
                            height="16"
                            viewBox="0 0 24 24"
                            width="16"
                          >
                            <circle cx="12" cy="12" r="1.5"></circle>
                            <circle cx="6" cy="12" r="1.5"></circle>
                            <circle cx="18" cy="12" r="1.5"></circle>
                          </svg>
                        </button>

                        {isCommentMenuOpen && (
                          <div className={styles.commentPopoverMenu}>
                            <button
                              className={`${styles.popoverItem} ${styles.dangerItem}`}
                              onClick={() => handleDeleteComment(comment._id)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              <span>Delete comment</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.noComments}>
                No comments yet. Be the first!
              </div>
            )}
          </div>

          <div className={styles.actionsArea}>
            <div className={styles.actionsRow}>
              <button
                ref={likeBtnRef}
                className={styles.actionBtn}
                onClick={handleLikeToggle}
              >
                <svg
                  aria-label="Like"
                  height="22"
                  viewBox="0 0 24 24"
                  width="22"
                  className={`${
                    isLiked ? styles.likedHeart : styles.unlikedHeart
                  } ${animateHeart ? styles.popActive : ""}`}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                </svg>
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleFocusCommentInput}
              >
                <svg
                  aria-label="Comment"
                  height="22"
                  viewBox="0 0 24 24"
                  width="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.commentSvgIcon}
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </button>
            </div>
            <div className={styles.likesCount}>
              {likesCount.toLocaleString()} likes
            </div>
          </div>

          <form className={styles.inputFooter} onSubmit={handleSendComment}>
            {newComment.length > 10 && (
              <div className={styles.charCounter}>{newComment.length}/150</div>
            )}

            <div className={styles.inputPill}>
              <div className={styles.emojiWrapper} ref={emojiPickerRef}>
                <button
                  type="button"
                  className={styles.emojiBtn}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <svg
                    aria-label="Emoji"
                    color="currentColor"
                    fill="currentColor"
                    height="22"
                    viewBox="0 0 24 24"
                    width="22"
                  >
                    <path d="M15.83 10.96a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm-7.66 0a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm4.17 6.64a5.12 5.12 0 0 1-4.08-2.03.75.75 0 0 1 1.18-.93 3.6 3.6 0 0 0 5.8 0 .75.75 0 0 1 1.18.93 5.12 5.12 0 0 1-4.08 2.03ZM12 2.5a9.5 9.5 0 1 0 9.5 9.5 9.51 9.51 0 0 0-9.5-9.5Zm0 21a11.5 11.5 0 1 1 11.5-11.5 11.51 11.51 0 0 1-11.5 11.5Z"></path>
                  </svg>
                </button>

                {showEmojiPicker && (
                  <div className={styles.emojiContainer}>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      autoFocusSearch={false}
                      theme="auto"
                      searchDisabled={true}
                      skinTonesDisabled={true}
                      previewConfig={{ showPreview: false }}
                      height={300}
                      width={270}
                    />
                  </div>
                )}
              </div>

              <textarea
                ref={commentInputRef}
                rows={1}
                placeholder="Add a comment..."
                className={styles.commentInput}
                value={newComment}
                maxLength={150}
                onChange={(e) => {
                  const val = e.target.value;
                  const trimmedVal = safeSlice(val, 150);
                  setNewComment(trimmedVal);

                  e.target.style.height = "20px";
                  if (trimmedVal) {
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }
                }}
                onFocus={handleFocusCommentInput}
                disabled={isSubmitting}
                autoFocus={autoFocusComment}
              />

              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostPage;
