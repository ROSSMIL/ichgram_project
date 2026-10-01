// src/pages/MessagesPage/components/Modals/CannotRemoveUserModal.jsx
import { memo } from "react";
import PropTypes from "prop-types";
import styles from "../../MessagesPage.module.css";

const CannotRemoveUserModal = memo(
  ({
    cannotRemoveModalUser,
    setCannotRemoveModalUser,
    setIsGroupDetailsModalOpen,
    handleConfirmDeleteChat,
  }) => {
    return (
      <div
        className={styles.modalOverlay}
        onClick={() => setCannotRemoveModalUser(null)}
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h3>Cannot remove member</h3>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={() => setCannotRemoveModalUser(null)}
            >
              ✕
            </button>
          </div>

          <p
            style={{
              color: "var(--text-secondary)",
              margin: "16px 0 24px 0",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Group chats require at least 2 members. Removing{" "}
            <strong>{cannotRemoveModalUser?.username || "this user"}</strong>{" "}
            will permanently delete this group chat for everyone. Would you like
            to delete the group?
          </p>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setCannotRemoveModalUser(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.createBtn}
              style={{ backgroundColor: "#ed4956" }}
              onClick={() => {
                setCannotRemoveModalUser(null);
                setIsGroupDetailsModalOpen(false);
                handleConfirmDeleteChat();
              }}
            >
              Delete Group
            </button>
          </div>
        </div>
      </div>
    );
  },
);

CannotRemoveUserModal.displayName = "CannotRemoveUserModal";
CannotRemoveUserModal.propTypes = {
  cannotRemoveModalUser: PropTypes.object,
  setCannotRemoveModalUser: PropTypes.func,
  setIsGroupDetailsModalOpen: PropTypes.func,
  handleConfirmDeleteChat: PropTypes.func,
};

export default CannotRemoveUserModal;
