import { useState, useEffect, useRef, useCallback } from "react";
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

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const captionInputRef = useRef(null);

  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setIsClosing(true);
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
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isClosing, handleClose]);

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
      handleClose();
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
    fileInputRef.current.click();
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

      handleClose();
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
      onClick={handleClose}
    >
      <div
        className={`${styles.modal} ${isClosing ? styles.scaleDown : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={handleClose}
            aria-label="Back"
          >
            <svg
              aria-label="Back"
              color="rgb(38, 38, 38)"
              fill="rgb(38, 38, 38)"
              height="24"
              role="img"
              viewBox="0 0 24 24"
              width="24"
            >
              <line
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                x1="2.909"
                x2="21.413"
                y1="12"
                y2="12"
              ></line>
              <polyline
                fill="none"
                points="11.692 3.22 2.909 12 11.692 20.78"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></polyline>
            </svg>
          </button>
          <h3>Create new post</h3>
          <button
            className={styles.shareBtn}
            onClick={handleSubmit}
            disabled={loading || !image}
            style={{ opacity: !image ? 0.4 : 1 }}
          >
            {loading ? "Sharing..." : "Share"}
          </button>
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

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.fileInput}
                  accept="image/*"
                />
                {error && <span className={styles.errorText}>{error}</span>}
              </div>
            ) : (
              <div className={styles.previewContainer}>
                <img
                  src={image}
                  alt="Preview"
                  className={styles.imagePreview}
                />
                <button
                  className={styles.changeImgBtn}
                  onClick={() => setImage(null)}
                >
                  Change Photo
                </button>
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.userInfo} onClick={handleProfileClick}>
              <div className={styles.avatarWrapper}>
                <Avatar user={currentUser} size={28} />
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
                        theme="light"
                        searchDisabled={true}
                        skinTonesDisabled={true}
                        previewConfig={{ showPreview: false }}
                        height={280}
                        width={300}
                      />
                    </div>
                  )}
                </div>

                <span className={styles.charCount}>
                  {caption.length.toLocaleString()}/2,200
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
