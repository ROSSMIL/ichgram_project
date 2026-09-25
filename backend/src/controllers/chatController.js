import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import Message from "../models/messageModel.js";

const getUserId = (req) => {
  return (
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    (typeof req.user === "string" ? req.user : null)
  );
};

const createAndSendSystemMessage = async (req, chatId, content) => {
  const currentUserId = getUserId(req);

  let systemMessage = await Message.create({
    sender: currentUserId,
    content,
    chat: chatId,
    readBy: [currentUserId],
    isSystem: true,
  });

  systemMessage = await systemMessage.populate(
    "sender",
    "username avatar fullName",
  );
  systemMessage = await systemMessage.populate("chat");

  await Chat.findByIdAndUpdate(chatId, { latestMessage: systemMessage });

  const io = req.app.get("io");
  if (io) {
    io.in(chatId.toString()).emit("message received", systemMessage);
  }

  return systemMessage;
};

export const accessChat = async (req, res) => {
  const { userId } = req.body;
  const currentUserId = getUserId(req);

  if (!userId) {
    return res
      .status(400)
      .json({ message: "UserId param not sent with request" });
  }

  if (!currentUserId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: currentUserId } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "username avatar fullName",
    });

    if (isChat.length > 0) {
      const existingChat = isChat[0];
      if (existingChat.deletedFor?.includes(currentUserId)) {
        await Chat.findByIdAndUpdate(existingChat._id, {
          $pull: { deletedFor: currentUserId },
        });
      }
      return res.status(200).json(existingChat);
    }

    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [currentUserId, userId],
      deletedFor: [],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
      "users",
      "-password",
    );

    const io = req.app.get("io");
    if (io && fullChat.users) {
      fullChat.users.forEach((u) => {
        const uId = (u._id || u).toString();
        io.to(uId).emit("chat created", fullChat);
      });
    }

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchChats = async (req, res) => {
  const currentUserId = getUserId(req);

  if (!currentUserId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    let chats = await Chat.find({
      $or: [
        { users: { $elemMatch: { $eq: currentUserId } } },
        { leftUsers: { $elemMatch: { $eq: currentUserId } } },
      ],
      deletedFor: { $ne: currentUserId },
    })
      .populate("users", "-password")
      .populate("leftUsers", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "username avatar fullName",
    });

    res.status(200).send(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createGroupChat = async (req, res) => {
  const currentUserId = getUserId(req);

  if (!req.body.users || !req.body.name) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }

  let users =
    typeof req.body.users === "string"
      ? JSON.parse(req.body.users)
      : req.body.users;

  if (users.length < 2) {
    return res
      .status(400)
      .json({ message: "More than 2 users are required to form a group chat" });
  }

  users.push(currentUserId);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: currentUserId,
      deletedFor: [],
    });

    const creator = await User.findById(currentUserId);
    const creatorName = creator ? creator.username : "User";

    await createAndSendSystemMessage(
      req,
      groupChat._id,
      `${creatorName} created group "${req.body.name}"`,
    );

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    const io = req.app.get("io");
    if (io && fullGroupChat.users) {
      fullGroupChat.users.forEach((u) => {
        const uId = (u._id || u).toString();
        if (uId !== currentUserId.toString()) {
          io.to(uId).emit("chat created", fullGroupChat);
        }
      });
    }

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;
  const currentUserId = getUserId(req);

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only admins can rename the group" });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName: chatName },
      { returnDocument: "after" },
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    const admin = await User.findById(currentUserId);
    const adminName = admin ? admin.username : "Admin";

    await createAndSendSystemMessage(
      req,
      chatId,
      `${adminName} changed the group name to "${chatName}"`,
    );

    const io = req.app.get("io");
    if (io && updatedChat.users) {
      updatedChat.users.forEach((u) => {
        const uId = (u._id || u).toString();
        io.to(uId).emit("group updated", updatedChat);
      });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  const currentUserId = getUserId(req);

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    const added = await Chat.findByIdAndUpdate(
      chatId,
      {
        $addToSet: { users: userId },
        $pull: { deletedFor: userId },
      },
      { returnDocument: "after" },
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    const addedUser = await User.findById(userId);
    const addedName = addedUser ? addedUser.username : "a user";

    await createAndSendSystemMessage(
      req,
      chatId,
      `${addedName} was added to the group`,
    );

    const io = req.app.get("io");
    if (io && added.users) {
      added.users.forEach((u) => {
        const uId = (u._id || u).toString();
        if (uId === userId.toString()) {
          io.to(uId).emit("chat created", added);
        } else {
          io.to(uId).emit("group updated", added);
        }
      });
    }

    res.status(200).json(added);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  const currentUserId = getUserId(req);

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat Not Found" });

    if (
      userId !== currentUserId.toString() &&
      chat.groupAdmin.toString() !== currentUserId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Only admins can remove members" });
    }

    const removed = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { users: userId },
        $addToSet: { leftUsers: userId },
      },
      { returnDocument: "after" },
    )
      .populate("users", "-password")
      .populate("leftUsers", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");

    const targetUser = await User.findById(userId);
    const targetName = targetUser ? targetUser.username : "A user";

    const isSelfLeave = userId === currentUserId.toString();
    const systemText = isSelfLeave
      ? `${targetName} left the group`
      : `${targetName} was removed from the group`;

    await createAndSendSystemMessage(req, chatId, systemText);

    const io = req.app.get("io");
    if (io) {
      io.to(userId.toString()).emit("group updated", removed);

      if (removed.users) {
        removed.users.forEach((u) => {
          const uId = (u._id || u).toString();
          io.to(uId).emit("group updated", removed);
        });
      }
    }

    res.status(200).json(removed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = getUserId(req);

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const io = req.app.get("io");

    if (
      chat.isGroupChat &&
      chat.groupAdmin.toString() === currentUserId.toString()
    ) {
      await Message.deleteMany({ chat: chatId });
      await Chat.findByIdAndDelete(chatId);

      const usersToNotify = [
        ...chat.users.map((u) => u.toString()),
        ...(chat.leftUsers || []).map((u) => u.toString()),
      ];

      if (io) {
        usersToNotify.forEach((uId) => {
          io.to(uId).emit("chat deleted", { chatId });
        });
      }

      return res.status(200).json({
        message: "Group deleted successfully",
        chatId,
        usersToNotify,
      });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $addToSet: { deletedFor: currentUserId },
        $pull: { users: currentUserId, leftUsers: currentUserId },
      },
      { returnDocument: "after" },
    );

    const allMembers = [
      ...chat.users.map((u) => u.toString()),
      ...(chat.leftUsers || []).map((u) => u.toString()),
    ];

    const allUsersDeleted = allMembers.every((uId) =>
      updatedChat.deletedFor.some((delId) => delId.toString() === uId),
    );

    if (allUsersDeleted) {
      await Message.deleteMany({ chat: chatId });
      await Chat.findByIdAndDelete(chatId);
    }

    res.status(200).json({
      message: "Chat deleted for you successfully",
      chatId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
