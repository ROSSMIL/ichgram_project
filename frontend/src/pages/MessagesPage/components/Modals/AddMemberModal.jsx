// src/pages/MessagesPage/components/Modals/AddMemberModal.jsx
import { memo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Avatar from "../../../../components/Avatar/Avatar";
import { usePreventBodyScroll } from "../../../../hooks/usePreventBodyScroll";
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
    const userListRef = useRef(null);

    const handleClose = useCallback(() => {
      if (isClosing) return;
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 200);
    }, [isClosing, onClose]);

    usePreventBodyScroll(true, userListRef, handleClose);

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
            <div ref={userListRef} className={styles.userSelectionList}>
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
