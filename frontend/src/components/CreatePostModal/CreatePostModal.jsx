import { useState, useEffect, useRef, useCallback, memo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import EmojiPicker from "emoji-picker-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../utils/getCroppedImg";
import styles from "./CreatePostModal.module.css";
import Avatar from "../Avatar/Avatar";
import PostCard from "../PostCard/PostCard";

const getUserFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);
    return {
      _id: payload.userId || payload.id || payload._id,
      username: payload.username,
      avatar: payload.avatar || payload.profilePicture || "",
    };
  } catch (e) {
    console.error("Error parsing JWT token:", e);
    return null;
  }
};

const ExplorePreviewCard = memo(({ post }) => {
  const itemRef = useRef(null);
  const requestRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!itemRef.current) return;
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
    if (!itemRef.current) return;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    const card = itemRef.current;
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
    card.style.setProperty("--gloss-opacity", "0");
  };

  return (
    <div
      ref={itemRef}
      className={`${styles.exploreGridItem} ${styles.exploreItemVisible}`}
      style={{
        "--post-bg": `url(${post.url})`,
        "--i": 0,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.exploreFloatWrapper}>
        <img
          src={post.url}
          alt={post.caption || "Post preview"}
          className={styles.explorePostImage}
        />

        <div className={styles.exploreGlossOverlay} />

        <div className={styles.exploreStatsBadge}>
          <div className={styles.exploreBadgeStat}>
            <svg
              className={styles.exploreBadgeIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{post.likesCount || 0}</span>
          </div>
          <div className={styles.exploreBadgeStat}>
            <svg
              className={styles.exploreBadgeIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
            </svg>
            <span>0</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ExplorePreviewCard.displayName = "ExplorePreviewCard";

ExplorePreviewCard.propTypes = {
  post: PropTypes.object.isRequired,
};

const CreatePostModal = ({
  isOpen,
  onClose,
  currentUser: initialUser,
  onPostCreated,
  editingPost = null,
  onPostUpdated = null,
}) => {
  const [rawImage, setRawImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [caption, setCaption] = useState("");

  const [prevEditingPost, setPrevEditingPost] = useState(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen || editingPost !== prevEditingPost) {
    setPrevIsOpen(isOpen);
    setPrevEditingPost(editingPost);

    if (isOpen && editingPost) {
      setRawImage(editingPost.url);
      setCroppedImage(editingPost.url);
      setCaption(editingPost.caption || "");
    }
  }

  const [user, setUser] = useState(() => initialUser || getUserFromToken());
  const [prevInitialUser, setPrevInitialUser] = useState(initialUser);

  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser || getUserFromToken());
  }

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data } = await API.get("/api/users/profile");
        if (isMounted && data) {
          setUser(data);
        }
      } catch (err) {
        console.error("Failed to load user profile in CreatePostModal:", err);
      }
    };

    loadProfile();

    const handleProfileUpdate = () => {
      loadProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [viewMode, setViewMode] = useState("edit");
  const [previewStyle, setPreviewStyle] = useState("feed");
  const [isClosing, setIsClosing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("light");
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCroppingActive, setIsCroppingActive] = useState(false);

  const [isCroppingLoading, setIsCroppingLoading] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const captionInputRef = useRef(null);

  const navigate = useNavigate();

  const hasAnyData = !!rawImage || caption.trim().length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const updateTheme = () => {
      const theme =
        document.documentElement.getAttribute("data-theme") || "light";
      setCurrentTheme(theme);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [isOpen]);

  const forceClose = useCallback(() => {
    setIsClosing(true);
    setShowConfirmDiscard(false);
    setTimeout(() => {
      setRawImage(null);
      setCroppedImage(null);
      setCaption("");
      setError("");
      setIsDragOver(false);
      setShowEmojiPicker(false);
      setViewMode("edit");
      setPreviewStyle("feed");
      setIsCroppingActive(false);
      setIsCroppingLoading(false);
      setIsClosing(false);
      onClose();
    }, 150);
  }, [onClose]);

  const handleAttemptClose = useCallback(() => {
    if (hasAnyData) {
      setShowConfirmDiscard(true);
    } else {
      forceClose();
    }
  }, [hasAnyData, forceClose]);

  const handleClearPhoto = () => {
    setRawImage(null);
    setCroppedImage(null);
    setError("");
    setIsCroppingActive(false);
    setIsCroppingLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setViewMode("edit");
  };

  const handleClearCaption = () => {
    setCaption("");
  };

  const handleResetAll = () => {
    handleClearPhoto();
    handleClearCaption();
    setViewMode("edit");
  };

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

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isClosing) {
        if (showConfirmDiscard) {
          setShowConfirmDiscard(false);
        } else {
          handleAttemptClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isClosing, showConfirmDiscard, handleAttemptClose]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const input = captionInputRef.current;

    if (!input) {
      setCaption((prev) => {
        if ((prev + emoji).length > 2200) return prev;
        return prev + emoji;
      });
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentValue = input.value;

    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);

    if ((before + emoji + after).length > 2200) return;

    const updatedText = before + emoji + after;
    setCaption(updatedText);
    const newCursorPos = start + emoji.length;

    requestAnimationFrame(() => {
      if (document.activeElement !== input) {
        input.focus();
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleProfileClick = () => {
    if (user?.username) {
      forceClose();
      navigate(`/profile`);
    }
  };

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImage(reader.result);
      setCroppedImage(reader.result);
      setIsCroppingActive(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const stylesDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const applyCrop = async () => {
    if (isCroppingLoading) return;
    setIsCroppingLoading(true);
    try {
      const croppedResult = await getCroppedImg(rawImage, croppedAreaPixels);
      setCroppedImage(croppedResult);
      setIsCroppingActive(false);
    } catch (e) {
      console.error("Error cropping image:", e);
    } finally {
      setIsCroppingLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!croppedImage) return;

    setLoading(true);
    setError("");

    try {
      if (editingPost) {
        const response = await API.put(`/api/posts/${editingPost._id}`, {
          url: croppedImage,
          caption,
        });

        if (onPostUpdated) {
          onPostUpdated(response.data);
        }
      } else {
        const response = await API.post("/api/posts", {
          url: croppedImage,
          caption,
        });

        if (onPostCreated) {
          onPostCreated(response.data);
        }

        const event = new CustomEvent("postCreated", { detail: response.data });
        window.dispatchEvent(event);
      }

      forceClose();
    } catch (err) {
      console.error("Failed to save post:", err);
      setError(
        err.response?.data?.message || "Failed to save post. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const previewPostData = {
    _id: editingPost ? editingPost._id : "preview_temp_id",
    url: croppedImage || rawImage,
    caption: caption,
    createdAt: editingPost ? editingPost.createdAt : new Date().toISOString(),
    likes: editingPost ? editingPost.likes : [],
    likesCount: editingPost ? editingPost.likesCount : 0,
    isEdited: editingPost ? true : false,
    user: user || {
      username: "username",
      avatar: "",
    },
  };

  const isPreview = viewMode === "preview" && !!croppedImage;

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.fadeOut : ""}`}
      onClick={handleAttemptClose}
    >
      <div
        className={`${styles.modal} ${
          isPreview
            ? previewStyle === "explore"
              ? styles.previewExploreModeModal
              : styles.previewModeModal
            : ""
        } ${isClosing ? styles.scaleDown : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className={styles.fileInput}
          accept="image/*"
        />

        <div className={styles.header}>
          <button
            className={styles.closeBtn}
            onClick={handleAttemptClose}
            aria-label="Close modal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {croppedImage ? (
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.tabBtn} ${
                  viewMode === "edit" ? styles.activeTab : ""
                }`}
                onClick={() => setViewMode("edit")}
              >
                {editingPost ? "Edit" : "Create"}
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${
                  viewMode === "preview" ? styles.activeTab : ""
                }`}
                onClick={() => setViewMode("preview")}
              >
                Preview
              </button>
            </div>
          ) : (
            <h3 className={styles.modalTitle}>
              {editingPost ? "Edit post" : "Create new post"}
            </h3>
          )}

          <div className={styles.headerRightActions}>
            <button
              type="button"
              className={`${styles.resetAllBtn} ${
                hasAnyData ? styles.visible : ""
              }`}
              onClick={handleResetAll}
              title="Clear photo & text"
              tabIndex={hasAnyData ? 0 : -1}
            >
              Reset All
            </button>

            <button
              className={styles.shareBtn}
              onClick={handleSubmit}
              disabled={loading || !croppedImage}
            >
              {loading ? (
                <span className={styles.btnLoadingWrapper}>
                  <span className={styles.btnSpinner} />
                  <span>{editingPost ? "Saving..." : "Sharing..."}</span>
                </span>
              ) : editingPost ? (
                "Save"
              ) : (
                "Share"
              )}
            </button>
          </div>
        </div>

        <div className={styles.contentViewport}>
          <div
            className={`${styles.body} ${
              isPreview ? styles.bodyHidden : styles.bodyVisible
            }`}
          >
            <div className={styles.leftColumn}>
              {!rawImage ? (
                <div
                  className={`${styles.dropZone} ${
                    isDragOver ? styles.dragOver : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={stylesDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                >
                  <div className={styles.iconCircle}>
                    <svg
                      className={styles.cloudIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16V9M12 9L9 12M12 9L15 12" />
                      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                    </svg>
                  </div>

                  <p className={styles.dropText}>Drag photos here</p>
                  <button
                    type="button"
                    className={styles.selectFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                  >
                    Select from computer
                  </button>

                  {error && <span className={styles.errorText}>{error}</span>}
                </div>
              ) : isCroppingActive ? (
                <div className={styles.cropperWrapper}>
                  <div className={styles.cropperContainer}>
                    <Cropper
                      image={rawImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={aspect}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      restrictPosition={true}
                      minZoom={1}
                      maxZoom={3}
                    />
                  </div>

                  <div className={styles.cropToolbar}>
                    <div className={styles.aspectRatios}>
                      <button
                        type="button"
                        className={`${styles.aspectBtn} ${aspect === 1 ? styles.activeAspect : ""}`}
                        onClick={() => setAspect(1)}
                      >
                        1:1
                      </button>
                      <button
                        type="button"
                        className={`${styles.aspectBtn} ${aspect === 4 / 5 ? styles.activeAspect : ""}`}
                        onClick={() => setAspect(4 / 5)}
                      >
                        4:5
                      </button>
                      <button
                        type="button"
                        className={`${styles.aspectBtn} ${aspect === 16 / 9 ? styles.activeAspect : ""}`}
                        onClick={() => setAspect(16 / 9)}
                      >
                        16:9
                      </button>
                    </div>

                    <div className={styles.zoomControl}>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className={styles.zoomSlider}
                      />
                    </div>

                    <button
                      type="button"
                      className={styles.applyCropBtn}
                      onClick={applyCrop}
                      disabled={isCroppingLoading}
                    >
                      {isCroppingLoading ? (
                        <span className={styles.cropLoadingWrapper}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className={styles.spinningCropSvg}
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Cropping...</span>
                        </span>
                      ) : (
                        "Save Crop"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.previewContainer}>
                  <img
                    src={croppedImage}
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                  <div className={styles.photoControlsOverlay}>
                    <button
                      type="button"
                      className={styles.photoActionBtn}
                      onClick={() => setIsCroppingActive(true)}
                      title="Adjust Crop"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                        <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                      </svg>
                      <span>Crop</span>
                    </button>

                    <button
                      type="button"
                      className={styles.photoActionBtn}
                      onClick={triggerFileInput}
                      title="Choose another photo"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.changeIconAnimation}
                      >
                        <path d="M21.5 2v6h-6" />
                        <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>Change</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.photoActionBtn} ${styles.danger}`}
                      onClick={handleClearPhoto}
                      title="Remove photo only"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.userInfo} onClick={handleProfileClick}>
                <div className={styles.avatarWrapper}>
                  <Avatar user={user} size={32} />
                </div>
                <span className={styles.username}>
                  {user?.username || "username"}
                </span>
              </div>

              <div className={styles.captionSection}>
                <textarea
                  ref={captionInputRef}
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={2200}
                  className={styles.captionArea}
                />

                <div className={styles.captionControls}>
                  <div className={styles.leftCaptionControls}>
                    <div className={styles.emojiWrapper} ref={emojiPickerRef}>
                      <button
                        type="button"
                        className={styles.emojiBtn}
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        aria-label="Add emoji"
                      >
                        <svg
                          aria-label="Emoji"
                          color="currentColor"
                          fill="currentColor"
                          height="20"
                          role="img"
                          viewBox="0 0 24 24"
                          width="20"
                        >
                          <path d="M15.83 10.96a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm-7.66 0a1.75 1.75 0 1 1 1.75-1.76 1.75 1.75 0 0 1-1.75 1.76Zm10.45-.48a.75.75 0 0 0-.75.75 6.64 6.64 0 0 1-11.74 0 .75.75 0 0 0-1.34.66 8.14 8.14 0 0 0 14.43 0 .75.75 0 0 0-.6-1.41Zm-6.62 11.1a10.08 10.08 0 1 1 10.08-10.08A10.1 10.1 0 0 1 12 21.58Zm0-18.66a8.58 8.58 0 1 0 8.58 8.58A8.6 8.6 0 0 0 12 2.92Z" />
                        </svg>
                      </button>

                      {showEmojiPicker && (
                        <div className={styles.emojiContainer}>
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            autoFocusSearch={false}
                            theme={currentTheme === "dark" ? "dark" : "light"}
                            searchDisabled={true}
                            skinTonesDisabled={true}
                            previewConfig={{ showPreview: false }}
                            height={280}
                            width={300}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`${styles.clearTextBtn} ${
                        caption.length > 0 ? styles.visible : ""
                      }`}
                      onClick={handleClearCaption}
                      title="Clear text only"
                      tabIndex={caption.length > 0 ? 0 : -1}
                    >
                      Clear text
                    </button>
                  </div>

                  <span className={styles.charCount}>
                    {caption.length.toLocaleString()}/2,200
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`${styles.previewWrapper} ${
              isPreview ? styles.previewVisible : styles.previewHidden
            }`}
          >
            <div className={styles.previewSubHeader}>
              <div className={styles.previewStylePill}>
                <button
                  type="button"
                  className={`${styles.styleSubBtn} ${
                    previewStyle === "feed" ? styles.activeStyleSubBtn : ""
                  }`}
                  onClick={() => setPreviewStyle("feed")}
                >
                  Feed Card
                </button>
                <button
                  type="button"
                  className={`${styles.styleSubBtn} ${
                    previewStyle === "explore" ? styles.activeStyleSubBtn : ""
                  }`}
                  onClick={() => setPreviewStyle("explore")}
                >
                  Explore Card
                </button>
              </div>
            </div>

            {previewStyle === "feed" ? (
              <div className={styles.previewCardContainer}>
                <PostCard
                  post={previewPostData}
                  currentUserId={user?._id || user?.id}
                  currentUsername={user?.username}
                  onOpenModal={() => {}}
                />
              </div>
            ) : (
              <div className={styles.explorePreviewWrapper}>
                <ExplorePreviewCard post={previewPostData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmDiscard && (
        <div
          className={styles.confirmOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmDiscard(false);
          }}
        >
          <div
            className={styles.confirmCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.badgeWarning}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h3 className={styles.confirmModalTitle}>
              {editingPost ? "Discard changes?" : "Discard post?"}
            </h3>

            <p className={styles.confirmModalText}>
              If you leave, your edits will be lost.
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowConfirmDiscard(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDiscardBtn}
                onClick={forceClose}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

CreatePostModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentUser: PropTypes.object,
  onPostCreated: PropTypes.func,
  editingPost: PropTypes.object,
  onPostUpdated: PropTypes.func,
};

export default CreatePostModal;
