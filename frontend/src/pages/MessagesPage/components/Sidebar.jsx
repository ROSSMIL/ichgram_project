import { memo } from "react";
import PropTypes from "prop-types";
import Avatar from "../../../components/Avatar/Avatar";
import { formatLatestMessage } from "../utils/messagesUtils";
import styles from "../MessagesPage.module.css";

const Sidebar = memo(
  ({
    selectedChat,
    currentUser,
    loadingChats,
    isSearchingUsers,
    sidebarSearch,
    setSidebarSearch,
    filteredChats,
    filteredGlobalUsers,
    unreadCounts = {},
    reactionUnreadCounts = {},
    socketDeletedChatId,
    getChatSender,
    handleSelectChat,
    handleClosePortalAnimated,
    handleStartDirectChat,
    handleOpenGroupModal,
  }) => {
    const myIdStr = (
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId
    )?.toString();

    const activeGlobalUsers = (filteredGlobalUsers || []).filter(
      (u) => !u.isDeleted && !u.username?.startsWith("deleted_user_"),
    );

    const visibleChats = (filteredChats || []).filter((chat) => {
      if (chat.isGroupChat) return true;
      if (!myIdStr || !chat.deletedFor) return true;
      return !chat.deletedFor.some(
        (id) => (id._id || id || id.id)?.toString() === myIdStr,
      );
    });

    return (
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
            ) : visibleChats.length === 0 && activeGlobalUsers.length === 0 ? (
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
                {visibleChats.map((chat) => {
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
                    (partner?.isDeleted ||
                      partner?.username?.startsWith("deleted_user_") ||
                      chat.deletedFor?.some(
                        (id) => (id._id || id).toString() === partnerId,
                      ) ||
                      socketDeletedChatId === chat._id);

                  const isSelected = selectedChat?._id === chat._id;
                  const unreadCount = unreadCounts[chat._id] || 0;
                  const reactionCount = reactionUnreadCounts[chat._id] || 0;

                  const hasUnread = !isSelected && unreadCount > 0;
                  const hasUnreadReactions = !isSelected && reactionCount > 0;

                  return (
                    <div
                      key={chat._id}
                      className={`${styles.chatItem} ${
                        isSelected ? styles.selectedChatItem : ""
                      } ${
                        hasUnread || hasUnreadReactions
                          ? styles.unreadChatItem
                          : ""
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
                              : partner?.isDeleted ||
                                  partner?.username?.startsWith("deleted_user_")
                                ? "Deleted User"
                                : partner?.username || "Deleted User"}
                          </span>

                          {isPartnerDeleted && (
                            <span
                              className={styles.closedBadge}
                              title="Partner closed this chat or account deleted"
                            >
                              Closed
                            </span>
                          )}
                        </div>

                        <span className={styles.latestMsg}>
                          {formatLatestMessage(chat)}
                        </span>
                      </div>

                      <div className={styles.badgesWrapper}>
                        {/* 🩷 Рожевий каунтер реакцій */}
                        {hasUnreadReactions && (
                          <div
                            key={`reaction-${reactionCount}`}
                            className={styles.reactionBadgeCounter}
                            title="New reactions"
                          >
                            {reactionCount > 99 ? "99+" : reactionCount}
                          </div>
                        )}

                        {/* 💙 Синій каунтер повідомлень */}
                        {hasUnread && (
                          <div
                            key={`msg-${unreadCount}`}
                            className={styles.unreadBadge}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeGlobalUsers.length > 0 && (
                  <div className={styles.globalSearchSection}>
                    <span className={styles.globalSearchTitle}>
                      New Contacts
                    </span>

                    {activeGlobalUsers.map((u) => (
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
    );
  },
);

Sidebar.displayName = "Sidebar";
Sidebar.propTypes = {
  selectedChat: PropTypes.object,
  currentUser: PropTypes.object,
  loadingChats: PropTypes.bool,
  isSearchingUsers: PropTypes.bool,
  sidebarSearch: PropTypes.string,
  setSidebarSearch: PropTypes.func,
  filteredChats: PropTypes.array,
  filteredGlobalUsers: PropTypes.array,
  unreadCounts: PropTypes.object,
  reactionUnreadCounts: PropTypes.object,
  socketDeletedChatId: PropTypes.string,
  getChatSender: PropTypes.func,
  handleSelectChat: PropTypes.func,
  handleClosePortalAnimated: PropTypes.func,
  handleStartDirectChat: PropTypes.func,
  handleOpenGroupModal: PropTypes.func,
};

export default Sidebar;
