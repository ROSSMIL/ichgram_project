import express from "express";
import {
  getPostsByUsername,
  addCommentToPost,
  toggleLikePost,
  deleteComment,
  deletePost,
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
} from "../controllers/postController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createPost);
router.get("/", protect, getAllPosts);
router.get("/:postId", protect, getPostById);
router.put("/:postId", protect, updatePost);
router.delete("/:postId", protect, deletePost);

router.get("/user/:username", protect, getPostsByUsername);
router.post("/:postId/comment", protect, addCommentToPost);
router.put("/:postId/like", protect, toggleLikePost);
router.delete("/:postId/comment/:commentId", protect, deleteComment);

export default router;
