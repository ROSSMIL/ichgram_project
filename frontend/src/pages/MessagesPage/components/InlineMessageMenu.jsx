// src/pages/MessagesPage/components/InlineMessageMenu.jsx
import { useState, useRef, useLayoutEffect, memo } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { QUICK_EMOJIS } from "../utils/messagesUtils";
import styles from "../MessagesPage.module.css";

const InlineMessageMenu = memo(
  ({
    isMyMessage,
    msg,
    isClosing,
    triggerRef,
    onToggleReaction,
    onStartEdit,
    onDeleteMessage,
    onCloseAnimated,
  }) => {
    const [activeTab, setActiveTab] = useState(
      isMyMessage ? "actions" : "reactions",
    );
    const [coords, setCoords] = useState({ top: 0, left: 0, showAbove: true });
    const menuRef = useRef(null);

    useLayoutEffect(() => {
      if (!triggerRef?.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 110;
      const menuWidth = menuRef.current?.offsetWidth || 250;

      const spaceAbove = triggerRect.top;
      const showAbove = spaceAbove > menuHeight + 30;

      let top = showAbove
        ? triggerRect.top - menuHeight - 10
        : triggerRect.bottom + 10;

      let left = isMyMessage ? triggerRect.right - menuWidth : triggerRect.left;

      left = Math.max(12, Math.min(left, window.innerWidth - menuWidth - 12));

      setCoords({ top, left, showAbove });
    }, [triggerRef, isMyMessage]);

    const menuContent = (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 9999,
        }}
        className={`${styles.inlineMenuPopover} ${
          coords.showAbove ? styles.popAbove : styles.popBelow
        } ${isClosing ? styles.menuClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.actionModalContainer}>
          {isMyMessage && (
            <div className={styles.tabSwitcher}>
              <div
                className={styles.glider}
                style={{
                  transform:
                    activeTab === "actions"
                      ? "translateX(0%)"
                      : "translateX(100%)",
                }}
              />
              <button
                type="button"
                className={`${styles.switchTab} ${
                  activeTab === "actions" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("actions")}
              >
                Actions
              </button>
              <button
                type="button"
                className={`${styles.switchTab} ${
                  activeTab === "reactions" ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab("reactions")}
              >
                Reactions
              </button>
            </div>
          )}

          <div className={styles.modalBodyViewport}>
            {!isMyMessage || activeTab === "reactions" ? (
              <div className={styles.quickEmojiBar}>
                {QUICK_EMOJIS.map((emoji, idx) => {
                  const hasReacted = msg.reactions?.some(
                    (r) =>
                      r.emoji === emoji &&
                      r.users?.some(
                        (uId) => (uId._id || uId).toString() === msg.myIdStr,
                      ),
                  );

                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`${styles.emojiPickerBtn} ${
                        hasReacted ? styles.activeEmojiBtn : ""
                      }`}
                      style={{ "--emoji-idx": idx }}
                      onClick={() =>
                        onCloseAnimated(() => onToggleReaction(msg._id, emoji))
                      }
                    >
                      <span className={styles.emojiInner}>{emoji}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.actionsGroupContent}>
                <button
                  type="button"
                  className={styles.actionBtnWithLabel}
                  onClick={() => onCloseAnimated(() => onStartEdit(msg))}
                >
                  <svg viewBox="0 0 24 24" className={styles.actionIconSvg}>
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className={`${styles.actionBtnWithLabel} ${styles.deleteActionBtn}`}
                  onClick={() => onCloseAnimated(() => onDeleteMessage(msg))}
                >
                  <svg viewBox="0 0 24 24" className={styles.actionIconSvg}>
                    <polyline
                      points="3 6 5 6 21 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );

    return createPortal(menuContent, document.body);
  },
);

InlineMessageMenu.displayName = "InlineMessageMenu";
InlineMessageMenu.propTypes = {
  isMyMessage: PropTypes.bool,
  msg: PropTypes.object,
  isClosing: PropTypes.bool,
  triggerRef: PropTypes.object,
  onToggleReaction: PropTypes.func,
  onStartEdit: PropTypes.func,
  onDeleteMessage: PropTypes.func,
  onCloseAnimated: PropTypes.func,
};

export default InlineMessageMenu;
