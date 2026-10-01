// src/pages/MessagesPage/components/Modals/GroupDetailsModal.jsx
import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import Avatar from "../../../../components/Avatar/Avatar";
import { getLoggedInUsername } from "../../../../utils/recentlyViewed";
import styles from "../../MessagesPage.module.css";

const GroupDetailsModal = memo(
  ({
    selectedChat,
    isGroupAdmin,
    myIdStr,
    handleRemoveUserFromGroup,
    setIsAddMemberModalOpen,
    setIsDeleteChatModalOpen,
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

    const getProfileLink = (targetUsername) => {
      const currentUsername = getLoggedInUsername();
      if (!targetUsername) return "/profile";

      if (
        currentUsername &&
        currentUsername.toLowerCase() === targetUsername.toLowerCase()
      ) {
        return "/profile";
      }
      return `/user/${targetUsername}`;
    };

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
            <div className={styles.groupModalTitleRow}>
              <h3>{selectedChat.chatName}</h3>
              <span className={styles.groupBadgeSubtitle}>
                {selectedChat.users?.length || 0} members
              </span>
            </div>

            <button
              type="button"
              className={styles.closeModalBtn}
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          {isGroupAdmin && (
            <button
              type="button"
              className={styles.addMemberTriggerBtn}
              onClick={() => {
                handleClose();
                setTimeout(() => {
                  setIsAddMemberModalOpen(true);
                }, 200);
              }}
            >
              + Add Members
            </button>
          )}

          <div className={styles.userSelectionContainer}>
            <span className={styles.selectTitle}>Group Members</span>

            <div className={styles.userSelectionList}>
              {selectedChat.users?.map((u, idx) => {
                const isAdminUser =
                  (
                    selectedChat.groupAdmin?._id || selectedChat.groupAdmin
                  )?.toString() === (u._id || u).toString();
                const isMe = (u._id || u).toString() === myIdStr;

                const isUserDeleted =
                  u.isDeleted || u.username?.startsWith("deleted_user_");

                const displayUsername = isUserDeleted
                  ? "Deleted User"
                  : u.username;

                const displayFullName = isUserDeleted
                  ? "Account Deleted"
                  : u.fullName;

                const displayAvatarUser = isUserDeleted
                  ? {
                      ...u,
                      username: "Deleted User",
                      fullName: "Account Deleted",
                      isDeleted: true,
                    }
                  : u;

                return (
                  <div
                    key={u._id || u}
                    className={styles.memberListItem}
                    style={{ "--stagger-index": idx }}
                  >
                    {!isUserDeleted ? (
                      <Link
                        to={getProfileLink(u.username)}
                        className={styles.memberUserLink}
                        onClick={handleClose}
                        title={`View ${u.username}'s profile`}
                      >
                        <div className={styles.modalAvatarWrapper}>
                          <Avatar user={displayAvatarUser} size={38} />
                        </div>

                        <div className={styles.memberInfo}>
                          <span className={styles.selectUsername}>
                            {displayUsername} {isMe ? "(You)" : ""}
                          </span>
                          {displayFullName && (
                            <span className={styles.globalFullName}>
                              {displayFullName}
                            </span>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className={styles.memberUserStatic}>
                        <Avatar user={displayAvatarUser} size={38} />
                        <div className={styles.memberInfo}>
                          <span className={styles.selectUsername}>
                            {displayUsername} {isMe ? "(You)" : ""}
                          </span>
                          <span className={styles.globalFullName}>
                            {displayFullName}
                          </span>
                        </div>
                      </div>
                    )}

                    {isAdminUser && (
                      <span className={styles.adminBadge}>Admin</span>
                    )}

                    {isGroupAdmin && !isMe && (
                      <button
                        type="button"
                        className={styles.removeMemberBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUserFromGroup(u);
                        }}
                        title="Remove member"
                      >
                        Remove
                      </button>
                    )}
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
              Close
            </button>

            <button
              type="button"
              className={styles.createBtn}
              style={{ backgroundColor: "#ed4956" }}
              onClick={() => {
                handleClose();
                setTimeout(() => {
                  setIsDeleteChatModalOpen(true);
                }, 200);
              }}
            >
              {isGroupAdmin ? "Delete Group" : "Leave Group"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);

GroupDetailsModal.displayName = "GroupDetailsModal";
GroupDetailsModal.propTypes = {
  selectedChat: PropTypes.object,
  isGroupAdmin: PropTypes.bool,
  myIdStr: PropTypes.string,
  handleRemoveUserFromGroup: PropTypes.func,
  setIsAddMemberModalOpen: PropTypes.func,
  setIsDeleteChatModalOpen: PropTypes.func,
  onClose: PropTypes.func,
};

export default GroupDetailsModal;
