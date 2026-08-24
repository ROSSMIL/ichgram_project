import User from "../models/userModel.js";
import { uploadToCloudinary } from "../middlewares/uploadMiddleware.js";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;

    console.log("=== GET PROFILE DEBUG ===");
    console.log("Id extracted from token:", userId);

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found in token" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
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
    const { username, website, bio, deleteAvatar } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found in token" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found in database" });
    }

    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
      });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res
          .status(400)
          .json({ message: "This username is already taken" });
      }
      user.username = username;
    }

    if (website !== undefined) user.website = website;
    if (bio !== undefined) user.bio = bio;

    // Обробка аватарки через Cloudinary
    if (deleteAvatar === "true") {
      user.avatar = "";
    } else if (req.file) {
      // Завантажуємо Buffer у пам'яті прямо в Cloudinary
      const uploadResult = await uploadToCloudinary(req.file.buffer, "avatars");
      user.avatar = uploadResult.secure_url; // Пряме HTTPS посилання
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

    console.log(`=== GET USER BY USERNAME DEBUG ===`);
    console.log(
      `Searching for username: ${username}, Request by: ${currentUserId}`,
    );

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

    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("-password")
      .sort({ username: 1 });

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

    if (!targetUser.followers) targetUser.followers = [];
    if (!currentUser.following) currentUser.following = [];

    const isAlreadyFollowing = targetUser.followers
      .map((id) => id.toString())
      .includes(currentUserId.toString());

    if (isAlreadyFollowing) {
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString(),
      );
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId.toString(),
      );
    } else {
      targetUser.followers.push(currentUserId);
      currentUser.following.push(targetUserId);
    }

    await targetUser.save();
    await currentUser.save();

    res.status(200).json({
      message: isAlreadyFollowing
        ? "Unfollowed successfully"
        : "Followed successfully",
      isFollowing: !isAlreadyFollowing,
      following: currentUser.following,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length,
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
      "username fullName avatar",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.followers || []);
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
      "username fullName avatar",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.following || []);
  } catch (error) {
    console.error("Get Following Error:", error);
    res.status(500).json({ message: "Server error while fetching followings" });
  }
};
