import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";
import Notification from "../models/notificationModel.js";

export const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res
      .status(400)
      .json({ message: "Invalid data passed into request" });
  }

  const senderId =
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    (typeof req.user === "string" ? req.user : null);

  if (!senderId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const newMessage = {
    sender: senderId,
    content: content,
    chat: chatId,
    readBy: [senderId],
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "username avatar fullName");
    message = await message.populate({
      path: "chat",
      populate: {
        path: "users",
        select: "username avatar fullName email",
      },
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    if (message.chat && Array.isArray(message.chat.users)) {
      const io = req.app.get("io");

      for (const recipientUser of message.chat.users) {
        const recipientId = (recipientUser._id || recipientUser).toString();

        if (recipientId !== senderId.toString()) {
          const notif = await Notification.create({
            recipient: recipientId,
            sender: senderId,
            type: "message",
            chat: chatId,
            messageText: content,
          });

          const populatedNotif = await Notification.findById(notif._id)
            .populate("sender", "username avatar fullName")
            .populate("chat");

          if (io) {
            io.to(recipientId).emit("new notification", populatedNotif);
          }
        }
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: error.message });
  }
};

export const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username avatar fullName email")
      .populate("chat");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in allMessages:", error);
    res.status(500).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user?.userId || req.user?._id || req.user?.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Message content cannot be empty" });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only edit your own messages" });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "username avatar fullName email")
      .populate({
        path: "chat",
        populate: { path: "users", select: "username avatar fullName email" },
      });

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ message: error.message });
  }
};
export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?.userId || req.user?._id || req.user?.id;

  try {
    const message = await Message.findById(messageId).populate("chat");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    const tenMinutesInMs = 10 * 60 * 1000;
    const timePassed = Date.now() - new Date(message.createdAt).getTime();

    const io = req.app.get("io");

    const deletedNotif = await Notification.findOneAndDelete({
      chat: message.chat._id || message.chat,
      sender: userId,
      type: "message",
      messageText: message.content,
    });

    if (io && message.chat?.users) {
      message.chat.users.forEach((recipientUser) => {
        const recipientId = (recipientUser._id || recipientUser).toString();
        if (recipientId !== userId.toString()) {
          io.to(recipientId).emit("notification deleted", {
            notificationId: deletedNotif?._id,
            type: "message",
            senderId: userId,
            chatId: message.chat._id || message.chat,
          });
        }
      });
    }

    if (timePassed <= tenMinutesInMs) {
      await Message.findByIdAndDelete(messageId);
      return res.status(200).json({
        messageId,
        chatId: message.chat._id || message.chat,
        isHardDelete: true,
      });
    } else {
      message.content = "This message was deleted";
      message.isDeleted = true;
      await message.save();

      const updatedMessage = await Message.findById(messageId)
        .populate("sender", "username avatar fullName email")
        .populate({
          path: "chat",
          populate: { path: "users", select: "username avatar fullName email" },
        });

      return res.status(200).json({
        messageId,
        chatId: message.chat._id || message.chat,
        isHardDelete: false,
        message: updatedMessage,
      });
    }
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: error.message });
  }
};
export const markAsRead = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.userId || req.user?._id || req.user?.id;

  try {
    await Message.updateMany(
      { chat: chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );

    res
      .status(200)
      .json({ message: "Messages marked as read", chatId, userId });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ message: error.message });
  }
};

export const toggleReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user?.userId || req.user?._id || req.user?.id;

  if (!emoji) {
    return res.status(400).json({ message: "Emoji is required" });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    let reactions = message.reactions || [];

    const targetGroup = reactions.find((r) => r.emoji === emoji);
    const userAlreadyHadThisEmoji = targetGroup?.users.some(
      (id) => id.toString() === userId.toString(),
    );

    reactions = reactions.map((r) => ({
      ...r.toObject(),
      users: r.users.filter((id) => id.toString() !== userId.toString()),
    }));

    if (!userAlreadyHadThisEmoji) {
      const existingIndex = reactions.findIndex((r) => r.emoji === emoji);
      if (existingIndex !== -1) {
        reactions[existingIndex].users.push(userId);
      } else {
        reactions.push({ emoji, users: [userId] });
      }
    }

    reactions = reactions.filter((r) => r.users.length > 0);

    await Message.updateOne({ _id: messageId }, { $set: { reactions } });

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "username avatar fullName email")
      .populate({
        path: "chat",
        populate: { path: "users", select: "username avatar fullName email" },
      });

    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    return res.status(500).json({ message: error.message });
  }
};
