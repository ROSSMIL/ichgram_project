import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import seedDatabase from "../config/seeder.js";

export const register = async (req, res) => {
  try {
    const { email, fullName, username, password } = req.body;

    if (!email || !fullName || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address." });
    }

    const usernameRegex = /^[a-zA-Z0-9._]{3,25}$/;
    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        message:
          "Username can only contain letters, numbers, underscores, and dots (3-25 characters).",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ message: "This email is already taken." });
    }

    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res
        .status(400)
        .json({ message: "This username is already taken." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email: cleanEmail,
      fullName: cleanFullName,
      username: cleanUsername,
      password: hashedPassword,
    });
    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        username: newUser.username,
        avatar: newUser.avatar,
      },
    });
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

    const cleanInput = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }],
    });

    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid username/email or password." });
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
    let guestUser = await User.findOne({ email: "guest@example.com" });

    if (!guestUser) {
      console.log("Guest account not found. Re-seeding database...");
      await seedDatabase();
      guestUser = await User.findOne({ email: "guest@example.com" });
    }

    if (!guestUser) {
      return res
        .status(404)
        .json({ message: "Guest account could not be initialized." });
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
