import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { email, fullName, username, password } = req.body;

    if (!email || !fullName || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "This email is already taken." });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res
        .status(400)
        .json({ message: "This username is already taken." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      fullName,
      username,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid username or email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error during login", error: error.message });
  }
};

export const guestLogin = async (req, res) => {
  try {
    let guestUser = await User.findOne({ username: "guest_user" });

    if (!guestUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("guest123456", salt);

      guestUser = new User({
        email: "guest@example.com",
        fullName: "Guest Recruiter",
        username: "guest_user",
        password: hashedPassword,
        avatar:
          "https://api.dicebear.com/7.x/initials/svg?seed=Guest&backgroundColor=ffc107",
        bio: "Welcome! Exploring as a guest recruiter. 🚀",
        website: "github.com",
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
      });
      await guestUser.save();
    }

    const jwtSecret = process.env.JWT_SECRET;

    const token = jwt.sign(
      { userId: guestUser._id, username: guestUser.username },
      jwtSecret,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      token,
      user: {
        id: guestUser._id,
        email: guestUser.email,
        fullName: guestUser.fullName,
        username: guestUser.username,
        avatar: guestUser.avatar,
      },
    });
  } catch (error) {
    console.error("Error in guestLogin controller:", error);
    return res.status(500).json({
      message: "Server error during guest login",
      error: error.message,
    });
  }
};
