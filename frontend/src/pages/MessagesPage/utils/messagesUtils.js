// frontend/src/pages/MessagesPage/utils/messagesUtils.js
export const getLoggedInUsername = () => {
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

export const getProfileLink = (targetUsername, currentUsername) => {
  if (!targetUsername) return "#";

  const myUsername = currentUsername || getLoggedInUsername();

  if (myUsername && myUsername.toLowerCase() === targetUsername.toLowerCase()) {
    return "/profile";
  }

  return `/user/${targetUsername}`;
};

export const formatLatestMessage = (chat) => {
  const msg = chat?.latestMessage;
  if (!msg) return "No messages yet";

  if (msg.isSystem) {
    return msg.content;
  }

  const sender = msg.sender;
  const isSenderDeleted =
    sender?.isDeleted || sender?.username?.startsWith("deleted_user_");

  const senderName = isSenderDeleted
    ? "Deleted User"
    : sender?.username || "User";

  return chat.isGroupChat ? `${senderName}: ${msg.content}` : msg.content;
};

export const formatMessageDateDivider = (dateString) => {
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

export const QUICK_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];
