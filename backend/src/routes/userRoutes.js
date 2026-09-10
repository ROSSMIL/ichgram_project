import express from "express";
import {
  getProfile,
  editProfile,
  getUserByUsername,
  getAllUsers,
  toggleFollow,
  getFollowers,
  getFollowing,
  deleteProfile,
} from "../controllers/userController.js";
import protect from "../middlewares/authMiddleware.js";
import { uploadAvatar } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put("/edit", protect, uploadAvatar.single("avatar"), editProfile);
router.delete("/profile", protect, deleteProfile);
router.get("/search/all", protect, getAllUsers);

router.post("/:id/follow", protect, toggleFollow);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

router.get("/:username", protect, getUserByUsername);

export default router;
