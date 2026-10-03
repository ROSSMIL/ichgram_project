// src/pages/MessagesPage/components/Modals/CreateGroupModal.jsx
import { memo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Avatar from "../../../../components/Avatar/Avatar";
import { usePreventBodyScroll } from "../../../../hooks/usePreventBodyScroll";
import styles from "../../MessagesPage.module.css";

const CreateGroupModal = memo(
  ({
    groupName,
    setGroupName,
    searchUserQuery,
    setSearchUserQuery,
    allUsers,
    selectedGroupUsers,
    toggleSelectUserForGroup,
    handleCreateGroup,
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
            <h3>Create Group Chat</h3>

            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className={styles.modalInputsWrapper}>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={styles.modalInput}
            />

            <input
              type="text"
              placeholder="Search users..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className={styles.modalInput}
            />
          </div>

          <div className={styles.userSelectionContainer}>
            <span className={styles.selectTitle}>Select Members</span>

            <div ref={userListRef} className={styles.userSelectionList}>
              {allUsers
                .filter((u) =>
                  u.username
                    .toLowerCase()
                    .includes(searchUserQuery.toLowerCase()),
                )
                .map((u, idx) => {
                  const isSelected = selectedGroupUsers.includes(u._id);

                  return (
                    <div
                      key={u._id}
                      className={`${styles.userSelectItem} ${
                        isSelected ? styles.selectedUserItem : ""
                      }`}
                      style={{ "--stagger-index": idx }}
                      onClick={() => toggleSelectUserForGroup(u._id)}
                    >
                      <Avatar user={u} size={36} />

                      <span className={styles.selectUsername}>
                        {u.username}
                      </span>

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
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedGroupUsers.length < 2}
            >
              Create Group
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

CreateGroupModal.displayName = "CreateGroupModal";
CreateGroupModal.propTypes = {
  groupName: PropTypes.string,
  setGroupName: PropTypes.func,
  searchUserQuery: PropTypes.string,
  setSearchUserQuery: PropTypes.func,
  allUsers: PropTypes.array,
  selectedGroupUsers: PropTypes.array,
  toggleSelectUserForGroup: PropTypes.func,
  handleCreateGroup: PropTypes.func,
  onClose: PropTypes.func,
};

export default CreateGroupModal;
