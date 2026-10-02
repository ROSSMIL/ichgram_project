import express from "express";
import {
  getNotifications,
  markNotificationsAsRead,
  deleteNotification,
  clearNotifications,
  getUnreadCounts,
  deleteNotificationsByChat,
  getUnreadCountsByChat,
  getUnreadReactionsByChat,
  readChatNotifications,
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadCounts);
router.get("/unread-by-chat", authMiddleware, getUnreadCountsByChat);
router.get(
  "/unread-reactions-by-chat",
  authMiddleware,
  getUnreadReactionsByChat,
);

router.patch("/read", authMiddleware, markNotificationsAsRead);
router.put("/read-chat/:chatId", authMiddleware, readChatNotifications);

router.delete("/", authMiddleware, clearNotifications);
router.delete("/chat/:chatId", authMiddleware, deleteNotificationsByChat);
router.delete("/:id", authMiddleware, deleteNotification);

export default router;
