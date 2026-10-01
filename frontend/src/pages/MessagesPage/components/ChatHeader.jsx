import { memo, useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Avatar from "../../../components/Avatar/Avatar";
import HeaderStatusTextSwitcher from "./HeaderStatusTextSwitcher";
import { getProfileLink } from "../utils/messagesUtils";
import styles from "../MessagesPage.module.css";

const ChatHeader = memo(
  ({
    selectedChat,
    partnerUser,
    partnerUsername,
    currentUser,
    isUserOnline,
    rawPresence,
    displayTypingUsers,
    typingUsers,
    isGroup,
    isGroupAdmin,
    setSelectedChat,
    setTypingUsers,
    setDisplayTypingUsers,
    setEditingMessageId,
    setEditingContent,
    handleClosePortalAnimated,
    setIsGroupDetailsModalOpen,
    onOpenHideChatModal,
    onOpenPermanentDeleteModal,
    setIsDeleteChatModalOpen,
  }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuClosing, setIsMenuClosing] = useState(false);
    const menuRef = useRef(null);

    const closeMenuSmoothly = useCallback(() => {
      setIsMenuClosing(true);
      setTimeout(() => {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
      }, 180);
    }, []);

    const toggleMenu = () => {
      if (isMenuOpen) {
        closeMenuSmoothly();
      } else {
        setIsMenuOpen(true);
        setIsMenuClosing(false);
      }
    };

    const isPartnerDeleted =
      !selectedChat?.isGroupChat &&
      (partnerUser?.isDeleted ||
        partnerUser?.username?.startsWith("deleted_user_") ||
        partnerUsername === "Deleted User");

    const targetUsername = isPartnerDeleted
      ? partnerUser?.username || partnerUsername || "Deleted User"
      : partnerUsername;

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          if (isMenuOpen && !isMenuClosing) {
            closeMenuSmoothly();
          }
        }
      };
      if (isMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isMenuOpen, isMenuClosing, closeMenuSmoothly]);

    return (
      <div className={styles.chatHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => {
            setSelectedChat(null);
            setTypingUsers([]);
            setDisplayTypingUsers([]);
            setEditingMessageId(null);
            setEditingContent("");
            handleClosePortalAnimated();
          }}
          title="Back to chats"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className={styles.userInfo}>
          {selectedChat.isGroupChat ? (
            <div
              className={`${styles.authorBadge} ${styles.groupHeaderClickable}`}
              onClick={() => setIsGroupDetailsModalOpen(true)}
              title="View Group Info"
            >
              <div className={styles.groupAvatarHeader}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                  />
                </svg>
              </div>

              <span className={styles.username}>{selectedChat.chatName}</span>
            </div>
          ) : (
            <Link
              to={getProfileLink(targetUsername, currentUser?.username)}
              className={styles.authorBadge}
            >
              <Avatar
                user={
                  isPartnerDeleted
                    ? {
                        ...partnerUser,
                        username: "Deleted User",
                        fullName: "Deleted User",
                        isDeleted: true,
                        avatar: "",
                      }
                    : partnerUser
                }
                size={36}
              />
              <span className={styles.username}>
                {isPartnerDeleted ? "Deleted User" : partnerUsername}
              </span>
            </Link>
          )}

          <div className={styles.userMeta}>
            <span className={styles.dot}>•</span>
            {selectedChat.isGroupChat ? (
              <span
                className={`${styles.statusText} ${styles.groupStatusClickable}`}
                onClick={() => setIsGroupDetailsModalOpen(true)}
              >
                {`${selectedChat.users?.length || 0} members`}
              </span>
            ) : isPartnerDeleted ? (
              <span className={styles.statusText}>Account Deleted</span>
            ) : (
              <HeaderStatusTextSwitcher
                statusKey={
                  isUserOnline ? rawPresence?.status || "online" : "offline"
                }
                isUserOnline={isUserOnline}
              />
            )}
          </div>
        </div>

        {displayTypingUsers.length > 0 && !isPartnerDeleted && (
          <div
            className={`${styles.floatingTypingBanner} ${
              typingUsers.length > 0 ? styles.typingBannerVisible : ""
            }`}
          >
            <div className={styles.typingBannerContent}>
              {selectedChat.isGroupChat ? (
                <>
                  <span className={styles.typingTextName}>
                    {displayTypingUsers.length === 1
                      ? displayTypingUsers[0].username
                      : `${displayTypingUsers[0].username} +${displayTypingUsers.length - 1}`}
                  </span>
                  <span className={styles.typingTextAction}>
                    {displayTypingUsers.length > 1 ? "are typing" : "is typing"}
                  </span>
                </>
              ) : (
                <span className={styles.typingTextAction}>typing</span>
              )}

              <div className={styles.typingDots}>
                <span className={styles.dotWave}></span>
                <span className={styles.dotWave}></span>
                <span className={styles.dotWave}></span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.headerMenuWrapper} ref={menuRef}>
          <button
            type="button"
            className={styles.deleteChatHeaderBtn}
            onClick={toggleMenu}
            title="Chat Options"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              className={`${styles.headerDropdownMenu} ${
                isMenuClosing ? styles.headerDropdownMenuClosing : ""
              }`}
            >
              {isGroup ? (
                <button
                  type="button"
                  className={`${styles.headerMenuItem} ${styles.headerMenuItemDanger}`}
                  onClick={() => {
                    closeMenuSmoothly();
                    setIsDeleteChatModalOpen(true);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>{isGroupAdmin ? "Delete Group" : "Leave Group"}</span>
                </button>
              ) : isPartnerDeleted ? (
                <button
                  type="button"
                  className={`${styles.headerMenuItem} ${styles.headerMenuItemDanger}`}
                  onClick={() => {
                    closeMenuSmoothly();
                    onOpenPermanentDeleteModal();
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete Chat</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.headerMenuItem}
                    onClick={() => {
                      closeMenuSmoothly();
                      onOpenHideChatModal();
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <span>Hide Chat</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.headerMenuItem} ${styles.headerMenuItemDanger}`}
                    onClick={() => {
                      closeMenuSmoothly();
                      onOpenPermanentDeleteModal();
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete for Everyone</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ChatHeader.displayName = "ChatHeader";
ChatHeader.propTypes = {
  selectedChat: PropTypes.object,
  partnerUser: PropTypes.object,
  partnerUsername: PropTypes.string,
  currentUser: PropTypes.object,
  isUserOnline: PropTypes.bool,
  rawPresence: PropTypes.object,
  displayTypingUsers: PropTypes.array,
  typingUsers: PropTypes.array,
  isGroup: PropTypes.bool,
  isGroupAdmin: PropTypes.bool,
  setSelectedChat: PropTypes.func,
  setTypingUsers: PropTypes.func,
  setDisplayTypingUsers: PropTypes.func,
  setEditingMessageId: PropTypes.func,
  setEditingContent: PropTypes.func,
  handleClosePortalAnimated: PropTypes.func,
  setIsGroupDetailsModalOpen: PropTypes.func,
  onOpenHideChatModal: PropTypes.func,
  onOpenPermanentDeleteModal: PropTypes.func,
  setIsDeleteChatModalOpen: PropTypes.func,
};

export default ChatHeader;
