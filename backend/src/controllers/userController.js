import User from "../models/userModel.js";
import { uploadToCloudinary } from "../middlewares/uploadMiddleware.js";
import Post from "../models/postModel.js";
import Chat from "../models/chatModel.js";
import Message from "../models/messageModel.js";
import Notification from "../models/notificationModel.js";
import { SEEDED_EMAILS, resetSeededAccount } from "../config/seeder.js";
import { v2 as cloudinary } from "cloudinary";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found in token" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user || user.isDeleted || user.username?.startsWith("deleted_user_")) {
      return res
        .status(401)
        .json({ message: "Account has been deleted or does not exist" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { username, fullName, website, bio, deleteAvatar } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found in token" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const isSeededAccount = SEEDED_EMAILS.includes(user.email.toLowerCase());

    if (fullName !== undefined) {
      user.fullName = fullName.trim();
    }

    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      if (isSeededAccount) {
        return res.status(400).json({
          message: "Username cannot be changed for demo accounts.",
        });
      }

      const cleanUsername = username.trim().toLowerCase();

      const usernameRegex = /^[a-z0-9._]{3,30}$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({
          message:
            "Username can only contain letters, numbers, underscores, and periods (3-30 chars).",
        });
      }

      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res
          .status(400)
          .json({ message: "This username is already taken" });
      }

      user.username = cleanUsername;
    }

    if (website !== undefined) user.website = website.trim();
    if (bio !== undefined) user.bio = bio;

    if (deleteAvatar === "true") {
      if (user.avatar) {
        await deleteCloudinaryImage(user.avatar);
      }
      user.avatar = "";
    } else if (req.file) {
      if (user.avatar) {
        await deleteCloudinaryImage(user.avatar);
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer, "avatars");
      user.avatar = uploadResult.secure_url;
    }

    await user.save();

    const updatedUser = await User.findById(userId).select("-password");
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error during profile update" });
  }
};

export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;

    const targetUser = await User.findOne({
      username: username.toLowerCase(),
    }).select("-password");

    if (!targetUser) {
      return res.status(404).json({ message: "User not found in database" });
    }

    if (
      currentUserId &&
      currentUserId.toString() === targetUser._id.toString()
    ) {
      return res.status(200).json({ isMe: true });
    }

    const userObj = targetUser.toObject();

    if (
      targetUser.isDeleted ||
      targetUser.username.startsWith("deleted_user_")
    ) {
      return res.status(200).json({
        _id: targetUser._id,
        username: "Deleted User",
        fullName: "Account Deleted",
        isDeleted: true,
        avatar: "",
        bio: "This account has been deleted.",
        followersCount: 0,
        followingCount: 0,
        isFollowing: false,
        isMe: false,
      });
    }

    userObj.followersCount = targetUser.followers?.length || 0;
    userObj.followingCount = targetUser.following?.length || 0;

    userObj.isFollowing =
      currentUserId && targetUser.followers
        ? targetUser.followers
            .map((id) => id.toString())
            .includes(currentUserId.toString())
        : false;

    userObj.isMe = false;

    res.status(200).json(userObj);
  } catch (error) {
    console.error("Get User By Username Error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching user profile" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;

    const users = await User.find({
      _id: { $ne: currentUserId },
      isDeleted: { $ne: true },
      username: { $not: /^deleted_user_/ },
    })
      .select("-password")
      .sort({ username: -1 });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching users" });
  }
};

export const toggleFollow = async (req, res) => {
  try {
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;
    const { id: targetUserId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const cleanFollowers = Array.from(
      new Set((targetUser.followers || []).map((id) => id.toString())),
    );
    const cleanFollowing = Array.from(
      new Set((currentUser.following || []).map((id) => id.toString())),
    );

    const isAlreadyFollowing = cleanFollowers.includes(
      currentUserId.toString(),
    );

    const io = req.app.get("io");

    if (isAlreadyFollowing) {
      targetUser.followers = cleanFollowers.filter(
        (id) => id !== currentUserId.toString(),
      );
      currentUser.following = cleanFollowing.filter(
        (id) => id !== targetUserId.toString(),
      );

      await Notification.findOneAndDelete({
        recipient: targetUserId,
        sender: currentUserId,
        type: "follow",
      });

      if (io) {
        io.to(targetUserId.toString()).emit("notification deleted", {
          type: "follow",
          senderId: currentUserId,
        });
      }
    } else {
      cleanFollowers.push(currentUserId.toString());
      cleanFollowing.push(targetUserId.toString());
      targetUser.followers = cleanFollowers;
      currentUser.following = cleanFollowing;

      const notif = await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: "follow",
      });

      const populatedNotif = await Notification.findById(notif._id).populate(
        "sender",
        "username avatar fullName",
      );

      if (io) {
        io.to(targetUserId.toString()).emit("new notification", populatedNotif);
      }
    }

    targetUser.followersCount = targetUser.followers.length;
    currentUser.followingCount = currentUser.following.length;

    await targetUser.save();
    await currentUser.save();

    res.status(200).json({
      message: isAlreadyFollowing
        ? "Unfollowed successfully"
        : "Followed successfully",
      isFollowing: !isAlreadyFollowing,
      following: currentUser.following,
      followersCount: targetUser.followers.length,
      followingCount: currentUser.following.length,
    });
  } catch (error) {
    console.error("Toggle Follow Error:", error);
    res.status(500).json({ message: "Server error during follow action" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "followers",
      "username fullName avatar isDeleted",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const activeFollowers = (user.followers || []).filter(
      (f) => !f.isDeleted && !f.username?.startsWith("deleted_user_"),
    );

    res.status(200).json(activeFollowers);
  } catch (error) {
    console.error("Get Followers Error:", error);
    res.status(500).json({ message: "Server error while fetching followers" });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "following",
      "username fullName avatar isDeleted",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const activeFollowing = (user.following || []).filter(
      (f) => !f.isDeleted && !f.username?.startsWith("deleted_user_"),
    );

    res.status(200).json(activeFollowing);
  } catch (error) {
    console.error("Get Following Error:", error);
    res.status(500).json({ message: "Server error while fetching followings" });
  }
};

const deleteCloudinaryImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) return;
  try {
    if (imageUrl.includes("/demo/image/upload/")) return;

    const parts = imageUrl.split("/");
    const filenameWithExt = parts.pop();
    const folder = parts.pop();
    const publicId = `${folder}/${filenameWithExt.split(".")[0]}`;

    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted Cloudinary asset: ${publicId}`);
  } catch (err) {
    console.error("Cloudinary cleanup error:", err?.message || err);
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found in token" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
    }

    if (SEEDED_EMAILS.includes(user.email.toLowerCase())) {
      await resetSeededAccount(user.email);
      return res.status(200).json({
        message: "Seed account reset to factory settings successfully",
        isSeededReset: true,
      });
    }

    console.log(`=== ANONYMIZING USER (GHOST MODE): ${user.username} ===`);

    if (user.avatar) {
      await deleteCloudinaryImage(user.avatar);
    }

    const userPosts = await Post.find({ user: userId });
    for (const post of userPosts) {
      if (post.url) {
        await deleteCloudinaryImage(post.url);
      }
    }
    await Post.deleteMany({ user: userId });

    await Post.updateMany({}, { $pull: { comments: { user: userId } } });
    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });

    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } },
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } },
    );

    await Notification.deleteMany({
      $or: [{ recipient: userId }, { sender: userId }],
    });

    const io = req.app.get("io");

    if (io) {
      io.emit("user account deleted", { userId: userId.toString() });

      const userSockets = await io.in(userId.toString()).fetchSockets();
      userSockets.forEach((s) => s.disconnect(true));
    }

    user.username = `deleted_user_${user._id}`;
    user.fullName = "Account Deleted";
    user.email = `deleted_${user._id}@deleted.local`;
    user.avatar = "";
    user.bio = "This account has been deleted.";
    user.website = "";
    user.followers = [];
    user.following = [];
    user.isDeleted = true;

    await user.save();

    res.status(200).json({
      message: "Profile anonymized and deleted successfully",
      isGuestReset: false,
      isSeededReset: false,
    });
  } catch (error) {
    console.error("Delete Profile Error:", error);
    res.status(500).json({ message: "Server error during profile deletion" });
  }
};
