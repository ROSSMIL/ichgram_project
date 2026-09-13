import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import API from "../../api/axios.js";
import Avatar from "../../components/Avatar/Avatar";
import styles from "./MessagesPage.module.css";

const ENDPOINT = "http://localhost:3333";
let socket;

const MessagesPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const refreshChats = async () => {
    try {
      const { data } = await API.get("/api/chat");
      setChats(data);
    } catch (err) {
      console.error("Error refreshing chats:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    socket = io(ENDPOINT, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/api/users/profile");
        setCurrentUser(data);

        if (socket?.connected) {
          socket.emit("setup", data);
        } else {
          socket.on("connect", () => {
            socket.emit("setup", data);
          });
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchProfile();

    return () => {
      if (socket) {
        socket.off("connect");
        if (socket.connected) {
          socket.disconnect();
        }
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadChats = async () => {
      try {
        const { data } = await API.get("/api/chat");
        if (isMounted) setChats(data);
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    };

    loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    let isMounted = true;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await API.get(`/api/message/${selectedChat._id}`);
        if (isMounted) {
          setMessages(data);
          scrollToBottom();
        }
        if (socket) {
          socket.emit("join chat", selectedChat._id);
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
  }, [selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessageReceived) => {
      if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
        setMessages((prev) => [...prev, newMessageReceived]);
        scrollToBottom();
      }
      refreshChats();
    };

    socket.on("message received", handleMessageReceived);
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    return () => {
      socket.off("message received", handleMessageReceived);
      socket.off("typing");
      socket.off("stop typing");
    };
  }, [selectedChat]);

  const handleSendMessage = async (e) => {
    if ((e.key === "Enter" || e.type === "click") && newMessage.trim()) {
      if (socket && selectedChat) {
        socket.emit("stop typing", selectedChat._id);
      }
      const messageContent = newMessage;
      setNewMessage("");

      try {
        const { data } = await API.post("/api/message", {
          content: messageContent,
          chatId: selectedChat._id,
        });

        if (socket) {
          socket.emit("new message", data);
        }
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
        refreshChats();
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedChat) return;

    socket.emit("typing", selectedChat._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && selectedChat) {
        socket.emit("stop typing", selectedChat._id);
      }
    }, 2000);
  };

  const handleOpenGroupModal = async () => {
    setIsGroupModalOpen(true);
    try {
      const { data } = await API.get("/api/users/search/all");
      const myId = currentUser?._id || currentUser?.id || currentUser?.userId;
      setAllUsers(data.filter((u) => u._id?.toString() !== myId?.toString()));
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

      setChats((prev) => [data, ...prev]);
      setSelectedChat(data);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedGroupUsers([]);
    } catch (err) {
      console.error("Error creating group chat:", err);
    }
  };

  const getChatSender = (users) => {
    if (!users || users.length === 0) return null;

    const myId = currentUser?._id || currentUser?.id || currentUser?.userId;

    const partner = users.find((u) => {
      const uId = u._id || u.id || u;
      return uId?.toString() !== myId?.toString();
    });

    return partner || users[0];
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Messages</h2>
          <button
            className={styles.newGroupBtn}
            onClick={handleOpenGroupModal}
            title="New Group Chat"
          >
            + Group
          </button>
        </div>

        <div className={styles.chatList}>
          {loadingChats ? (
            <div className={styles.loader}>Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className={styles.emptyChats}>No chats yet</div>
          ) : (
            chats.map((chat) => {
              const partner = !chat.isGroupChat
                ? getChatSender(chat.users)
                : null;
              const isSelected = selectedChat?._id === chat._id;

              return (
                <div
                  key={chat._id}
                  className={`${styles.chatItem} ${isSelected ? styles.selectedChatItem : ""}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className={styles.avatarWrapper}>
                    {chat.isGroupChat ? (
                      <div className={styles.groupAvatar}>👥</div>
                    ) : (
                      <Avatar user={partner} size={48} />
                    )}
                  </div>
                  <div className={styles.chatInfo}>
                    <span className={styles.chatName}>
                      {chat.isGroupChat ? chat.chatName : partner?.username}
                    </span>
                    <span className={styles.latestMsg}>
                      {chat.latestMessage
                        ? `${chat.latestMessage.sender?.username || "User"}: ${chat.latestMessage.content}`
                        : "No messages yet"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.chatWindow}>
        {selectedChat ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.headerPartner}>
                {selectedChat.isGroupChat ? (
                  <div className={styles.groupAvatar}>👥</div>
                ) : (
                  <Avatar user={getChatSender(selectedChat.users)} size={40} />
                )}
                <div>
                  <h3>
                    {selectedChat.isGroupChat
                      ? selectedChat.chatName
                      : getChatSender(selectedChat.users)?.username}
                  </h3>
                  {selectedChat.isGroupChat && (
                    <span className={styles.groupMembersCount}>
                      {selectedChat.users.length} members
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.messagesContainer}>
              {loadingMessages ? (
                <div className={styles.loader}>Loading history...</div>
              ) : (
                messages.map((msg) => {
                  const myId =
                    currentUser?._id || currentUser?.id || currentUser?.userId;
                  const msgSenderId = msg.sender?._id || msg.sender;

                  const isMyMessage =
                    msgSenderId?.toString() === myId?.toString();

                  return (
                    <div
                      key={msg._id}
                      className={`${styles.messageBubble} ${
                        isMyMessage ? styles.myMessage : styles.theirMessage
                      }`}
                    >
                      {!isMyMessage && selectedChat.isGroupChat && (
                        <span className={styles.senderName}>
                          {msg.sender?.username}
                        </span>
                      )}
                      <p className={styles.messageContent}>{msg.content}</p>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className={styles.typingIndicator}>typing...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputContainer}>
              <input
                type="text"
                placeholder="Write a message..."
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={handleSendMessage}
                className={styles.messageInput}
              />
              <button
                onClick={handleSendMessage}
                className={styles.sendButton}
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className={styles.noChatSelected}>
            <div className={styles.chatIconPlaceholder}>💬</div>
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
            <h3>Create Group Chat</h3>
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

            <div className={styles.userSelectionList}>
              {allUsers
                .filter((u) =>
                  u.username
                    .toLowerCase()
                    .includes(searchUserQuery.toLowerCase()),
                )
                .map((u) => {
                  const isSelected = selectedGroupUsers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      className={`${styles.userSelectItem} ${isSelected ? styles.selectedUserItem : ""}`}
                      onClick={() => toggleSelectUserForGroup(u._id)}
                    >
                      <Avatar user={u} size={36} />
                      <span>{u.username}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className={styles.checkbox}
                      />
                    </div>
                  );
                })}
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setIsGroupModalOpen(false)}
              >
                Cancel
              </button>
              <button
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
    </div>
  );
};

export default MessagesPage;
