import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import EmojiPicker from "emoji-picker-react";
import styles from "./CreatePostModal.module.css";
import Avatar from "../Avatar/Avatar";

const CreatePostModal = ({ isOpen, onClose, currentUser, onPostCreated }) => {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isClosing, setIsClosing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("light");

  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const captionInputRef = useRef(null);

  const navigate = useNavigate();

  const hasAnyData = !!image || caption.trim().length > 0;

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
      setImage(null);
      setCaption("");
      setError("");
      setIsDragOver(false);
      setShowEmojiPicker(false);
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
    setImage(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearCaption = () => {
    setCaption("");
  };

  const handleResetAll = () => {
    handleClearPhoto();
    handleClearCaption();
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

  if (!isOpen) return null;

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
    if (currentUser?.username) {
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
      setImage(reader.result);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await API.post(
        "/api/posts",
        { url: image, caption },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (onPostCreated) {
        onPostCreated(response.data);
      }

      const event = new CustomEvent("postCreated", { detail: response.data });
      window.dispatchEvent(event);

      forceClose();
    } catch (err) {
      console.error("Failed to create post:", err);
      setError(
        err.response?.data?.message || "Failed to upload post. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.fadeOut : ""}`}
      onClick={handleAttemptClose}
    >
      <div
        className={`${styles.modal} ${isClosing ? styles.scaleDown : ""}`}
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

          <h3 className={styles.modalTitle}>Create new post</h3>

          <div className={styles.headerRightActions}>
            <button
              type="button"
              className={`${styles.resetAllBtn} ${hasAnyData ? styles.visible : ""}`}
              onClick={handleResetAll}
              title="Clear photo & text"
              tabIndex={hasAnyData ? 0 : -1}
            >
              Reset All
            </button>

            <button
              className={styles.shareBtn}
              onClick={handleSubmit}
              disabled={loading || !image}
            >
              {loading ? (
                <span className={styles.btnLoadingWrapper}>
                  <span className={styles.btnSpinner} />
                  <span>Sharing...</span>
                </span>
              ) : (
                "Share"
              )}
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.leftColumn}>
            {!image ? (
              <div
                className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ""}`}
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
            ) : (
              <div className={styles.previewContainer}>
                <img
                  src={image}
                  alt="Preview"
                  className={styles.imagePreview}
                />
                <div className={styles.photoControlsOverlay}>
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
                <Avatar user={currentUser} size={32} />
              </div>
              <span className={styles.username}>
                {currentUser?.username || "username"}
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
                    className={`${styles.clearTextBtn} ${caption.length > 0 ? styles.visible : ""}`}
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

            <h3 className={styles.confirmModalTitle}>Leave post creation?</h3>

            <p className={styles.confirmModalText}>Your post won't be saved.</p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowConfirmDiscard(false)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className={styles.confirmDiscardBtn}
                onClick={forceClose}
              >
                Leave
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
};

export default CreatePostModal;
