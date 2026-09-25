import {
  useState,
  useEffect,
  memo,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../../context/useSocket.js";
import { createPortal } from "react-dom";
import API from "../../api/axios.js";
import Avatar from "../../components/Avatar/Avatar";
import PageHeader from "../../components/PageHeader/PageHeader";
import styles from "./MessagesPage.module.css";

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

const formatLatestMessage = (chat) => {
  const msg = chat?.latestMessage;
  if (!msg) return "No messages yet";

  if (msg.isSystem) {
    return msg.content;
  }

  const senderName = msg.sender?.username || "User";
  return chat.isGroupChat ? `${senderName}: ${msg.content}` : msg.content;
};

const formatMessageDateDivider = (dateString) => {
  if (!dateString) return "";
  const msgDate = new Date(dateString);
  const now = new Date();
  const isToday = msgDate.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = msgDate.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  const isSameYear = msgDate.getFullYear() === now.getFullYear();
  if (isSameYear) {
    return msgDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return msgDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const CheckmarkIcon = memo(({ isRead, isSending }) => {
  if (isSending) {
    return (
      <span
        className={`${styles.readStatus} ${styles.sendingStatus}`}
        title="Sending..."
      >
        <svg
          viewBox="0 0 12 11"
          className={styles.singleCheckSvg}
          style={{ opacity: 0.5 }}
        >
          <path
            d="M1.5 5.5L4.5 8.5L10.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (isRead) {
    return (
      <span className={`${styles.readStatus} ${styles.read}`} title="Read">
        <svg viewBox="0 0 16 11" className={styles.doubleCheckSvg}>
          <path
            d="M1.5 5.5L4.5 8.5L10.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 5.5L8.5 8.5L14.5 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${styles.readStatus} ${styles.unread}`} title="Sent">
      <svg viewBox="0 0 12 11" className={styles.singleCheckSvg}>
        <path
          d="M1.5 5.5L4.5 8.5L10.5 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
});

CheckmarkIcon.displayName = "CheckmarkIcon";
CheckmarkIcon.propTypes = { isRead: PropTypes.bool, isSending: PropTypes.bool };

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

const HeaderStatusTextSwitcher = memo(({ statusKey, isUserOnline }) => {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [delayedStatus, setDelayedStatus] = useState(null);
  const [bubbleWidth, setBubbleWidth] = useState("auto");

  const activeDisplayStatus = !isUserOnline
    ? "offline"
    : delayedStatus || (statusKey === "messages" ? "online" : "online");

  useEffect(() => {
    if (!isUserOnline) return;

    let timer;
    if (statusKey === "messages") {
      timer = setTimeout(() => {
        setDelayedStatus("messages");
      }, 300);
    } else {
      timer = setTimeout(() => {
        setDelayedStatus("online");
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [statusKey, isUserOnline]);

  useLayoutEffect(() => {
    if (measureRef.current) {
      const rect = measureRef.current.getBoundingClientRect();
      const targetWidth = Math.ceil(rect.width) + 26;
      setBubbleWidth(`${targetWidth}px`);
    }
  }, [activeDisplayStatus, isUserOnline]);

  if (!isUserOnline) {
    return (
      <div className={`${styles.headerStatusBubble} ${styles.bubbleOffline}`}>
        <span className={`${styles.bubbleDot} ${styles.dotOffline}`} />
        <span className={styles.statusContentInner}>Offline</span>
      </div>
    );
  }

  const isDirect = activeDisplayStatus === "messages";

  return (
    <div
      ref={containerRef}
      className={`${styles.headerStatusBubble} ${isDirect ? styles.bubbleDirect : styles.bubbleOnline}`}
      style={{ width: bubbleWidth }}
    >
      <div
        ref={measureRef}
        className={styles.measureContainer}
        aria-hidden="true"
      >
        <span className={styles.bubbleDot} />
        {isDirect ? (
          <span className={styles.statusContentInner}>
            <svg
              aria-label="Direct"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "5px" }}
            >
              <line x1="22" x2="9.218" y1="2" y2="10.083" />
              <polygon
                fill="currentColor"
                points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
              />
            </svg>
            In Direct Messages
          </span>
        ) : (
          <span className={styles.statusContentInner}>Online</span>
        )}
      </div>

      <span
        className={`${styles.bubbleDot} ${isDirect ? styles.dotPulse : styles.dotOnline}`}
      />

      <div className={styles.statusTextViewport}>
        <span key={activeDisplayStatus} className={styles.statusTextAnimated}>
          {isDirect ? (
            <span className={styles.statusContentInner}>
              <svg
                aria-label="Direct"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: "5px" }}
              >
                <line x1="22" x2="9.218" y1="2" y2="10.083" />
                <polygon
                  fill="currentColor"
                  points="22 2 1.93 9.312 8.781 12.656 12.125 19.507 22 2"
                />
              </svg>
              In Direct Messages
            </span>
          ) : (
            <span className={styles.statusContentInner}>Online</span>
          )}
        </span>
      </div>
    </div>
  );
});

HeaderStatusTextSwitcher.displayName = "HeaderStatusTextSwitcher";
HeaderStatusTextSwitcher.propTypes = {
  statusKey: PropTypes.string,
  isUserOnline: PropTypes.bool,
};

const getLoggedInUsername = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username;
  } catch (e) {
    console.error("Failed to decode token:", e);
    return null;
  }
};

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
  }) => {
    const itemRef = useRef(null);
    const textareaRef = useRef(null);
    const triggerBtnRef = useRef(null);

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
              <span className={styles.senderName}>{msg.sender?.username}</span>
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
};

const MessagesPage = () => {
  const { socket, onlineUsers } = useSocket();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [socketDeletedChatId, setSocketDeletedChatId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingMessageTarget, setDeletingMessageTarget] = useState(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const [closingActionId, setClosingActionId] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [allGlobalUsers, setAllGlobalUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [isGroupDetailsModalOpen, setIsGroupDetailsModalOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadScrollCount, setUnreadScrollCount] = useState(0);

  const [cannotRemoveModalUser, setCannotRemoveModalUser] = useState(null);

  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);
  const handledLocationStateRef = useRef(false);
  const showScrollBottomRef = useRef(showScrollBottom);
  const messagesEndRef = useRef(null);

  const [isOlderThan15Min, setIsOlderThan15Min] = useState(false);

  const myId = currentUser?._id || currentUser?.id || currentUser?.userId;
  const myIdStr = myId?.toString();

  const isCurrentUserMember = useMemo(() => {
    if (!selectedChat || !selectedChat.isGroupChat || !myIdStr) return true;
    return selectedChat.users?.some(
      (u) => (u._id || u.id || u).toString() === myIdStr,
    );
  }, [selectedChat, myIdStr]);

  useEffect(() => {
    showScrollBottomRef.current = showScrollBottom;
  }, [showScrollBottom]);

  const pendingScrollRef = useRef({
    isMyOwn: false,
    smooth: false,
    force: false,
  });

  const [sessionLastReadMessage, setSessionLastReadMessage] = useState(null);
  const [isHidingNewMessages, setIsHidingNewMessages] = useState(false);

  const sortedMessages = useMemo(() => {
    if (!messages.length) return [];
    return [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
  }, [messages]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;

    const currentUnreadForThisChat = selectedChat?._id
      ? unreadCounts[selectedChat._id] || 0
      : 0;

    window.dispatchEvent(
      new CustomEvent("activeChatChanged", {
        detail: {
          chatId: selectedChat?._id || null,
          unreadCountForChat: currentUnreadForThisChat,
        },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("activeChatChanged", {
          detail: { chatId: null, unreadCountForChat: 0 },
        }),
      );
    };
  }, [selectedChat, unreadCounts]);

  const handleSelectChat = useCallback((chat) => {
    setSelectedChat(chat);
    setIsTyping(false);
    setEditingMessageId(null);
    setEditingContent("");
    setSessionLastReadMessage(null);
    setIsHidingNewMessages(false);
    setShowScrollBottom(false);
    setUnreadScrollCount(0);

    if (chat?._id) {
      setUnreadCounts((prev) => ({
        ...prev,
        [chat._id]: 0,
      }));
    }
  }, []);

  const handleStartDirectChat = useCallback(
    async (targetUserId) => {
      try {
        setIsSearchingUsers(true);
        const { data } = await API.post("/api/chat", { userId: targetUserId });

        setChats((prev) => {
          if (!prev.some((c) => c._id === data._id)) {
            return [data, ...prev];
          }
          return prev;
        });

        handleSelectChat(data);
        setSidebarSearch("");
      } catch (err) {
        console.error("Error opening chat with user:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    },
    [handleSelectChat],
  );

  const handleClosePortalAnimated = useCallback((actionCallback) => {
    setActiveActionId((prevActiveId) => {
      if (!prevActiveId) {
        if (actionCallback) actionCallback();
        return null;
      }

      setClosingActionId(prevActiveId);

      setTimeout(() => {
        if (actionCallback) actionCallback();
        setClosingActionId(null);
      }, 180);

      return null;
    });
  }, []);

  const scrollToBottom = useCallback(
    (isMyOwnMessage = false, smooth = false, force = false) => {
      if (!messagesContainerRef.current) return;

      const container = messagesContainerRef.current;
      const { scrollHeight, clientHeight, scrollTop } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (force || isMyOwnMessage || isNearBottom) {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "end",
          });
        } else {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: smooth ? "smooth" : "auto",
          });
        }
      }
    },
    [],
  );

  const handleContainerScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom > 220) {
      setShowScrollBottom(true);
    } else {
      setShowScrollBottom(false);
      setUnreadScrollCount(0);
    }
  }, []);

  useLayoutEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      const { isMyOwn, smooth, force } = pendingScrollRef.current;
      scrollToBottom(isMyOwn, smooth, force);

      pendingScrollRef.current = {
        isMyOwn: false,
        smooth: false,
        force: false,
      };
    }
  }, [messages, loadingMessages, scrollToBottom]);

  const refreshChats = async () => {
    try {
      const { data } = await API.get("/api/chat");
      setChats(data);
      if (selectedChatRef.current) {
        const updatedSelected = data.find(
          (c) => c._id === selectedChatRef.current._id,
        );
        if (updatedSelected) {
          setSelectedChat(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Error refreshing chats:", err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/api/users/profile");
        setCurrentUser(data);

        if (socket && selectedChatRef.current) {
          socket.emit("join chat", selectedChatRef.current._id);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchProfile();
  }, [socket]);

  useEffect(() => {
    let isMounted = true;

    const loadChatsAndUsers = async () => {
      try {
        const [chatsRes, usersRes, unreadRes] = await Promise.all([
          API.get("/api/chat"),
          API.get("/api/users/search/all"),
          API.get("/api/notifications/unread-by-chat"),
        ]);

        if (isMounted) {
          setChats(chatsRes.data);
          setAllGlobalUsers(usersRes.data);
          if (unreadRes.data) {
            setUnreadCounts(unreadRes.data);
          }
        }
      } catch (err) {
        console.error("Error fetching initial chats or users:", err);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    };

    loadChatsAndUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    handledLocationStateRef.current = false;
  }, [location.state]);

  useEffect(() => {
    if (!loadingChats && location.state && !handledLocationStateRef.current) {
      const { openChatId, partnerId } = location.state;

      const activateAndJoin = (targetChat) => {
        handledLocationStateRef.current = true;
        handleSelectChat(targetChat);

        if (socket && targetChat?._id) {
          socket.emit("join chat", targetChat._id);
        }
      };

      if (openChatId) {
        const targetChat = chats.find(
          (c) => c._id.toString() === openChatId.toString(),
        );

        if (targetChat) {
          queueMicrotask(() => activateAndJoin(targetChat));
          return;
        }
      }

      if (partnerId) {
        queueMicrotask(() => {
          handledLocationStateRef.current = true;
          handleStartDirectChat(partnerId);
        });
      }
    }
  }, [
    loadingChats,
    location.state,
    chats,
    handleSelectChat,
    handleStartDirectChat,
    socket,
  ]);

  useEffect(() => {
    if (!selectedChat) return;

    let isMounted = true;

    const loadMessages = async () => {
      setLoadingMessages(true);

      try {
        const { data } = await API.get(`/api/message/${selectedChat._id}`);

        if (isMounted) {
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedChat._id]: 0,
          }));

          const firstUnread = data.find((msg) => {
            const senderId = (msg.sender?._id || msg.sender)?.toString();
            const isIncoming = senderId !== myIdStr;
            const isReadByMe = msg.readBy?.some(
              (id) => (id._id || id).toString() === myIdStr,
            );
            return isIncoming && !isReadByMe;
          });

          if (firstUnread) {
            setSessionLastReadMessage({
              id: firstUnread._id,
              createdAt: new Date(
                new Date(firstUnread.createdAt).getTime() - 1,
              ).toISOString(),
            });
          } else {
            setSessionLastReadMessage(null);
          }

          const updatedData = data.map((msg) => {
            const hasMyId = msg.readBy?.some(
              (id) => (id._id || id).toString() === myIdStr,
            );

            if (!hasMyId && myIdStr) {
              return { ...msg, readBy: [...(msg.readBy || []), myId] };
            }

            return msg;
          });

          pendingScrollRef.current = {
            isMyOwn: false,
            smooth: false,
            force: true,
          };

          setMessages(updatedData);
        }

        await API.put(`/api/message/mark-read/${selectedChat._id}`);

        if (socket) {
          socket.emit("join chat", selectedChat._id);
          if (myIdStr) {
            socket.emit("messages read", {
              chatId: selectedChat._id,
              userId: myId,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedChat, myId, myIdStr, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleChatCreated = (newChat) => {
      setChats((prev) => {
        const exists = prev.some((c) => c._id === newChat._id);
        if (exists) {
          return prev.map((c) => (c._id === newChat._id ? newChat : c));
        }
        return [newChat, ...prev];
      });

      socket.emit("join chat", newChat._id);
    };

    const handleGroupUpdated = (updatedGroupChat) => {
      const isStillMember = updatedGroupChat.users?.some(
        (u) => (u._id || u.id || u).toString() === myIdStr,
      );

      if (!isStillMember) {
        setChats((prev) => prev.filter((c) => c._id !== updatedGroupChat._id));

        if (selectedChatRef.current?._id === updatedGroupChat._id) {
          setSelectedChat(null);
          setMessages([]);
        }
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c._id === updatedGroupChat._id ? updatedGroupChat : c,
          ),
        );

        if (selectedChatRef.current?._id === updatedGroupChat._id) {
          setSelectedChat(updatedGroupChat);
        }
      }
    };

    const handleMessageReceived = (newMessageReceived) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = (
        newMessageReceived.chat?._id || newMessageReceived.chat
      )?.toString();

      if (activeChat && activeChat._id.toString() === incomingChatId) {
        const container = messagesContainerRef.current;
        let isUserAtBottom = true;

        if (container) {
          const { scrollHeight, clientHeight, scrollTop } = container;
          isUserAtBottom = scrollHeight - scrollTop - clientHeight < 150;
        }

        if (!isUserAtBottom || showScrollBottomRef.current) {
          setUnreadScrollCount((prev) => prev + 1);
        }

        pendingScrollRef.current = {
          isMyOwn: false,
          smooth: false,
          force: false,
        };

        setMessages((prev) => {
          if (prev.some((msg) => msg._id === newMessageReceived._id))
            return prev;
          return [...prev, newMessageReceived];
        });

        setSessionLastReadMessage({
          id: newMessageReceived._id,
          createdAt: newMessageReceived.createdAt,
        });

        API.put(`/api/message/mark-read/${activeChat._id}`);

        if (myIdStr) {
          socket.emit("messages read", {
            chatId: activeChat._id,
            userId: myId,
          });
        }
      } else {
        if (incomingChatId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [incomingChatId]: (prev[incomingChatId] || 0) + 1,
          }));
        }
      }

      refreshChats();
    };

    const handleMessageReaction = (updatedMessage) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = (
        updatedMessage.chat?._id || updatedMessage.chat
      )?.toString();

      if (activeChat && activeChat._id.toString() === incomingChatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg,
          ),
        );
      }
    };

    const handleMessageEdited = (updatedMessage) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = (
        updatedMessage.chat?._id || updatedMessage.chat
      )?.toString();

      if (activeChat && activeChat._id.toString() === incomingChatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg,
          ),
        );
      }

      refreshChats();
    };

    const handleMessageDeleted = (deletedData) => {
      const activeChat = selectedChatRef.current;
      const deletedMsgId =
        deletedData.messageId || deletedData._id || deletedData.message?._id;
      const incomingChatId = (
        deletedData.chatId ||
        deletedData.chat?._id ||
        deletedData.chat
      )?.toString();

      if (activeChat && activeChat._id.toString() === incomingChatId) {
        if (deletedData.isHardDelete) {
          setMessages((prev) => prev.filter((msg) => msg._id !== deletedMsgId));
        } else {
          const updatedMsg = deletedData.message || deletedData;

          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === deletedMsgId
                ? {
                    ...msg,
                    ...(updatedMsg._id ? updatedMsg : {}),
                    isDeleted: true,
                    content: "This message was deleted",
                  }
                : msg,
            ),
          );
        }
      }

      refreshChats();
    };

    const handleMessagesRead = ({ chatId, userId }) => {
      const activeChat = selectedChatRef.current;
      const targetChatId = (activeChat?._id || activeChat)?.toString();

      if (targetChatId === chatId?.toString()) {
        const userIdStr = userId?.toString();

        setMessages((prev) =>
          prev.map((msg) => {
            const alreadyRead = msg.readBy?.some(
              (id) => (id._id || id).toString() === userIdStr,
            );

            if (!alreadyRead) {
              return { ...msg, readBy: [...(msg.readBy || []), userId] };
            }

            return msg;
          }),
        );
      }
    };

    const handleChatDeleted = ({ chatId }) => {
      setSocketDeletedChatId(chatId);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (selectedChatRef.current?._id === chatId) {
        setSelectedChat(null);
      }
      refreshChats();
    };

    const handleTyping = ({ chatId, userId }) => {
      const activeChat = selectedChatRef.current;
      if (
        activeChat &&
        activeChat._id.toString() === chatId?.toString() &&
        userId?.toString() !== myIdStr
      ) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ chatId, userId }) => {
      const activeChat = selectedChatRef.current;
      if (
        activeChat &&
        activeChat._id.toString() === chatId?.toString() &&
        userId?.toString() !== myIdStr
      ) {
        setIsTyping(false);
      }
    };

    socket.on("chat created", handleChatCreated);
    socket.on("group updated", handleGroupUpdated);
    socket.on("message received", handleMessageReceived);
    socket.on("message reaction", handleMessageReaction);
    socket.on("message edited", handleMessageEdited);
    socket.on("message deleted", handleMessageDeleted);
    socket.on("messages read", handleMessagesRead);
    socket.on("chat deleted", handleChatDeleted);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);

    return () => {
      socket.off("chat created", handleChatCreated);
      socket.off("group updated", handleGroupUpdated);
      socket.off("message received", handleMessageReceived);
      socket.off("message reaction", handleMessageReaction);
      socket.off("message edited", handleMessageEdited);
      socket.off("message deleted", handleMessageDeleted);
      socket.off("messages read", handleMessagesRead);
      socket.off("chat deleted", handleChatDeleted);
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
  }, [socket, myId, myIdStr]);

  const handleConfirmDeleteChat = async () => {
    if (!selectedChat) return;

    const isGroup = selectedChat.isGroupChat;
    const isAdmin =
      isGroup &&
      (selectedChat.groupAdmin?._id || selectedChat.groupAdmin)?.toString() ===
        myIdStr;

    const chatId = selectedChat._id;

    try {
      if (socket) {
        socket.emit("leave chat", chatId);
      }

      if (isGroup && isCurrentUserMember && !isAdmin) {
        try {
          await API.put("/api/chat/groupremove", {
            chatId: chatId,
            userId: myId,
          });
        } catch (removeErr) {
          console.warn("Error leaving group:", removeErr);
        }
      } else {
        const { data } = await API.delete(`/api/chat/${chatId}`);

        if (socket && isAdmin) {
          socket.emit("chat deleted", {
            chatId: chatId,
            usersToNotify: data.usersToNotify,
          });
        }
      }

      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setSelectedChat(null);
      setMessages([]);

      setIsDeleteChatModalOpen(false);
      setIsGroupDetailsModalOpen(false);
    } catch (err) {
      console.error("Error deleting/leaving chat:", err);
    }
  };

  const handleRemoveUserFromGroup = useCallback(
    async (userObj) => {
      if (!selectedChat || !selectedChat.isGroupChat) return;

      if (selectedChat.users?.length <= 2) {
        setCannotRemoveModalUser(userObj);
        return;
      }

      const userIdToRemove = (userObj._id || userObj).toString();

      try {
        const { data } = await API.put("/api/chat/groupremove", {
          chatId: selectedChat._id,
          userId: userIdToRemove,
        });

        setSelectedChat(data);
        setChats((prev) => prev.map((c) => (c._id === data._id ? data : c)));
      } catch (err) {
        console.error("Error removing user from group:", err);
      }
    },
    [selectedChat],
  );

  const getChatSender = (users) => {
    if (!users || users.length === 0) return null;

    const partner = users.find((u) => {
      const uId = u._id || u.id || u;
      return uId?.toString() !== myIdStr;
    });

    return partner || users[0];
  };

  const partnerUser =
    selectedChat && !selectedChat.isGroupChat
      ? getChatSender(selectedChat.users)
      : null;

  const partnerUsername = partnerUser?.username || "Deleted User";
  const partnerIdStr = (
    partnerUser?._id ||
    partnerUser?.id ||
    partnerUser
  )?.toString();

  const rawPresence = onlineUsers?.[partnerIdStr];
  const isUserOnline = Boolean(rawPresence);

  const isChatDeletedByPartner = Boolean(
    selectedChat &&
    !selectedChat.isGroupChat &&
    (selectedChat.deletedFor?.some(
      (id) => (id._id || id).toString() === partnerIdStr,
    ) ||
      socketDeletedChatId === selectedChat._id),
  );

  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (
      isChatDeletedByPartner ||
      (selectedChat?.isGroupChat && !isCurrentUserMember) ||
      !newMessage.trim() ||
      !selectedChat ||
      !currentUser
    ) {
      return;
    }

    if (socket && selectedChat && myIdStr) {
      socket.emit("stop typing", { chatId: selectedChat._id, userId: myIdStr });
    }

    const messageContent = newMessage.trim();
    setNewMessage("");

    if (!myId) {
      console.error("Could not determine current user ID for sending.");
      return;
    }

    const tempId = "temp-" + Date.now();
    const nowIso = new Date().toISOString();

    const optimisticMessage = {
      _id: tempId,
      stableKey: tempId,
      content: messageContent,
      sender: {
        _id: myId,
        username: currentUser?.username,
        avatar: currentUser?.avatar,
      },
      chat: selectedChat,
      createdAt: nowIso,
      readBy: [myId],
      reactions: [],
      isSending: true,
    };

    pendingScrollRef.current = { isMyOwn: true, smooth: false, force: true };
    setMessages((prev) => [...prev, optimisticMessage]);

    if (sessionLastReadMessage) {
      setIsHidingNewMessages(true);

      setTimeout(() => {
        setSessionLastReadMessage({
          id: tempId,
          createdAt: nowIso,
        });
        setIsHidingNewMessages(false);
      }, 350);
    } else {
      setSessionLastReadMessage({
        id: tempId,
        createdAt: nowIso,
      });
    }

    try {
      const { data } = await API.post("/api/message", {
        content: messageContent,
        chatId: selectedChat._id,
      });

      if (socket) {
        socket.emit("new message", data);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId
            ? { ...data, stableKey: tempId, isSending: false }
            : msg,
        ),
      );

      setChats((prevChats) =>
        prevChats.map((c) =>
          c._id === selectedChat._id ? { ...c, latestMessage: data } : c,
        ),
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleStartEdit = useCallback((msg) => {
    setEditingMessageId(msg._id);
    setEditingContent(msg.content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
  }, []);

  const handleSaveEdit = useCallback(
    async (msgId) => {
      const newText = editingContent.trim();
      if (!newText) return;

      let previousMessage = null;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === msgId) {
            previousMessage = msg;
            return { ...msg, content: newText, isEdited: true };
          }
          return msg;
        }),
      );

      setEditingMessageId(null);

      try {
        const { data } = await API.put(`/api/message/${msgId}`, {
          content: newText,
        });

        setMessages((prev) =>
          prev.map((msg) => (msg._id === msgId ? data : msg)),
        );

        if (socket) socket.emit("message edited", data);
        refreshChats();
      } catch (err) {
        console.error("Error editing message:", err);
        if (previousMessage) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === msgId ? previousMessage : msg)),
          );
        }
      }
    },
    [editingContent, socket],
  );

  const handleRequestDeleteMessage = useCallback((msg) => {
    setDeletingMessageTarget(msg);

    if (msg?.createdAt) {
      const isOld =
        Date.now() - new Date(msg.createdAt).getTime() > 15 * 60 * 1000;
      setIsOlderThan15Min(isOld);
    } else {
      setIsOlderThan15Min(false);
    }
  }, []);

  const handleConfirmDeleteSingleMessage = useCallback(async () => {
    if (!deletingMessageTarget) return;

    const msgId = deletingMessageTarget._id;
    const isOld =
      Date.now() - new Date(deletingMessageTarget.createdAt).getTime() >
      15 * 60 * 1000;

    setDeletingMessageTarget(null);

    let previousMessagesState = [];

    setMessages((prev) => {
      previousMessagesState = prev;

      if (isOld) {
        return prev.map((msg) =>
          msg._id === msgId
            ? { ...msg, isDeleted: true, content: "This message was deleted" }
            : msg,
        );
      } else {
        return prev.filter((msg) => msg._id !== msgId);
      }
    });

    try {
      const { data } = await API.delete(`/api/message/${msgId}`);

      if (data.isHardDelete) {
        setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
      } else {
        const updatedMsg = data.message || data;
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === msgId
              ? {
                  ...msg,
                  ...(updatedMsg._id ? updatedMsg : {}),
                  isDeleted: true,
                  content: "This message was deleted",
                }
              : msg,
          ),
        );
      }

      if (socket) socket.emit("message deleted", data);
      refreshChats();
    } catch (err) {
      console.error("Error deleting message:", err);
      setMessages(previousMessagesState);
    }
  }, [deletingMessageTarget, socket]);

  const handleToggleReaction = useCallback(
    async (msgId, emoji) => {
      if (!myIdStr) return;

      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          if (msg._id !== msgId) return msg;

          let reactions = msg.reactions
            ? JSON.parse(JSON.stringify(msg.reactions))
            : [];

          const targetGroup = reactions.find((r) => r.emoji === emoji);

          const hasMyReaction = targetGroup?.users?.some(
            (uId) => (uId._id || uId).toString() === myIdStr,
          );

          reactions = reactions
            .map((r) => ({
              ...r,
              users: r.users.filter(
                (uId) => (uId._id || uId).toString() !== myIdStr,
              ),
            }))
            .filter((r) => r.users.length > 0);

          if (!hasMyReaction) {
            const existingGroup = reactions.find((r) => r.emoji === emoji);

            if (existingGroup) {
              existingGroup.users.push(myIdStr);
            } else {
              reactions.push({ emoji, users: [myIdStr] });
            }
          }

          return { ...msg, reactions };
        }),
      );

      try {
        const { data } = await API.put(`/api/message/react/${msgId}`, {
          emoji,
        });

        setMessages((prev) =>
          prev.map((msg) => (msg._id === msgId ? data : msg)),
        );

        if (socket) socket.emit("message reaction", data);
      } catch (err) {
        console.error("Error toggling reaction:", err);
        refreshChats();
      }
    },
    [myIdStr, socket],
  );

  const handleTypingInput = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedChat || !myIdStr) return;

    socket.emit("typing", { chatId: selectedChat._id, userId: myIdStr });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && selectedChat) {
        socket.emit("stop typing", {
          chatId: selectedChat._id,
          userId: myIdStr,
        });
      }
    }, 2000);
  };

  const handleOpenGroupModal = async () => {
    setIsGroupModalOpen(true);

    try {
      const { data } = await API.get("/api/users/search/all");
      setAllUsers(data.filter((u) => u._id?.toString() !== myIdStr));
    } catch (err) {
      console.error("Error fetching users for group:", err);
    }
  };

  const toggleSelectUserForGroup = (userId) => {
    if (selectedGroupUsers.includes(userId)) {
      setSelectedGroupUsers((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedGroupUsers((prev) => [...prev, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length < 2) return;

    try {
      const { data } = await API.post("/api/chat/group", {
        name: groupName,
        users: JSON.stringify(selectedGroupUsers),
      });

      setChats((prev) => {
        const exists = prev.some((c) => c._id === data._id);
        return exists ? prev : [data, ...prev];
      });

      handleSelectChat(data);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedGroupUsers([]);
    } catch (err) {
      console.error("Error creating group chat:", err);
    }
  };

  const getProfileLink = (targetUsername) => {
    if (!targetUsername || targetUsername === "Deleted User") return "#";

    const myUsername = currentUser?.username || getLoggedInUsername();

    if (
      myUsername &&
      myUsername.toLowerCase() === targetUsername.toLowerCase()
    ) {
      return "/profile";
    }

    return `/user/${targetUsername}`;
  };

  const isGroup = selectedChat?.isGroupChat;
  const isGroupAdmin =
    isGroup &&
    (selectedChat.groupAdmin?._id || selectedChat.groupAdmin)?.toString() ===
      myIdStr;

  const filteredChats = chats.filter((chat) => {
    if (!sidebarSearch.trim()) return true;

    const query = sidebarSearch.toLowerCase();

    if (chat.isGroupChat) {
      return chat.chatName?.toLowerCase().includes(query);
    } else {
      const partner = getChatSender(chat.users);
      return (
        partner?.username?.toLowerCase().includes(query) ||
        partner?.fullName?.toLowerCase().includes(query)
      );
    }
  });

  const filteredGlobalUsers = allGlobalUsers.filter((u) => {
    if (!sidebarSearch.trim()) return false;
    if (u._id?.toString() === myIdStr) return false;

    const query = sidebarSearch.toLowerCase();
    const matchesQuery =
      u.username?.toLowerCase().includes(query) ||
      u.fullName?.toLowerCase().includes(query);

    const alreadyHasChat = chats.some(
      (c) =>
        !c.isGroupChat &&
        c.users.some(
          (chatUser) =>
            (chatUser._id || chatUser).toString() === u._id?.toString(),
        ),
    );

    return matchesQuery && !alreadyHasChat;
  });

  const recipientIdsSet = useMemo(() => {
    if (!selectedChat?.users || !myIdStr) return new Set();

    const set = new Set();
    selectedChat.users.forEach((u) => {
      const idStr = (u._id || u.id || u).toString();
      if (idStr !== myIdStr) {
        set.add(idStr);
      }
    });

    return set;
  }, [selectedChat, myIdStr]);

  const firstNewMessageId = useMemo(() => {
    if (!sessionLastReadMessage || sortedMessages.length === 0 || !myIdStr)
      return null;

    const lastReadTime = new Date(sessionLastReadMessage.createdAt).getTime();

    const firstNew = sortedMessages.find((m) => {
      const senderId = (m.sender?._id || m.sender)?.toString();
      const isIncoming = senderId !== myIdStr;
      const isAfterLastRead = new Date(m.createdAt).getTime() > lastReadTime;
      return isIncoming && isAfterLastRead;
    });

    return firstNew ? firstNew._id : null;
  }, [sortedMessages, sessionLastReadMessage, myIdStr]);

  return (
    <div className={styles.container}>
      <PageHeader backTo="/dashboard" />

      <div
        className={`${styles.sidebar} ${selectedChat ? styles.hideMobile : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>

          <button
            type="button"
            className={styles.newGroupBtn}
            onClick={handleOpenGroupModal}
            title="New Group Chat"
          >
            + Group
          </button>
        </div>

        <div className={styles.sidebarSearchWrapper}>
          <div className={styles.sidebarSearchPill}>
            <svg
              viewBox="0 0 24 24"
              className={styles.searchIconSvg}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              type="text"
              placeholder="Search chats or users..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className={styles.sidebarSearchInput}
            />

            {sidebarSearch && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSidebarSearch("")}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className={styles.chatListContainer}>
          <div className={styles.chatList}>
            {loadingChats || isSearchingUsers ? (
              [1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={styles.skeletonChatItem}>
                  <div
                    className={`${styles.skeletonAvatarCircle} ${styles.skeletonPulse}`}
                  />
                  <div className={styles.skeletonChatInfo}>
                    <div
                      className={`${styles.skeletonUsernameLine} ${styles.skeletonPulse}`}
                    />
                    <div
                      className={`${styles.skeletonSubtextLine} ${styles.skeletonPulse}`}
                    />
                  </div>
                </div>
              ))
            ) : filteredChats.length === 0 &&
              filteredGlobalUsers.length === 0 ? (
              <div className={styles.emptyChats}>
                <svg
                  viewBox="0 0 24 24"
                  className={styles.emptyChatsSvg}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>

                <span>
                  {sidebarSearch
                    ? "No matching chats or users"
                    : "No chats yet"}
                </span>
              </div>
            ) : (
              <>
                {filteredChats.map((chat) => {
                  const partner = !chat.isGroupChat
                    ? getChatSender(chat.users)
                    : null;

                  const partnerId = (
                    partner?._id ||
                    partner?.id ||
                    partner
                  )?.toString();

                  const isPartnerDeleted =
                    !chat.isGroupChat &&
                    (chat.deletedFor?.some(
                      (id) => (id._id || id).toString() === partnerId,
                    ) ||
                      socketDeletedChatId === chat._id);

                  const isSelected = selectedChat?._id === chat._id;
                  const unreadCount = unreadCounts[chat._id] || 0;
                  const hasUnread = !isSelected && unreadCount > 0;

                  return (
                    <div
                      key={chat._id}
                      className={`${styles.chatItem} ${isSelected ? styles.selectedChatItem : ""} ${
                        hasUnread ? styles.unreadChatItem : ""
                      } ${isPartnerDeleted ? styles.partnerDeletedItem : ""}`}
                      onClick={() => {
                        handleSelectChat(chat);
                        handleClosePortalAnimated();
                      }}
                    >
                      <div className={styles.avatarWrapper}>
                        {chat.isGroupChat ? (
                          <div className={styles.groupAvatar}>
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
                        ) : (
                          <Avatar user={partner} size={42} />
                        )}
                      </div>

                      <div className={styles.chatInfo}>
                        <div className={styles.chatNameRow}>
                          <span className={styles.chatName}>
                            {chat.isGroupChat
                              ? chat.chatName
                              : partner?.username || "Deleted User"}
                          </span>

                          {isPartnerDeleted && (
                            <span
                              className={styles.closedBadge}
                              title="Partner closed this chat"
                            >
                              Closed
                            </span>
                          )}
                        </div>

                        <span className={styles.latestMsg}>
                          {formatLatestMessage(chat)}
                        </span>
                      </div>

                      {hasUnread && (
                        <div key={unreadCount} className={styles.unreadBadge}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredGlobalUsers.length > 0 && (
                  <div className={styles.globalSearchSection}>
                    <span className={styles.globalSearchTitle}>
                      New Contacts
                    </span>

                    {filteredGlobalUsers.map((u) => (
                      <div
                        key={u._id}
                        className={styles.globalUserItem}
                        onClick={() => handleStartDirectChat(u._id)}
                      >
                        <Avatar user={u} size={38} />

                        <div className={styles.globalUserInfo}>
                          <span className={styles.globalUsername}>
                            {u.username}
                          </span>

                          {u.fullName && (
                            <span className={styles.globalFullName}>
                              {u.fullName}
                            </span>
                          )}
                        </div>

                        <span className={styles.startChatPill}>Chat</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${styles.chatWindow} ${!selectedChat ? styles.hideMobile : styles.showMobile}`}
      >
        {selectedChat ? (
          <>
            <div className={styles.chatHeader}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setSelectedChat(null);
                  setIsTyping(false);
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

                    <span className={styles.username}>
                      {selectedChat.chatName}
                    </span>
                  </div>
                ) : (
                  <Link
                    to={getProfileLink(partnerUsername)}
                    className={styles.authorBadge}
                  >
                    <Avatar user={partnerUser} size={36} />
                    <span className={styles.username}>{partnerUsername}</span>
                  </Link>
                )}

                <div className={styles.userMeta}>
                  <span className={styles.dot}>•</span>

                  {isTyping ? (
                    <div className={styles.avatarTypingBadge}>
                      <span className={styles.typingBadgeText}>typing</span>
                      <div className={styles.typingDots}>
                        <span className={styles.dotWave}></span>
                        <span className={styles.dotWave}></span>
                        <span className={styles.dotWave}></span>
                      </div>
                    </div>
                  ) : selectedChat.isGroupChat ? (
                    <span
                      className={`${styles.statusText} ${styles.groupStatusClickable}`}
                      onClick={() => setIsGroupDetailsModalOpen(true)}
                    >
                      {`${selectedChat.users?.length || 0} members`}
                    </span>
                  ) : (
                    <HeaderStatusTextSwitcher
                      statusKey={
                        isUserOnline
                          ? rawPresence?.status || "online"
                          : "offline"
                      }
                      isUserOnline={isUserOnline}
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                className={styles.deleteChatHeaderBtn}
                onClick={() => setIsDeleteChatModalOpen(true)}
                title={
                  isGroup
                    ? isGroupAdmin
                      ? "Delete Group"
                      : "Leave Group"
                    : "Delete Chat"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>

            <div
              ref={messagesContainerRef}
              className={styles.messagesContainer}
              onScroll={handleContainerScroll}
              onClick={() => handleClosePortalAnimated()}
            >
              {loadingMessages ? (
                [1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className={`${styles.messageRow} ${item % 2 === 0 ? styles.myRow : styles.theirRow}`}
                  >
                    <div
                      className={`${styles.skeletonMessageBubble} ${styles.skeletonPulse}`}
                      style={{ width: "160px" }}
                    />
                  </div>
                ))
              ) : sortedMessages.length === 0 ? (
                <div className={styles.emptyConversation}>
                  <div className={styles.emptyConversationIcon}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      width="48"
                      height="48"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002"
                      />
                    </svg>
                  </div>

                  <h4>No messages here yet</h4>
                  <p>Send a message to start the conversation!</p>
                </div>
              ) : (
                <>
                  {sortedMessages.map((msg, index) => {
                    const msgSenderId = msg.sender?._id || msg.sender;
                    const isMyMessage = msgSenderId?.toString() === myIdStr;
                    const isEditing = editingMessageId === msg._id;
                    const isDeleted = msg.isDeleted;
                    const isRead =
                      msg.readBy?.some((readId) =>
                        recipientIdsSet.has((readId._id || readId).toString()),
                      ) || false;

                    const isActive = activeActionId === msg._id;
                    const isClosing = closingActionId === msg._id;
                    const itemKey = msg.stableKey || msg._id;

                    const currentDateFormatted = formatMessageDateDivider(
                      msg.createdAt,
                    );
                    const prevMsgDateFormatted =
                      index > 0
                        ? formatMessageDateDivider(
                            sortedMessages[index - 1].createdAt,
                          )
                        : null;

                    const showDateDivider =
                      currentDateFormatted &&
                      currentDateFormatted !== prevMsgDateFormatted;

                    const showNewMessagesDivider =
                      firstNewMessageId && msg._id === firstNewMessageId;

                    return (
                      <Fragment key={itemKey}>
                        {showDateDivider && (
                          <div className={styles.dateDividerWrapper}>
                            <span className={styles.dateDividerBubble}>
                              {currentDateFormatted}
                            </span>
                          </div>
                        )}

                        {showNewMessagesDivider && (
                          <div
                            className={`${styles.newMessagesDividerWrapper} ${
                              isHidingNewMessages
                                ? styles.newMessagesHiding
                                : ""
                            }`}
                          >
                            <div className={styles.newMessagesGridInner}>
                              <div className={styles.newMessagesContent}>
                                <div className={styles.newMessagesLine} />
                                <span className={styles.newMessagesBubble}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className={styles.newMessagesIcon}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                                    />
                                  </svg>
                                  New Messages
                                </span>
                                <div className={styles.newMessagesLine} />
                              </div>
                            </div>
                          </div>
                        )}

                        <div
                          className={`${styles.messageRow} ${isMyMessage ? styles.myRow : styles.theirRow}`}
                        >
                          <MessageItem
                            msg={{ ...msg, myIdStr }}
                            isMyMessage={isMyMessage}
                            isEditing={isEditing}
                            isDeleted={isDeleted}
                            isRead={isRead}
                            isActive={isActive}
                            isClosing={isClosing}
                            editingContent={editingContent}
                            setEditingContent={setEditingContent}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={handleCancelEdit}
                            onStartEdit={handleStartEdit}
                            onDeleteMessage={handleRequestDeleteMessage}
                            onToggleReaction={handleToggleReaction}
                            onTriggerClick={(id) => {
                              if (activeActionId === id) {
                                handleClosePortalAnimated();
                              } else if (activeActionId) {
                                handleClosePortalAnimated(() =>
                                  setActiveActionId(id),
                                );
                              } else {
                                setActiveActionId(id);
                              }
                            }}
                            onClosePortalAnimated={handleClosePortalAnimated}
                            selectedChat={selectedChat}
                          />
                        </div>
                      </Fragment>
                    );
                  })}

                  <div
                    ref={messagesEndRef}
                    style={{ float: "left", clear: "both" }}
                  />
                </>
              )}
            </div>

            <button
              type="button"
              className={`${styles.scrollBottomBtn} ${
                showScrollBottom ? styles.showScrollBottomBtn : ""
              }`}
              onClick={() => {
                setUnreadScrollCount(0);
                scrollToBottom(false, true, true);
              }}
              aria-label="Scroll to bottom"
            >
              {unreadScrollCount > 0 && (
                <span
                  key={unreadScrollCount}
                  className={styles.scrollUnreadBadge}
                >
                  {unreadScrollCount > 99 ? "99+" : unreadScrollCount}
                </span>
              )}

              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isChatDeletedByPartner ? (
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
                  The other user has deleted this chat. Messages are kept for
                  your safety.
                </span>
              </div>
            ) : selectedChat?.isGroupChat && !isCurrentUserMember ? (
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
                  You were removed from this group. Messages are kept for your
                  safety, but you can no longer write here.
                </span>
              </div>
            ) : (
              <form className={styles.inputFooter} onSubmit={handleSendMessage}>
                <div className={styles.inputPill}>
                  <input
                    type="text"
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={handleTypingInput}
                    onKeyDown={handleInputKeyDown}
                    className={styles.commentInput}
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
            )}
          </>
        ) : (
          <div className={styles.noChatSelected}>
            <div className={styles.chatIconPlaceholder}>
              <svg
                viewBox="0 0 24 24"
                width="48"
                height="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <circle cx="9" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="15" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>

            <h3>Your Messages</h3>
            <p>Send private messages or create a group chat with friends.</p>
          </div>
        )}
      </div>

      {isGroupModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Create Group Chat</h3>

              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsGroupModalOpen(false)}
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

              <div className={styles.userSelectionList}>
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
                        className={`${styles.userSelectItem} ${isSelected ? styles.selectedUserItem : ""}`}
                        style={{ "--stagger-index": idx }}
                        onClick={() => toggleSelectUserForGroup(u._id)}
                      >
                        <Avatar user={u} size={36} />

                        <span className={styles.selectUsername}>
                          {u.username}
                        </span>

                        <div
                          className={`${styles.customCheckbox} ${isSelected ? styles.checkboxChecked : ""}`}
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
                onClick={() => setIsGroupModalOpen(false)}
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
        </div>
      )}

      {isGroupDetailsModalOpen && selectedChat?.isGroupChat && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsGroupDetailsModalOpen(false)}
        >
          <div
            className={styles.modalContent}
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
                onClick={() => setIsGroupDetailsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.userSelectionContainer}>
              <span className={styles.selectTitle}>Group Members</span>

              <div className={styles.userSelectionList}>
                {selectedChat.users?.map((u, idx) => {
                  const isAdminUser =
                    (
                      selectedChat.groupAdmin?._id || selectedChat.groupAdmin
                    )?.toString() === (u._id || u).toString();
                  const isMe = (u._id || u).toString() === myIdStr;

                  return (
                    <div
                      key={u._id || u}
                      className={styles.memberListItem}
                      style={{ "--stagger-index": idx }}
                    >
                      <Avatar user={u} size={38} />

                      <div className={styles.memberInfo}>
                        <span className={styles.selectUsername}>
                          {u.username} {isMe ? "(You)" : ""}
                        </span>
                        {u.fullName && (
                          <span className={styles.globalFullName}>
                            {u.fullName}
                          </span>
                        )}
                      </div>

                      {isAdminUser && (
                        <span className={styles.adminBadge}>Admin</span>
                      )}

                      {isGroupAdmin && !isMe && (
                        <button
                          type="button"
                          className={styles.removeMemberBtn}
                          onClick={() => handleRemoveUserFromGroup(u)}
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
                onClick={() => setIsGroupDetailsModalOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className={styles.createBtn}
                style={{ backgroundColor: "#ed4956" }}
                onClick={() => {
                  setIsGroupDetailsModalOpen(false);
                  setIsDeleteChatModalOpen(true);
                }}
              >
                {isGroupAdmin ? "Delete Group" : "Leave Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cannotRemoveModalUser && (
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
              will permanently delete this group chat for everyone. Would you
              like to delete the group?
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
      )}

      {isDeleteChatModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsDeleteChatModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {isGroup
                  ? isGroupAdmin
                    ? "Delete Group Chat"
                    : "Leave Group Chat"
                  : "Delete Chat"}
              </h3>

              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsDeleteChatModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                color: "var(--text-secondary)",
                margin: "16px 0 24px 0",
                fontSize: "14px",
              }}
            >
              {isGroup
                ? isGroupAdmin
                  ? "Are you sure you want to delete this group? All messages and data will be permanently removed for everyone."
                  : "Are you sure you want to leave this group chat?"
                : "Are you sure you want to delete this conversation for yourself?"}
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsDeleteChatModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.createBtn}
                style={{ backgroundColor: "#ed4956" }}
                onClick={handleConfirmDeleteChat}
              >
                {isGroup ? (isGroupAdmin ? "Delete" : "Leave") : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingMessageTarget && (
        <div
          className={styles.modalOverlay}
          onClick={() => setDeletingMessageTarget(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Delete Message</h3>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setDeletingMessageTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.deletePreviewBubble}>
              <span className={styles.deletePreviewText}>
                &quot;{deletingMessageTarget.content}&quot;
              </span>
            </div>

            {isOlderThan15Min ? (
              <div className={styles.timeWarningBox}>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.warningIcon}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div>
                  <strong>Older than 15 minutes</strong>
                  <p>
                    This message was sent more than 15 minutes ago. It will be
                    removed from your view, but may still be visible to other
                    members.
                  </p>
                </div>
              </div>
            ) : (
              <p className={styles.deleteConfirmNotice}>
                Are you sure you want to delete this message? This action will
                remove it for everyone.
              </p>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeletingMessageTarget(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.createBtn}
                style={{ backgroundColor: "#ef4444" }}
                onClick={handleConfirmDeleteSingleMessage}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
