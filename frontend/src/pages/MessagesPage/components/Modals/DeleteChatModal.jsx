import { memo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { usePreventBodyScroll } from "../../../../hooks/usePreventBodyScroll";
import styles from "../../MessagesPage.module.css";

const DeleteChatModal = memo(
  ({ isGroup, isGroupAdmin, handleConfirmDeleteChat, onClose }) => {
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
            <h3>
              {isGroup
                ? isGroupAdmin
                  ? "Delete Group Chat"
                  : "Leave Group Chat"
                : "Hide Chat"}
            </h3>

            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div ref={bodyRef} className={styles.deleteModalBody}>
            <p className={styles.deleteModalDescription}>
              {isGroup
                ? isGroupAdmin
                  ? "Are you sure you want to delete this group? All messages and media files will be permanently removed for all members."
                  : "Are you sure you want to leave this group chat? You will stop receiving new messages from this group."
                : "Are you sure you want to hide this conversation for yourself?"}
            </p>

            {!isGroup && (
              <div className={styles.deleteInfoNoticeBox}>
                <svg
                  className={styles.deleteInfoNoticeIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>

                <div className={styles.deleteInfoNoticeText}>
                  <strong>How chat restoration works:</strong>
                  <ul>
                    <li>
                      This hides the chat from your list. The other person will
                      still have the conversation history.
                    </li>
                    <li>
                      If you start messaging again while they keep the chat, you
                      can <strong>restore your full history</strong>.
                    </li>
                    <li>
                      If both of you delete the chat, all history is permanently
                      erased and new conversations will{" "}
                      <strong>start from scratch</strong>.
                    </li>
                  </ul>
                </div>
              </div>
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
              onClick={handleConfirmDeleteChat}
            >
              {isGroup
                ? isGroupAdmin
                  ? "Delete Group"
                  : "Leave Group"
                : "Hide Chat"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

DeleteChatModal.displayName = "DeleteChatModal";
DeleteChatModal.propTypes = {
  isGroup: PropTypes.bool,
  isGroupAdmin: PropTypes.bool,
  handleConfirmDeleteChat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeleteChatModal;
