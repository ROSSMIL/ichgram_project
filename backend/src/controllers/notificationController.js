import mongoose from "mongoose";
import Notification from "../models/notificationModel.js";
import Message from "../models/messageModel.js";
import Chat from "../models/chatModel.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username avatar fullName")
      .populate("post", "url")
      .populate("chat")
      .sort({ createdAt: -1 })
      .limit(40);

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching notifications" });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } },
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const deletedNotif = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!deletedNotif) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully", id });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting notification" });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    await Notification.deleteMany({ recipient: userId });

    res.status(200).json({ message: "All notifications cleared successfully" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res
      .status(500)
      .json({ message: "Server error while clearing notifications" });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const unreadNotifications = await Notification.countDocuments({
      recipient: userObjectId,
      isRead: false,
      type: { $ne: "message" },
    });

    const userChats = await Chat.find({ users: userObjectId }).select("_id");
    const chatIds = userChats.map((c) => c._id);

    let unreadMessages = 0;

    if (chatIds.length > 0) {
      unreadMessages = await Message.countDocuments({
        chat: { $in: chatIds },
        sender: { $ne: userObjectId },
        readBy: { $ne: userObjectId },
      });
    }

    res.status(200).json({
      unreadNotifications,
      unreadMessages,
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching unread counts" });
  }
};

export const deleteNotificationsByChat = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { chatId } = req.params;

    await Notification.deleteMany({
      recipient: userId,
      chat: chatId,
      type: "message",
    });

    res
      .status(200)
      .json({ message: "Chat notifications cleared successfully", chatId });
  } catch (error) {
    console.error("Error deleting chat notifications:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting chat notifications" });
  }
};

export const getUnreadCountsByChat = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    const userChats = await Chat.find({ users: userObjectId }).select("_id");
    const chatIds = userChats.map((c) => c._id);

    if (chatIds.length === 0) {
      return res.status(200).json({});
    }

    const unreadMsgs = await Message.aggregate([
      {
        $match: {
          chat: { $in: chatIds },
          sender: { $ne: userObjectId },
          readBy: { $ne: userObjectId },
        },
      },
      {
        $group: {
          _id: "$chat",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    unreadMsgs.forEach((item) => {
      if (item._id) {
        unreadMap[item._id.toString()] = item.count;
      }
    });

    res.status(200).json(unreadMap);
  } catch (error) {
    console.error("Error fetching unread counts by chat:", error);
    res.status(500).json({ message: "Server error" });
  }
};
