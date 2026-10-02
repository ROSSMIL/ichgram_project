// src/pages/MessagesPage/components/Modals/PermanentlyDeleteChatModal.jsx
import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import styles from "../../MessagesPage.module.css";

const PermanentlyDeleteChatModal = memo(
  ({ handleConfirmDeleteChat, onClose, isPartnerDeleted }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }, []);

    const handleClose = useCallback(() => {
      if (isClosing) return;
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 200);
    }, [isClosing, onClose]);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          handleClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleClose]);

    return createPortal(
      <div
        className={`${styles.modalOverlay} ${
          isClosing ? styles.modalOverlayClosing : ""
        }`}
        onClick={handleClose}
      >
        <div
          className={`${styles.modalContent} ${
            isClosing ? styles.modalContentClosing : ""
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Permanently Delete Chat</h3>

            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className={styles.deleteModalBody}>
            <p className={styles.deleteModalDescription}>
              {isPartnerDeleted
                ? "This account has been deleted. Are you sure you want to permanently delete this conversation?"
                : "The other participant has already deleted this chat on their end. Are you sure you want to delete it as well?"}
            </p>

            <div
              className={`${styles.deleteInfoNoticeBox} ${styles.deleteWarningBox}`}
            >
              <svg
                className={`${styles.deleteInfoNoticeIcon} ${styles.deleteWarningIcon}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>

              <div className={styles.deleteInfoNoticeText}>
                <strong>Permanent Action:</strong>
                <p>
                  {isPartnerDeleted
                    ? "Deleting this chat will permanently erase all message history. This conversation will be lost forever and cannot be restored."
                    : "Since your partner has already removed this chat, deleting it now will permanently erase all chat history for both of you. It cannot be restored later."}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.dangerConfirmBtn}
              onClick={() => {
                handleClose();
                setTimeout(() => {
                  handleConfirmDeleteChat();
                }, 200);
              }}
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

PermanentlyDeleteChatModal.displayName = "PermanentlyDeleteChatModal";
PermanentlyDeleteChatModal.propTypes = {
  handleConfirmDeleteChat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isPartnerDeleted: PropTypes.bool,
};

export default PermanentlyDeleteChatModal;
