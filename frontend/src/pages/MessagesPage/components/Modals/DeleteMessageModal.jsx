// src/pages/MessagesPage/components/Modals/DeleteMessageModal.jsx
import { memo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { usePreventBodyScroll } from "../../../../hooks/usePreventBodyScroll";
import styles from "../../MessagesPage.module.css";

const DeleteMessageModal = memo(
  ({
    deletingMessageTarget,
    isOlderThan15Min,
    handleConfirmDeleteSingleMessage,
    onClose,
  }) => {
    const [isClosing, setIsClosing] = useState(false);
    const bodyRef = useRef(null);

    const handleClose = useCallback(() => {
      if (isClosing) return;
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 200);
    }, [isClosing, onClose]);

    usePreventBodyScroll(true, bodyRef, handleClose);

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
            <h3>Delete Message</h3>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div ref={bodyRef} className={styles.deleteModalBody}>
            <div className={styles.deletePreviewBubble}>
              <span className={styles.deletePreviewText}>
                &quot;{deletingMessageTarget?.content}&quot;
              </span>
            </div>

            {isOlderThan15Min ? (
              <div className={styles.timeWarningBox}>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.warningIcon}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <strong>Older than 15 minutes</strong>
                  <p>
                    This message was sent more than 15 minutes ago. It will be
                    removed from your view, but may still be visible to other
                    members.
                  </p>
                </div>
              </div>
            ) : (
              <p className={styles.deleteConfirmNotice}>
                Are you sure you want to delete this message? This action will
                remove it for everyone.
              </p>
            )}
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
                  handleConfirmDeleteSingleMessage();
                }, 200);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

DeleteMessageModal.displayName = "DeleteMessageModal";
DeleteMessageModal.propTypes = {
  deletingMessageTarget: PropTypes.object,
  isOlderThan15Min: PropTypes.bool,
  handleConfirmDeleteSingleMessage: PropTypes.func,
  onClose: PropTypes.func,
};

export default DeleteMessageModal;
