import express from "express";
import {
  getNotifications,
  markNotificationsAsRead,
  clearNotifications,
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.patch("/read", authMiddleware, markNotificationsAsRead);
router.delete("/", authMiddleware, clearNotifications);

export default router;
