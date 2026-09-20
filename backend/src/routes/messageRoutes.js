import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  sendMessage,
  allMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  toggleReaction,
} from "../controllers/messageController.js";

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/:messageId").put(protect, editMessage);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/mark-read/:chatId").put(protect, markAsRead);
router.route("/react/:messageId").put(protect, toggleReaction);

export default router;
