import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../../context/useSocket.js";
import API from "../../api/axios.js";
import PageHeader from "../../components/PageHeader/PageHeader";

import Sidebar from "./components/Sidebar";
import ChatHeader from "./components/ChatHeader";
import MessagesContainer from "./components/MessagesContainer";
import ChatInputFooter from "./components/ChatInputFooter";

import CreateGroupModal from "./components/Modals/CreateGroupModal.jsx";
import GroupDetailsModal from "./components/Modals/GroupDetailsModal.jsx";
import AddMemberModal from "./components/Modals/AddMemberModal.jsx";
import CannotRemoveUserModal from "./components/Modals/CannotRemoveUserModal.jsx";
import DeleteChatModal from "./components/Modals/DeleteChatModal.jsx";
import DeleteMessageModal from "./components/Modals/DeleteMessageModal.jsx";
import PermanentlyDeleteChatModal from "./components/Modals/PermanentlyDeleteChatModal.jsx";

import styles from "./MessagesPage.module.css";

const MessagesPage = () => {
  const { socket, onlineUsers } = useSocket();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [drafts, setDrafts] = useState({});

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const [displayTypingUsers, setDisplayTypingUsers] = useState([]);
  const typingBannerTimeoutRef = useRef(null);

  const [unreadCounts, setUnreadCounts] = useState({});
  const [reactionUnreadCounts, setReactionUnreadCounts] = useState({});
  const [socketDeletedChatId, setSocketDeletedChatId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingMessageTarget, setDeletingMessageTarget] = useState(null);
  const [isHideChatModalOpen, setIsHideChatModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] =
    useState(false);

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

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedAddUsers, setSelectedAddUsers] = useState([]);
  const [searchAddUserQuery, setSearchAddUserQuery] = useState("");

  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);
  const handledLocationStateRef = useRef(false);
  const showScrollBottomRef = useRef(showScrollBottom);
  const messagesEndRef = useRef(null);

  const [isOlderThan15Min, setIsOlderThan15Min] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const bumpChatToTop = useCallback((chatId, latestMsg = null) => {
    setChats((prevChats) => {
      const chatIndex = prevChats.findIndex((c) => c._id === chatId);
      if (chatIndex === -1) return prevChats;

      const targetChat = { ...prevChats[chatIndex] };
      if (latestMsg) {
        targetChat.latestMessage = latestMsg;
      }

      const updatedList = [...prevChats];
      updatedList.splice(chatIndex, 1);
      return [targetChat, ...updatedList];
    });
  }, []);

  const fetchUnreadReactions = useCallback(async () => {
    try {
      const { data } = await API.get(
        "/api/notifications/unread-reactions-by-chat",
      );
      if (data) {
        setReactionUnreadCounts(data);
      }
    } catch (err) {
      console.error("Error fetching unread reactions:", err);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("unreadCountsUpdated", fetchUnreadReactions);
    return () => {
      window.removeEventListener("unreadCountsUpdated", fetchUnreadReactions);
    };
  }, [fetchUnreadReactions]);

  useEffect(() => {
    if (typingBannerTimeoutRef.current) {
      clearTimeout(typingBannerTimeoutRef.current);
    }

    if (typingUsers.length > 0) {
      const task = setTimeout(() => {
        setDisplayTypingUsers(typingUsers);
      }, 0);

      return () => clearTimeout(task);
    } else {
      typingBannerTimeoutRef.current = setTimeout(() => {
        setDisplayTypingUsers([]);
      }, 350);
    }

    return () => {
      if (typingBannerTimeoutRef.current) {
        clearTimeout(typingBannerTimeoutRef.current);
      }
    };
  }, [typingUsers]);

  const myId = currentUser?._id || currentUser?.id || currentUser?.userId;
  const myIdStr = myId?.toString();

  const currentChatId = selectedChat?._id;
  const newMessage = currentChatId ? drafts[currentChatId] || "" : "";

  const isCurrentUserMember = useMemo(() => {
    if (!selectedChat || !selectedChat.isGroupChat || !myIdStr) return true;
    return selectedChat.users?.some(
      (u) => (u._id || u.id || u).toString() === myIdStr,
    );
  }, [selectedChat, myIdStr]);

  const availableUsersToAdd = useMemo(() => {
    if (!selectedChat || !selectedChat.isGroupChat) return [];
    const existingIds = new Set(
      selectedChat.users.map((u) => (u._id || u.id || u).toString()),
    );
    return allGlobalUsers.filter(
      (u) =>
        !existingIds.has(u._id.toString()) &&
        !u.isDeleted &&
        !u.username?.startsWith("deleted_user_"),
    );
  }, [selectedChat, allGlobalUsers]);

  const toggleSelectUserForAdd = (userId) => {
    setSelectedAddUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedChat || selectedAddUsers.length === 0) return;

    try {
      for (const userId of selectedAddUsers) {
        const { data } = await API.put("/api/chat/groupadd", {
          chatId: selectedChat._id,
          userId,
        });
        setSelectedChat(data);
        setChats((prev) => prev.map((c) => (c._id === data._id ? data : c)));
      }

      setIsAddMemberModalOpen(false);
      setSelectedAddUsers([]);
      setSearchAddUserQuery("");
    } catch (err) {
      console.error("Error adding members to group:", err);
    }
  };

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

  useLayoutEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
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

  const handleSelectChat = useCallback(
    (chat) => {
      if (selectedChatRef.current?._id === chat?._id) {
        return;
      }

      setSelectedChat(chat);
      setTypingUsers([]);
      setDisplayTypingUsers([]);
      setEditingMessageId(null);
      setEditingContent("");
      setSessionLastReadMessage(null);
      setIsHidingNewMessages(false);
      setShowScrollBottom(false);
      setUnreadScrollCount(0);

      if (socket && chat?._id) {
        socket.emit("join chat", chat._id);
      }

      if (chat?.latestMessage) {
        setLoadingMessages(true);
      } else {
        setLoadingMessages(false);
      }
      setMessages([]);

      if (chat?._id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [chat._id]: 0,
        }));
        setReactionUnreadCounts((prev) => ({
          ...prev,
          [chat._id]: 0,
        }));
      }
    },
    [socket],
  );

  const openDirectChatWithData = useCallback(
    (chatData) => {
      const isDeletedByMe = chatData.deletedFor?.some(
        (id) => (id._id || id).toString() === myIdStr,
      );
      if (isDeletedByMe) {
        API.put(`/api/chat/restore/${chatData._id}`).catch(() => {});
      }

      const updatedChat = {
        ...chatData,
        deletedFor: (chatData.deletedFor || []).filter(
          (id) => (id._id || id).toString() !== myIdStr,
        ),
      };

      setChats((prev) => {
        if (!prev.some((c) => c._id === updatedChat._id)) {
          return [updatedChat, ...prev];
        }
        return prev.map((c) => (c._id === updatedChat._id ? updatedChat : c));
      });
      handleSelectChat(updatedChat);
      setSidebarSearch("");
    },
    [handleSelectChat, myIdStr],
  );

  const handleStartDirectChat = useCallback(
    async (targetUserId) => {
      try {
        setIsSearchingUsers(true);
        const { data } = await API.post("/api/chat", { userId: targetUserId });
        openDirectChatWithData(data);
      } catch (err) {
        console.error("Error opening chat with user:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    },
    [openDirectChatWithData],
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

  const refreshChats = useCallback(async () => {
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
  }, []);

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
        const [chatsRes, usersRes, unreadRes, reactionsUnreadRes] =
          await Promise.all([
            API.get("/api/chat"),
            API.get("/api/users/search/all"),
            API.get("/api/notifications/unread-by-chat"),
            API.get("/api/notifications/unread-reactions-by-chat").catch(
              () => ({ data: {} }),
            ),
          ]);

        if (isMounted) {
          setChats(chatsRes.data);
          setAllGlobalUsers(usersRes.data);
          if (unreadRes.data) {
            setUnreadCounts(unreadRes.data);
          }
          if (reactionsUnreadRes.data) {
            setReactionUnreadCounts(reactionsUnreadRes.data);
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
        openDirectChatWithData(targetChat);

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
    handleStartDirectChat,
    openDirectChatWithData,
    socket,
  ]);

  useEffect(() => {
    if (!selectedChat?._id) return;

    let isMounted = true;

    const loadMessages = async () => {
      try {
        const { data } = await API.get(`/api/message/${selectedChat._id}`);

        if (isMounted) {
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedChat._id]: 0,
          }));

          setReactionUnreadCounts((prev) => ({
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
        await API.put(`/api/notifications/read-chat/${selectedChat._id}`).catch(
          () => {},
        );

        window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));

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
  }, [selectedChat?._id, myId, myIdStr, socket]);

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
          setSelectedChat(updatedGroupChat);
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

      if (incomingChatId) {
        bumpChatToTop(incomingChatId, newMessageReceived);
      }

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

        API.put(`/api/message/mark-read/${activeChat._id}`)
          .then(() =>
            window.dispatchEvent(new CustomEvent("unreadCountsUpdated")),
          )
          .catch(() => {});

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
    };

    const handleNewNotification = (notif) => {
      const chatId = (notif.chat?._id || notif.chat)?.toString();
      if (!chatId) return;

      bumpChatToTop(chatId);

      const activeChat = selectedChatRef.current;
      const isActiveChat = activeChat && activeChat._id.toString() === chatId;

      if (isActiveChat) {
        API.put(`/api/notifications/read-chat/${chatId}`).catch(() => {});
      } else if (notif.type === "message_reaction") {
        setReactionUnreadCounts((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1,
        }));
      }
    };

    const handleNotificationDeleted = (data) => {
      if (data?.chatId) {
        setReactionUnreadCounts((prev) => {
          const currentCount = prev[data.chatId];
          if (!currentCount || currentCount <= 0) return prev;

          return {
            ...prev,
            [data.chatId]: Math.max(0, currentCount - 1),
          };
        });
      } else {
        fetchUnreadReactions();
      }
    };
    const handleMessageReaction = (updatedMessage) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = (
        updatedMessage.chat?._id || updatedMessage.chat
      )?.toString();

      if (incomingChatId) {
        bumpChatToTop(incomingChatId);
      }

      if (activeChat && activeChat._id.toString() === incomingChatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg,
          ),
        );

        API.put(`/api/notifications/read-chat/${activeChat._id}`)
          .then(() => {
            setReactionUnreadCounts((prev) => ({
              ...prev,
              [activeChat._id]: 0,
            }));
            window.dispatchEvent(new CustomEvent("unreadCountsUpdated"));
          })
          .catch(() => {});
      } else {
        fetchUnreadReactions();
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

    const handlePartnerDeletedChat = () => {};

    const handleTyping = ({ chatId, userId, username }) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = chatId?.toString();
      const currentChatId = activeChat?._id?.toString();
      const incomingUserId = userId?.toString();
      const currentUserId = myIdStr?.toString();

      if (
        activeChat &&
        currentChatId === incomingChatId &&
        incomingUserId &&
        incomingUserId !== currentUserId
      ) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId?.toString() === incomingUserId))
            return prev;
          return [
            ...prev,
            { userId: incomingUserId, username: username || "User" },
          ];
        });
      }
    };

    const handleStopTyping = ({ chatId, userId }) => {
      const activeChat = selectedChatRef.current;
      const incomingChatId = chatId?.toString();
      const currentChatId = activeChat?._id?.toString();
      const incomingUserId = userId?.toString();

      if (activeChat && currentChatId === incomingChatId) {
        setTypingUsers((prev) =>
          prev.filter((u) => u.userId?.toString() !== incomingUserId),
        );
      }
    };

    const handleUserAccountDeleted = ({ userId }) => {
      const deletedUserIdStr = userId?.toString();
      if (!deletedUserIdStr) return;

      const anonymizeUserObj = (u) => {
        const uId = (u._id || u.id || u).toString();
        if (uId === deletedUserIdStr) {
          return {
            ...u,
            username: `deleted_user_${deletedUserIdStr}`,
            fullName: "Deleted User",
            isDeleted: true,
            avatar: "",
          };
        }
        return u;
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          const hasUser = chat.users?.some(
            (u) => (u._id || u.id || u).toString() === deletedUserIdStr,
          );
          if (!hasUser) return chat;

          return {
            ...chat,
            users: chat.users.map(anonymizeUserObj),
          };
        }),
      );

      if (selectedChatRef.current) {
        const isUserInActiveChat = selectedChatRef.current.users?.some(
          (u) => (u._id || u.id || u).toString() === deletedUserIdStr,
        );

        if (isUserInActiveChat) {
          setSelectedChat((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              users: prev.users.map(anonymizeUserObj),
            };
          });
        }
      }

      setAllGlobalUsers((prev) =>
        prev.filter((u) => u._id?.toString() !== deletedUserIdStr),
      );
    };

    socket.on("chat created", handleChatCreated);
    socket.on("group updated", handleGroupUpdated);
    socket.on("message received", handleMessageReceived);
    socket.on("new notification", handleNewNotification);
    socket.on("notification deleted", handleNotificationDeleted);
    socket.on("message reaction", handleMessageReaction);
    socket.on("message edited", handleMessageEdited);
    socket.on("message deleted", handleMessageDeleted);
    socket.on("messages read", handleMessagesRead);
    socket.on("chat deleted", handleChatDeleted);
    socket.on("partner deleted chat", handlePartnerDeletedChat);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);
    socket.on("user account deleted", handleUserAccountDeleted);

    return () => {
      socket.off("chat created", handleChatCreated);
      socket.off("group updated", handleGroupUpdated);
      socket.off("message received", handleMessageReceived);
      socket.off("new notification", handleNewNotification);
      socket.off("notification deleted", handleNotificationDeleted);
      socket.off("message reaction", handleMessageReaction);
      socket.off("message edited", handleMessageEdited);
      socket.off("message deleted", handleMessageDeleted);
      socket.off("messages read", handleMessagesRead);
      socket.off("chat deleted", handleChatDeleted);
      socket.off("partner deleted chat", handlePartnerDeletedChat);
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
      socket.off("user account deleted", handleUserAccountDeleted);
    };
  }, [
    socket,
    myId,
    myIdStr,
    bumpChatToTop,
    refreshChats,
    fetchUnreadReactions,
  ]);

  const handleConfirmHideChat = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat._id;

    try {
      if (socket) socket.emit("leave chat", chatId);
      await API.delete(`/api/chat/${chatId}`);

      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setSelectedChat(null);
      setMessages([]);
      setIsHideChatModalOpen(false);
    } catch (err) {
      console.error("Error hiding chat:", err);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat._id;

    try {
      if (socket) socket.emit("leave chat", chatId);

      const { data } = await API.delete(`/api/chat/permanent/${chatId}`);

      if (socket) {
        socket.emit("chat deleted", {
          chatId: chatId,
          usersToNotify: data?.usersToNotify || [],
        });
      }

      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setSelectedChat(null);
      setMessages([]);
      setIsPermanentDeleteModalOpen(false);
    } catch (err) {
      console.error("Error permanently deleting chat:", err);
    }
  };

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

  const getChatSender = useCallback(
    (users) => {
      if (!users || users.length === 0) return null;

      const partner = users.find((u) => {
        const uId = u._id || u.id || u;
        return uId?.toString() !== myIdStr;
      });

      return partner || users[0];
    },
    [myIdStr],
  );

  const partnerUser =
    selectedChat && !selectedChat.isGroupChat
      ? getChatSender(selectedChat.users)
      : null;

  const partnerUsername =
    partnerUser?.isDeleted || partnerUser?.username?.startsWith("deleted_user_")
      ? "Deleted User"
      : partnerUser?.username || "Deleted User";

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
    socketDeletedChatId === selectedChat._id,
  );

  const isPartnerAccountDeleted = Boolean(
    selectedChat &&
    !selectedChat.isGroupChat &&
    (partnerUser?.isDeleted ||
      partnerUser?.username?.startsWith("deleted_user_")),
  );

  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (
      isChatDeletedByPartner ||
      isPartnerAccountDeleted ||
      (selectedChat?.isGroupChat && !isCurrentUserMember) ||
      !newMessage.trim() ||
      !selectedChat ||
      !currentUser
    ) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (socket && selectedChat && myIdStr) {
      socket.emit("stop typing", { chatId: selectedChat._id, userId: myIdStr });
    }

    const messageContent = newMessage.trim();

    setDrafts((prev) => ({
      ...prev,
      [selectedChat._id]: "",
    }));

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

    bumpChatToTop(selectedChat._id, optimisticMessage);

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

      bumpChatToTop(selectedChat._id, data);
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
    [editingContent, socket, refreshChats],
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
  }, [deletingMessageTarget, socket, refreshChats]);

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
    [myIdStr, socket, refreshChats],
  );

  const handleTypingInput = (e) => {
    const text = e.target.value;
    if (!currentChatId) return;

    setDrafts((prev) => ({
      ...prev,
      [currentChatId]: text,
    }));

    if (!socket || !selectedChat) return;

    socket.emit("typing", {
      chatId: selectedChat._id,
      userId: myIdStr || currentUser?._id,
      username: currentUser?.username,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && selectedChat) {
        socket.emit("stop typing", {
          chatId: selectedChat._id,
          userId: myIdStr || currentUser?._id,
        });
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

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
    if (u.isDeleted || u.username?.startsWith("deleted_user_")) return false;

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
        ) &&
        !c.deletedFor?.some((id) => (id._id || id).toString() === myIdStr),
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

      <Sidebar
        selectedChat={selectedChat}
        currentUser={currentUser}
        loadingChats={loadingChats}
        isSearchingUsers={isSearchingUsers}
        sidebarSearch={sidebarSearch}
        setSidebarSearch={setSidebarSearch}
        filteredChats={filteredChats}
        filteredGlobalUsers={filteredGlobalUsers}
        unreadCounts={unreadCounts}
        reactionUnreadCounts={reactionUnreadCounts}
        socketDeletedChatId={socketDeletedChatId}
        getChatSender={getChatSender}
        handleSelectChat={handleSelectChat}
        handleClosePortalAnimated={handleClosePortalAnimated}
        handleStartDirectChat={handleStartDirectChat}
        handleOpenGroupModal={handleOpenGroupModal}
      />

      <div
        className={`${styles.chatWindow} ${
          !selectedChat ? styles.hideMobile : styles.showMobile
        }`}
      >
        {selectedChat ? (
          <>
            <ChatHeader
              selectedChat={selectedChat}
              partnerUser={partnerUser}
              partnerUsername={partnerUsername}
              currentUser={currentUser}
              isUserOnline={isUserOnline}
              rawPresence={rawPresence}
              displayTypingUsers={displayTypingUsers}
              typingUsers={typingUsers}
              isGroup={isGroup}
              isGroupAdmin={isGroupAdmin}
              setSelectedChat={setSelectedChat}
              setTypingUsers={setTypingUsers}
              setDisplayTypingUsers={setDisplayTypingUsers}
              setEditingMessageId={setEditingMessageId}
              setEditingContent={setEditingContent}
              handleClosePortalAnimated={handleClosePortalAnimated}
              setIsGroupDetailsModalOpen={setIsGroupDetailsModalOpen}
              onOpenHideChatModal={() => setIsHideChatModalOpen(true)}
              onOpenPermanentDeleteModal={() =>
                setIsPermanentDeleteModalOpen(true)
              }
              setIsDeleteChatModalOpen={setIsDeleteChatModalOpen}
            />

            <MessagesContainer
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              loadingMessages={loadingMessages}
              sortedMessages={sortedMessages}
              myIdStr={myIdStr}
              editingMessageId={editingMessageId}
              activeActionId={activeActionId}
              closingActionId={closingActionId}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
              handleStartEdit={handleStartEdit}
              handleRequestDeleteMessage={handleRequestDeleteMessage}
              handleToggleReaction={handleToggleReaction}
              handleClosePortalAnimated={handleClosePortalAnimated}
              setActiveActionId={setActiveActionId}
              selectedChat={selectedChat}
              currentUser={currentUser}
              recipientIdsSet={recipientIdsSet}
              firstNewMessageId={firstNewMessageId}
              isHidingNewMessages={isHidingNewMessages}
              handleContainerScroll={handleContainerScroll}
            />

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

            <ChatInputFooter
              isChatDeletedByPartner={isChatDeletedByPartner}
              isPartnerAccountDeleted={isPartnerAccountDeleted}
              isGroupChat={selectedChat?.isGroupChat}
              isCurrentUserMember={isCurrentUserMember}
              newMessage={newMessage}
              handleSendMessage={handleSendMessage}
              handleTypingInput={handleTypingInput}
              handleInputKeyDown={handleInputKeyDown}
            />
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
        <CreateGroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          searchUserQuery={searchUserQuery}
          setSearchUserQuery={setSearchUserQuery}
          allUsers={allUsers}
          selectedGroupUsers={selectedGroupUsers}
          toggleSelectUserForGroup={toggleSelectUserForGroup}
          handleCreateGroup={handleCreateGroup}
          onClose={() => setIsGroupModalOpen(false)}
        />
      )}

      {isGroupDetailsModalOpen && selectedChat?.isGroupChat && (
        <GroupDetailsModal
          selectedChat={selectedChat}
          isGroupAdmin={isGroupAdmin}
          myIdStr={myIdStr}
          handleRemoveUserFromGroup={handleRemoveUserFromGroup}
          setIsAddMemberModalOpen={setIsAddMemberModalOpen}
          setIsDeleteChatModalOpen={setIsDeleteChatModalOpen}
          onClose={() => setIsGroupDetailsModalOpen(false)}
        />
      )}

      {isAddMemberModalOpen && (
        <AddMemberModal
          searchAddUserQuery={searchAddUserQuery}
          setSearchAddUserQuery={setSearchAddUserQuery}
          availableUsersToAdd={availableUsersToAdd}
          selectedAddUsers={selectedAddUsers}
          toggleSelectUserForAdd={toggleSelectUserForAdd}
          handleAddMembersToGroup={handleAddMembersToGroup}
          onClose={() => setIsAddMemberModalOpen(false)}
        />
      )}

      {cannotRemoveModalUser && (
        <CannotRemoveUserModal
          cannotRemoveModalUser={cannotRemoveModalUser}
          setCannotRemoveModalUser={setCannotRemoveModalUser}
          setIsGroupDetailsModalOpen={setIsGroupDetailsModalOpen}
          handleConfirmDeleteChat={handleConfirmDeleteChat}
        />
      )}

      {isHideChatModalOpen && (
        <DeleteChatModal
          isGroup={false}
          handleConfirmDeleteChat={handleConfirmHideChat}
          onClose={() => setIsHideChatModalOpen(false)}
        />
      )}

      {isDeleteChatModalOpen && (
        <DeleteChatModal
          isGroup={isGroup}
          isGroupAdmin={isGroupAdmin}
          handleConfirmDeleteChat={handleConfirmDeleteChat}
          onClose={() => setIsDeleteChatModalOpen(false)}
        />
      )}

      {isPermanentDeleteModalOpen && (
        <PermanentlyDeleteChatModal
          isPartnerDeleted={isPartnerAccountDeleted}
          handleConfirmDeleteChat={handleConfirmPermanentDelete}
          onClose={() => setIsPermanentDeleteModalOpen(false)}
        />
      )}

      {deletingMessageTarget && (
        <DeleteMessageModal
          deletingMessageTarget={deletingMessageTarget}
          isOlderThan15Min={isOlderThan15Min}
          handleConfirmDeleteSingleMessage={handleConfirmDeleteSingleMessage}
          onClose={() => setDeletingMessageTarget(null)}
        />
      )}
    </div>
  );
};

export default MessagesPage;
