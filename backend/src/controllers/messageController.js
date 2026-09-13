import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";

export const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res
      .status(400)
      .json({ message: "Invalid data passed into request" });
  }

  const senderId =
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    (typeof req.user === "string" ? req.user : null);

  if (!senderId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const newMessage = {
    sender: senderId,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate("sender", "username avatar fullName");
    message = await message.populate({
      path: "chat",
      populate: {
        path: "users",
        select: "username avatar fullName email",
      },
    });

    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: error.message });
  }
};

export const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username avatar fullName email")
      .populate("chat");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in allMessages:", error);
    res.status(500).json({ message: error.message });
  }
};
