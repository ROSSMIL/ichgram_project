import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./AvatarViewModal.module.css";
import Avatar from "../Avatar/Avatar";

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 6L9 17l-5-5"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className={styles.svgIcon}>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 6L6 18M6 6l12 12"
    />
  </svg>
);

const AvatarViewModal = ({
  user,
  isOwnProfile = false,
  onClose,
  onUploadSave,
  onRemovePhoto,
  hasCustomAvatar,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const handleCloseWithAnimation = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      if (callback) callback();
      onClose();
    }, 150);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsConfirmingDelete(false);
  };

  const handleDiscardPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!selectedFile || !onUploadSave) return;
    try {
      setIsSubmitting(true);
      await onUploadSave(selectedFile);
      handleCloseWithAnimation();
    } catch (error) {
      console.error("Failed to save avatar:", error);
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await handleCloseWithAnimation(onRemovePhoto);
    } catch (error) {
      console.error("Failed to remove avatar:", error);
      setIsSubmitting(false);
    }
  };

  const displayUser = previewUrl ? { ...user, avatar: previewUrl } : user;

  const getSubHeaderTitle = () => {
    if (previewUrl) return "Preview new avatar";
    if (isConfirmingDelete) return "Are you sure you want to delete?";
    return user?.fullName || user?.username;
  };

  return createPortal(
    <div
      className={`${styles.modalOverlay} ${isClosing ? styles.fadeOut : ""}`}
      onClick={() => handleCloseWithAnimation()}
    >
      <div
        className={`${styles.modalContent} ${isClosing ? styles.scaleDown : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isOwnProfile && (
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileSelect}
          />
        )}

        {user && (
          <div className={styles.userInfoHeader}>
            <span className={styles.username}>@{user.username}</span>
            <span
              className={`${styles.fullName} ${
                isConfirmingDelete ? styles.dangerText : ""
              }`}
            >
              {getSubHeaderTitle()}
            </span>
          </div>
        )}

        <div className={styles.menuDivider} />

        <div className={styles.avatarPreviewArea}>
          <div
            className={`${styles.largeAvatarWrapper} ${
              previewUrl ? styles.previewActive : ""
            } ${isConfirmingDelete ? styles.deleteActive : ""}`}
          >
            <Avatar user={displayUser} size={180} />
          </div>
        </div>

        <div className={styles.actionsContainer}>
          <div className={styles.menuDivider} />

          {isOwnProfile ? (
            selectedFile ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className={`${styles.menuLink} ${styles.primary}`}
                >
                  <span className={styles.menuIcon}>
                    <CheckIcon />
                  </span>
                  <span>{isSubmitting ? "Saving..." : "Save avatar"}</span>
                </button>

                <button
                  onClick={handleDiscardPreview}
                  disabled={isSubmitting}
                  className={styles.menuLink}
                >
                  <span className={styles.menuIcon}>
                    <CloseIcon />
                  </span>
                  <span>Discard</span>
                </button>
              </>
            ) : isConfirmingDelete ? (
              <>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className={`${styles.menuLink} ${styles.danger}`}
                >
                  <span className={styles.menuIcon}>
                    <TrashIcon />
                  </span>
                  <span>
                    {isSubmitting ? "Removing..." : "Yes, remove photo"}
                  </span>
                </button>

                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isSubmitting}
                  className={styles.menuLink}
                >
                  <span className={styles.menuIcon}>
                    <CloseIcon />
                  </span>
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.menuLink}
                >
                  <span className={styles.menuIcon}>
                    <UploadIcon />
                  </span>
                  <span>Upload new photo</span>
                </button>

                {hasCustomAvatar && (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className={`${styles.menuLink} ${styles.danger}`}
                  >
                    <span className={styles.menuIcon}>
                      <TrashIcon />
                    </span>
                    <span>Remove current photo</span>
                  </button>
                )}

                <button
                  onClick={() => handleCloseWithAnimation()}
                  className={styles.menuLink}
                >
                  <span className={styles.menuIcon}>
                    <CloseIcon />
                  </span>
                  <span>Cancel</span>
                </button>
              </>
            )
          ) : (
            <button
              onClick={() => handleCloseWithAnimation()}
              className={styles.menuLink}
            >
              <span className={styles.menuIcon}>
                <CloseIcon />
              </span>
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AvatarViewModal;
