import { useState, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import CheckmarkIcon from "./CheckmarkIcon";
import SenderProfilePortal from "./SenderProfilePortal";
import InlineMessageMenu from "./InlineMessageMenu";
import { getProfileLink } from "../utils/messagesUtils";
import styles from "../MessagesPage.module.css";

const MessageItem = memo(
  ({
    msg,
    isMyMessage,
    isEditing,
    isDeleted,
    isRead,
    isActive,
    editingContent,
    setEditingContent,
    onSaveEdit,
    onCancelEdit,
    onStartEdit,
    onDeleteMessage,
    onToggleReaction,
    onTriggerClick,
    onClosePortalAnimated,
    isClosing,
    selectedChat,
    currentUserUsername,
  }) => {
    const itemRef = useRef(null);
    const textareaRef = useRef(null);
    const triggerBtnRef = useRef(null);
    const senderLinkRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    const [isHoveredSender, setIsHoveredSender] = useState(false);
    const [isClosingSender, setIsClosingSender] = useState(false);

    const isSenderDeleted =
      msg.sender?.isDeleted ||
      msg.sender?.username?.startsWith("deleted_user_");
    const handleMouseEnterSender = () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setIsClosingSender(false);
      setIsHoveredSender(true);
    };

    const handleMouseLeaveSender = () => {
      setIsClosingSender(true);
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHoveredSender(false);
        setIsClosingSender(false);
      }, 200);
    };

    useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      };
    }, []);

    const formatTime = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          160,
        )}px`;
      }
    }, [isEditing, editingContent]);

    if (msg.isSystem) {
      return (
        <div className={styles.systemMessageContainer}>
          <span className={styles.systemMessageBubble}>{msg.content}</span>
        </div>
      );
    }

    return (
      <div
        className={`${styles.messageOuterContainer} ${
          isMyMessage ? styles.myOuter : styles.theirOuter
        }`}
      >
        <div
          ref={itemRef}
          className={`${styles.messageBubble} ${
            isMyMessage ? styles.myMessage : styles.theirMessage
          } ${msg.isSending ? styles.sending : ""} ${
            isDeleted ? styles.deletedMessage : ""
          } ${isEditing ? styles.editingBubble : ""} ${styles.msgPopIn}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isDeleted && !isEditing) {
              onToggleReaction(msg._id, "❤️");
            }
          }}
        >
          <div className={styles.floatWrapper}>
            {!isMyMessage && selectedChat?.isGroupChat && (
              <div className={styles.senderNameContainer}>
                {isSenderDeleted ? (
                  <div
                    ref={senderLinkRef}
                    className={styles.deletedSenderBadge}
                    onMouseEnter={handleMouseEnterSender}
                    onMouseLeave={handleMouseLeaveSender}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.deletedSenderIcon}
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="17" y1="8" x2="22" y2="13" />
                      <line x1="22" y1="8" x2="17" y2="13" />
                    </svg>
                    <span className={styles.deletedSenderText}>
                      Deleted User
                    </span>
                  </div>
                ) : (
                  <Link
                    ref={senderLinkRef}
                    to={getProfileLink(
                      msg.sender?.username,
                      currentUserUsername,
                    )}
                    className={styles.senderNameLink}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={handleMouseEnterSender}
                    onMouseLeave={handleMouseLeaveSender}
                  >
                    <span className={styles.senderNameText}>
                      {msg.sender?.username || "User"}
                    </span>
                  </Link>
                )}

                <SenderProfilePortal
                  sender={
                    isSenderDeleted
                      ? {
                          username: "Deleted User",
                          fullName: "Account Deleted",
                          isDeleted: true,
                        }
                      : msg.sender
                  }
                  linkRef={senderLinkRef}
                  isHovered={isHoveredSender}
                  isClosing={isClosingSender}
                  onMouseEnter={handleMouseEnterSender}
                  onMouseLeave={handleMouseLeaveSender}
                  currentUsername={currentUserUsername}
                />
              </div>
            )}

            {isEditing ? (
              <div className={styles.luxuryEditContainer}>
                <div className={styles.editHeaderLabel}>
                  <svg
                    viewBox="0 0 24 24"
                    className={styles.editHeaderIcon}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit message</span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSaveEdit(msg._id);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      onCancelEdit();
                    }
                  }}
                  className={styles.luxuryEditTextarea}
                  rows={1}
                  autoFocus
                />

                <div className={styles.luxuryEditFooter}>
                  <span className={styles.editHintText}>
                    Enter to save • Esc to cancel
                  </span>

                  <div className={styles.luxuryEditActions}>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className={styles.luxuryCancelBtn}
                      title="Cancel"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSaveEdit(msg._id)}
                      disabled={!editingContent.trim()}
                      className={styles.luxurySaveBtn}
                      title="Save changes"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.bubbleBody}>
                <p className={styles.messageContent}>
                  {isDeleted ? (
                    <span className={styles.deletedContentInner}>
                      <svg
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.deletedIconSvg}
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      This message was deleted
                    </span>
                  ) : (
                    msg.content
                  )}
                </p>

                <div className={styles.metaWrapper}>
                  {msg.isEdited && !isDeleted && (
                    <span className={styles.editedTag}>(edited)</span>
                  )}

                  <span className={styles.messageTime}>
                    {formatTime(msg.createdAt)}
                  </span>

                  {isMyMessage && (
                    <CheckmarkIcon isRead={isRead} isSending={msg.isSending} />
                  )}
                </div>
              </div>
            )}

            {msg.reactions &&
              msg.reactions.length > 0 &&
              !isDeleted &&
              !isEditing && (
                <div className={styles.reactionsList}>
                  {msg.reactions.map((r) => {
                    const hasMyReaction = r.users?.some(
                      (uId) => (uId._id || uId).toString() === msg.myIdStr,
                    );
                    const count = r.users?.length || 0;

                    return (
                      <button
                        key={r.emoji}
                        type="button"
                        className={`${styles.reactionBadge} ${
                          hasMyReaction ? styles.myReactionBadge : ""
                        } ${styles.reactionBadgeAnimated}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleReaction(msg._id, r.emoji);
                        }}
                        title={`${count} reactions`}
                      >
                        <span className={styles.reactionEmoji}>{r.emoji}</span>
                        <span
                          key={count}
                          className={styles.reactionCountAnimated}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {!isDeleted && !isEditing && (
          <div className={styles.actionTriggerWrapper}>
            <button
              ref={triggerBtnRef}
              type="button"
              className={`${styles.threeDotsCircleBtn} ${
                isActive ? styles.threeDotsActive : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onTriggerClick(msg._id);
              }}
              title="Options"
            >
              <svg viewBox="0 0 24 24" className={styles.threeDotsSvg}>
                <circle cx="5" cy="12" r="2" fill="currentColor" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <circle cx="19" cy="12" r="2" fill="currentColor" />
              </svg>
            </button>
          </div>
        )}

        {(isActive || isClosing) && (
          <InlineMessageMenu
            isMyMessage={isMyMessage}
            msg={msg}
            isClosing={isClosing}
            triggerRef={triggerBtnRef}
            onToggleReaction={onToggleReaction}
            onStartEdit={onStartEdit}
            onDeleteMessage={onDeleteMessage}
            onCloseAnimated={onClosePortalAnimated}
          />
        )}
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";
MessageItem.propTypes = {
  msg: PropTypes.object,
  isMyMessage: PropTypes.bool,
  isEditing: PropTypes.bool,
  isDeleted: PropTypes.bool,
  isRead: PropTypes.bool,
  isActive: PropTypes.bool,
  editingContent: PropTypes.string,
  setEditingContent: PropTypes.func,
  onSaveEdit: PropTypes.func,
  onCancelEdit: PropTypes.func,
  onStartEdit: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onToggleReaction: PropTypes.func,
  onTriggerClick: PropTypes.func,
  onClosePortalAnimated: PropTypes.func,
  isClosing: PropTypes.bool,
  selectedChat: PropTypes.object,
  currentUserUsername: PropTypes.string,
};

export default MessageItem;
