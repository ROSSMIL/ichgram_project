import Notification from "../models/notificationModel.js";

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
