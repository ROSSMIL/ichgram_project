// src/pages/MessagesPage/components/Modals/DeleteMessageModal.jsx
import { memo } from "react";
import PropTypes from "prop-types";
import styles from "../../MessagesPage.module.css";

const DeleteMessageModal = memo(
  ({
    deletingMessageTarget,
    isOlderThan15Min,
    handleConfirmDeleteSingleMessage,
    onClose,
  }) => {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Delete Message</h3>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className={styles.deletePreviewBubble}>
            <span className={styles.deletePreviewText}>
              &quot;{deletingMessageTarget.content}&quot;
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

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.createBtn}
              style={{ backgroundColor: "#ef4444" }}
              onClick={handleConfirmDeleteSingleMessage}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
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
