import { Fragment, memo } from "react";
import PropTypes from "prop-types";
import MessageItem from "./MessageItem";
import { formatMessageDateDivider } from "../utils/messagesUtils";
import styles from "../MessagesPage.module.css";

const MessagesContainer = memo(
  ({
    messagesContainerRef,
    messagesEndRef,
    loadingMessages,
    sortedMessages,
    myIdStr,
    editingMessageId,
    activeActionId,
    closingActionId,
    editingContent,
    setEditingContent,
    handleSaveEdit,
    handleCancelEdit,
    handleStartEdit,
    handleRequestDeleteMessage,
    handleToggleReaction,
    handleClosePortalAnimated,
    setActiveActionId,
    selectedChat,
    currentUser,
    recipientIdsSet,
    firstNewMessageId,
    isHidingNewMessages,
    handleContainerScroll,
  }) => {
    return (
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
              className={`${styles.messageRow} ${
                item % 2 === 0 ? styles.myRow : styles.theirRow
              }`}
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
                        isHidingNewMessages ? styles.newMessagesHiding : ""
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
                    className={`${styles.messageRow} ${
                      isMyMessage ? styles.myRow : styles.theirRow
                    }`}
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
                      currentUserUsername={currentUser?.username}
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
    );
  },
);

MessagesContainer.displayName = "MessagesContainer";
MessagesContainer.propTypes = {
  messagesContainerRef: PropTypes.object,
  messagesEndRef: PropTypes.object,
  loadingMessages: PropTypes.bool,
  sortedMessages: PropTypes.array,
  myIdStr: PropTypes.string,
  editingMessageId: PropTypes.string,
  activeActionId: PropTypes.string,
  closingActionId: PropTypes.string,
  editingContent: PropTypes.string,
  setEditingContent: PropTypes.func,
  handleSaveEdit: PropTypes.func,
  handleCancelEdit: PropTypes.func,
  handleStartEdit: PropTypes.func,
  handleRequestDeleteMessage: PropTypes.func,
  handleToggleReaction: PropTypes.func,
  handleClosePortalAnimated: PropTypes.func,
  setActiveActionId: PropTypes.func,
  selectedChat: PropTypes.object,
  currentUser: PropTypes.object,
  recipientIdsSet: PropTypes.object,
  firstNewMessageId: PropTypes.string,
  isHidingNewMessages: PropTypes.bool,
  handleContainerScroll: PropTypes.func,
};

export default MessagesContainer;
