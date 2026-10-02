import { memo, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "../MessagesPage.module.css";

const ChatInputFooter = memo(
  ({
    isChatDeletedByPartner,
    isPartnerAccountDeleted,
    isGroupChat,
    isCurrentUserMember,
    newMessage,
    handleSendMessage,
    handleTypingInput,
    handleInputKeyDown,
  }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
      if (textareaRef.current) {
        if (!newMessage) {
          textareaRef.current.style.height = "auto";
        } else {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            120,
          )}px`;
        }
      }
    }, [newMessage]);

    const onKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (newMessage.trim()) {
          handleSendMessage(e);
        }
      } else if (handleInputKeyDown) {
        handleInputKeyDown(e);
      }
    };

    if (isPartnerAccountDeleted) {
      return (
        <div className={styles.deletedNoticeBanner}>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <span>
            This account has been deleted. Messages are kept for your safety.
          </span>
        </div>
      );
    }

    if (isChatDeletedByPartner) {
      return (
        <div className={styles.deletedNoticeBanner}>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <span>
            The other user has deleted this chat. Messages are kept for your
            safety.
          </span>
        </div>
      );
    }

    if (isGroupChat && !isCurrentUserMember) {
      return (
        <div className={styles.deletedNoticeBanner}>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <span>
            You were removed from this group. Messages are kept for your safety,
            but you can no longer write here.
          </span>
        </div>
      );
    }

    return (
      <form className={styles.inputFooter} onSubmit={handleSendMessage}>
        <div className={styles.inputPill}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Write a message..."
            value={newMessage}
            onChange={handleTypingInput}
            onKeyDown={onKeyDown}
            className={styles.commentInput}
            style={{ resize: "none" }}
          />

          <button
            type="submit"
            className={styles.sendBtn}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </form>
    );
  },
);

ChatInputFooter.displayName = "ChatInputFooter";
ChatInputFooter.propTypes = {
  isChatDeletedByPartner: PropTypes.bool,
  isPartnerAccountDeleted: PropTypes.bool,
  isGroupChat: PropTypes.bool,
  isCurrentUserMember: PropTypes.bool,
  newMessage: PropTypes.string,
  handleSendMessage: PropTypes.func,
  handleTypingInput: PropTypes.func,
  handleInputKeyDown: PropTypes.func,
};

export default ChatInputFooter;
