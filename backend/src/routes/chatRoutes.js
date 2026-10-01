import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  deleteChat,
  permanentlyDeleteChat,
  restoreChat,
} from "../controllers/chatController.js";

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupadd").put(protect, addToGroup);
router.route("/groupremove").put(protect, removeFromGroup);
router.route("/restore/:chatId").put(protect, restoreChat);
router.route("/:chatId").delete(protect, deleteChat);
router.route("/permanent/:chatId").delete(protect, permanentlyDeleteChat);

export default router;
