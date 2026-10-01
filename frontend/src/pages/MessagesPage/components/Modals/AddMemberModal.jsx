// src/pages/MessagesPage/components/Modals/AddMemberModal.jsx
import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Avatar from "../../../../components/Avatar/Avatar";
import styles from "../../MessagesPage.module.css";

const AddMemberModal = memo(
  ({
    searchAddUserQuery,
    setSearchAddUserQuery,
    availableUsersToAdd,
    selectedAddUsers,
    toggleSelectUserForAdd,
    handleAddMembersToGroup,
    onClose,
  }) => {
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

    const filteredUsers = availableUsersToAdd.filter(
      (u) =>
        !u.isDeleted &&
        !u.username?.startsWith("deleted_user_") &&
        u.username?.toLowerCase().includes(searchAddUserQuery.toLowerCase()),
    );

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
            <h3>Add Members to Group</h3>
            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Search users to add..."
            value={searchAddUserQuery}
            onChange={(e) => setSearchAddUserQuery(e.target.value)}
            className={styles.modalInput}
          />

          <div className={styles.userSelectionContainer}>
            <span className={styles.selectTitle}>Available Contacts</span>
            <div className={styles.userSelectionList}>
              {filteredUsers.map((u, idx) => {
                const isSelected = selectedAddUsers.includes(u._id);
                return (
                  <div
                    key={u._id}
                    className={`${styles.userSelectItem} ${
                      isSelected ? styles.selectedUserItem : ""
                    }`}
                    style={{ "--stagger-index": idx }}
                    onClick={() => toggleSelectUserForAdd(u._id)}
                  >
                    <Avatar user={u} size={36} />
                    <span className={styles.selectUsername}>{u.username}</span>
                    <div
                      className={`${styles.customCheckbox} ${
                        isSelected ? styles.checkboxChecked : ""
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={styles.checkboxCheckmark}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className={styles.noUsersNotice}>
                  No new users available to add
                </p>
              )}
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
              className={styles.createBtn}
              onClick={handleAddMembersToGroup}
              disabled={selectedAddUsers.length === 0}
            >
              Add Selected ({selectedAddUsers.length})
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

AddMemberModal.displayName = "AddMemberModal";
AddMemberModal.propTypes = {
  searchAddUserQuery: PropTypes.string,
  setSearchAddUserQuery: PropTypes.func,
  availableUsersToAdd: PropTypes.array,
  selectedAddUsers: PropTypes.array,
  toggleSelectUserForAdd: PropTypes.func,
  handleAddMembersToGroup: PropTypes.func,
  onClose: PropTypes.func,
};

export default AddMemberModal;
