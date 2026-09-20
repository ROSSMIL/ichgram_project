import { useState, useEffect, useRef, useCallback } from "react";
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
      avatar: payload.avatar || "",
    };
  } catch (e) {
    console.error("Error parsing JWT token:", e);
    return null;
  }
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [viewMode, setViewMode] = useState("edit");
  const [isClosing, setIsClosing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("light");
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCroppingActive, setIsCroppingActive] = useState(false);

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
      setIsCroppingActive(false);
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
    try {
      const croppedResult = await getCroppedImg(rawImage, croppedAreaPixels);
      setCroppedImage(croppedResult);
      setIsCroppingActive(false);
    } catch (e) {
      console.error("Error cropping image:", e);
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
        className={`${styles.modal} ${isPreview ? styles.previewModeModal : ""} ${
          isClosing ? styles.scaleDown : ""
        }`}
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
                    >
                      Save Crop
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
            <div className={styles.previewCardContainer}>
              <PostCard
                post={previewPostData}
                currentUserId={user?._id || user?.id}
                currentUsername={user?.username}
                onOpenModal={() => {}}
              />
            </div>
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
