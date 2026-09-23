import { v2 as cloudinary } from "cloudinary";
import Post from "../models/postModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createPost = async (req, res) => {
  try {
    const { url, caption } = req.body;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!url) {
      return res.status(400).json({ message: "Image is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(url, {
      folder: "instagram_posts",
      resource_type: "auto",
      transformation: [
        { width: 1080, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    const optimizedImageUrl = uploadResponse.secure_url;
    const publicId = uploadResponse.public_id;

    const newPost = new Post({
      url: optimizedImageUrl,
      cloudinaryId: publicId,
      caption: caption || "",
      user: userId,
    });

    const savedPost = await newPost.save();

    const populatedPost = await Post.findById(savedPost._id)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      message: "Server error during post creation",
      error: error.message,
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching all posts:", error);
    res.status(500).json({ message: "Server error while fetching all posts" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    res.status(500).json({ message: "Server error while fetching post" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { url, caption } = req.body;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (url && url !== post.url) {
      const uploadResponse = await cloudinary.uploader.upload(url, {
        folder: "instagram_posts",
        resource_type: "auto",
        transformation: [
          { width: 1080, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      });
      post.url = uploadResponse.secure_url;
      post.cloudinaryId = uploadResponse.public_id;
    }

    if (caption !== undefined) {
      post.caption = caption;
    }

    post.isEdited = true;

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    res.status(200).json(populatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPostsByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const posts = await Post.find({ user: user._id })
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error fetching posts by username:", error);
    res.status(500).json({ message: "Server error while fetching posts" });
  }
};

export const addCommentToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Comment text cannot be empty" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const commenter = await User.findById(userId);
    if (!commenter) {
      return res.status(404).json({ message: "User not found" });
    }

    const newComment = {
      user: userId,
      username: commenter.username,
      text: text,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    if (post.user.toString() !== userId.toString()) {
      const notif = await Notification.create({
        recipient: post.user,
        sender: userId,
        type: "comment",
        post: postId,
        commentText: text,
      });

      const populatedNotif = await Notification.findById(notif._id)
        .populate("sender", "username avatar fullName")
        .populate("post", "url");

      const io = req.app.get("io");
      if (io) {
        io.to(post.user.toString()).emit("new notification", populatedNotif);
      }
    }

    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

export const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isAlreadyLiked = post.likes.some(
      (likeId) => likeId.toString() === userId.toString(),
    );

    const io = req.app.get("io");

    if (isAlreadyLiked) {
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString(),
      );

      const deletedNotif = await Notification.findOneAndDelete({
        recipient: post.user,
        sender: userId,
        type: "like",
        post: postId,
      });

      if (io && post.user.toString() !== userId.toString()) {
        io.to(post.user.toString()).emit("notification deleted", {
          notificationId: deletedNotif?._id,
          type: "like",
          senderId: userId,
          postId: postId,
        });
      }
    } else {
      post.likes.push(userId);

      if (post.user.toString() !== userId.toString()) {
        const notif = await Notification.create({
          recipient: post.user,
          sender: userId,
          type: "like",
          post: postId,
        });

        const populatedNotif = await Notification.findById(notif._id)
          .populate("sender", "username avatar fullName")
          .populate("post", "url");

        if (io) {
          io.to(post.user.toString()).emit("new notification", populatedNotif);
        }
      }
    }

    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in toggleLikePost:", error);
    res.status(500).json({ message: "Server error while toggling like" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isCommentAuthor = comment.user.toString() === userId.toString();
    const isPostOwner = post.user.toString() === userId.toString();

    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({
        message: "You are not authorized to delete this comment",
      });
    }

    const commentAuthorId = comment.user.toString();
    comment.deleteOne();
    await post.save();

    const deletedNotif = await Notification.findOneAndDelete({
      recipient: post.user,
      sender: commentAuthorId,
      type: "comment",
      post: postId,
      commentText: comment.text,
    });

    const io = req.app.get("io");
    if (io && post.user.toString() !== commentAuthorId) {
      io.to(post.user.toString()).emit("notification deleted", {
        notificationId: deletedNotif?._id,
        type: "comment",
        senderId: commentAuthorId,
        postId: postId,
      });
    }

    const updatedPost = await Post.findById(postId)
      .populate("user", "username avatar fullName")
      .populate("comments.user", "username avatar");

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Server error while deleting comment" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete someone else's post!",
      });
    }

    if (post.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(post.cloudinaryId);
      } catch (cloudinaryErr) {
        console.error("Failed to delete image from Cloudinary:", cloudinaryErr);
      }
    }

    await Notification.deleteMany({ post: postId });

    await Post.findByIdAndDelete(postId);

    res.status(200).json({ message: "Post successfully deleted", postId });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server error while deleting post" });
  }
};
