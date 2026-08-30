import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import API from "../../api/axios";
import EmojiPicker from "emoji-picker-react";
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
  const [showBigHeart, setShowBigHeart] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isCommentMenuClosing, setIsCommentMenuClosing] = useState(false);

  const emojiPickerRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentsAreaRef = useRef(null);
  const clickTimerRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerHapticFeedback = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(40);
    }
  };

  const handleLikeToggle = async () => {
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
      setTimeout(() => setAnimateHeart(false), 450);
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);
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

  const handleImageClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      triggerHapticFeedback();
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 800);

      if (!isLiked) {
        handleLikeToggle();
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

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

  const handleOpenMenu = () => setShowMenu(true);
  const handleCloseMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setShowMenu(false);
      setIsMenuClosing(false);
    }, 250);
  };

  const handleDeletePost = async () => {
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/api/posts/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      handleCloseMenu();
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post.");
    }
  };

  const handleOpenCommentMenu = (commentId) => setCommentToDelete(commentId);
  const handleCloseCommentMenu = () => {
    setIsCommentMenuClosing(true);
    setTimeout(() => {
      setCommentToDelete(null);
      setIsCommentMenuClosing(false);
    }, 250);
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      const token = localStorage.getItem("token");
      const response = await API.delete(
        `/api/posts/${post._id}/comment/${commentToDelete}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComments(response.data.comments);
      handleCloseCommentMenu();
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
  const authorUser = post?.user || { username: authorUsername };
  const authorId = post?.user?._id || post?.user?.id || post?.user;

  const isAuthor =
    (currentUserId &&
      authorId &&
      authorId.toString() === currentUserId.toString()) ||
    (currentUsername &&
      currentUsername.toLowerCase() === authorUsername.toLowerCase());

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.modalBox}>
        <div className={styles.imageSection} onClick={handleImageClick}>
          {post?.url ? (
            <img src={post.url} alt="Post content" className={styles.postImg} />
          ) : (
            <div className={styles.imgPlaceholder} />
          )}
          {showBigHeart && (
            <div className={styles.bigHeartOverlay}>
              <svg viewBox="0 0 24 24" className={styles.bigHeartIcon}>
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
            </div>
          )}
        </div>

        <div className={styles.infoSection}>
          <header className={styles.header}>
            <div className={styles.headerLeftGroup}>
              <button
                className={styles.mobileBackBtn}
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
                  className={styles.avatarLink}
                >
                  <Avatar user={authorUser} size={32} />
                </Link>
                <Link
                  to={getProfileLink(authorUsername)}
                  className={styles.usernameLink}
                >
                  <span className={styles.username}>
                    {loading ? "Loading..." : authorUsername}
                  </span>
                </Link>
              </div>
            </div>

            {isAuthor && !loading && (
              <button className={styles.moreOptions} onClick={handleOpenMenu}>
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
            )}
          </header>

          <div className={styles.commentsArea} ref={commentsAreaRef}>
            {post?.caption && (
              <div className={styles.commentItemContainer}>
                <div className={styles.commentItem}>
                  <Link to={getProfileLink(authorUsername)}>
                    <Avatar user={authorUser} size={32} />
                  </Link>
                  <div className={styles.commentContent}>
                    <p className={styles.commentText}>
                      <Link
                        to={getProfileLink(authorUsername)}
                        className={styles.commentUsernameLink}
                      >
                        <span className={styles.commentUsername}>
                          {authorUsername}
                        </span>
                      </Link>{" "}
                      {post.caption}
                    </p>
                    <span className={styles.commentTime}>
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                  currentUserId && commenterId === currentUserId;

                return (
                  <div
                    key={comment._id || comment.createdAt}
                    className={styles.commentItemContainer}
                  >
                    <div className={styles.commentItem}>
                      <Link to={getProfileLink(commenterUsername)}>
                        <Avatar user={commenterUser} size={32} />
                      </Link>
                      <div className={styles.commentContent}>
                        <p className={styles.commentText}>
                          <Link
                            to={getProfileLink(commenterUsername)}
                            className={styles.commentUsernameLink}
                          >
                            <span className={styles.commentUsername}>
                              {commenterUsername}
                            </span>
                          </Link>{" "}
                          {comment.text}
                        </p>
                        <span className={styles.commentTime}>
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isMyComment && (
                      <button
                        className={styles.commentMoreOptions}
                        onClick={() => handleOpenCommentMenu(comment._id)}
                      >
                        <svg
                          aria-label="Comment options"
                          fill="currentColor"
                          height="14"
                          viewBox="0 0 24 24"
                          width="14"
                        >
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="6" cy="12" r="2"></circle>
                          <circle cx="18" cy="12" r="2"></circle>
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.noComments}>
                {loading
                  ? "Loading comments..."
                  : "No comments yet. Be the first!"}
              </div>
            )}
          </div>

          <div className={styles.actionsArea}>
            <div className={styles.iconsRow}>
              <button className={styles.iconBtn} onClick={handleLikeToggle}>
                <svg
                  aria-label="Like"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                  className={`${isLiked ? styles.likedHeart : styles.unlikedHeart} ${
                    animateHeart ? styles.popActive : ""
                  }`}
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
              </button>
              <button
                className={styles.iconBtn}
                onClick={handleFocusCommentInput}
              >
                <svg
                  aria-label="Comment"
                  height="24"
                  viewBox="0 0 24 24"
                  width="24"
                  className={styles.commentSvgIcon}
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </button>
            </div>
            <div className={styles.likesCount}>{likesCount} likes</div>
            <div className={styles.postDate}>
              {post?.createdAt ? formatTimeAgo(post.createdAt) : "just now"}
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
                    color="rgb(115, 115, 115)"
                    fill="rgb(115, 115, 115)"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M15.83 10.96a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm-7.66 0a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm4.17 6.64a5.12 5.12 0 0 1-4.08-2.03.75.75 0 0 1 1.18-.93 3.6 3.6 0 0 0 5.8 0 .75.75 0 0 1 1.18.93 5.12 5.12 0 0 1-4.08 2.03ZM12 2.5a9.5 9.5 0 1 0 9.5 9.5 9.51 9.51 0 0 0-9.5-9.5Zm0 21a11.5 11.5 0 1 1 11.5-11.5 11.51 11.51 0 0 1-11.5 11.5Z"></path>
                  </svg>
                </button>

                {showEmojiPicker && (
                  <div className={styles.emojiContainer}>
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      autoFocusSearch={false}
                      theme="light"
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

          {showMenu && (
            <div
              className={`${styles.menuDrawer} ${
                isMenuClosing ? styles.menuDrawerLeaving : ""
              }`}
            >
              <div className={styles.drawerOverlay} onClick={handleCloseMenu} />
              <div className={styles.drawerContent}>
                <div className={styles.drawerIndicator} />
                <button
                  className={`${styles.drawerBtn} ${styles.deleteBtn}`}
                  onClick={handleDeletePost}
                >
                  Delete Post
                </button>
                <button className={styles.drawerBtn} onClick={handleCloseMenu}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {commentToDelete && (
            <div
              className={`${styles.menuDrawer} ${
                isCommentMenuClosing ? styles.menuDrawerLeaving : ""
              }`}
            >
              <div
                className={styles.drawerOverlay}
                onClick={handleCloseCommentMenu}
              />
              <div className={styles.drawerContent}>
                <div className={styles.drawerIndicator} />
                <button
                  className={`${styles.drawerBtn} ${styles.deleteBtn}`}
                  onClick={handleDeleteComment}
                >
                  Delete my comment
                </button>
                <button
                  className={styles.drawerBtn}
                  onClick={handleCloseCommentMenu}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostPage;
