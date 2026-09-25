import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./src/config/db.js";
import seedDatabase from "./src/config/seeder.js";
import { apiLimiter, authLimiter } from "./src/middlewares/rateLimiter.js";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import postRoutes from "./src/routes/postRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";

const app = express();
const PORT = process.env.PORT || 3333;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/api", apiLimiter);

const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL].filter(
  Boolean,
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("API is running smoothly with ES Modules & Socket.io...");
});

const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

const activeUsers = new Map();

const broadcastPresence = () => {
  const presenceMap = {};
  activeUsers.forEach((data, userId) => {
    presenceMap[userId] = {
      username: data.username,
      status: data.status,
      updatedAt: data.updatedAt,
    };
  });
  io.emit("presence update", presenceMap);
};

io.on("connection", (socket) => {
  console.log(`Connected to socket.io: ${socket.id}`);

  socket.on("setup", (userData) => {
    if (userData?._id) {
      const userId = userData._id.toString();
      socket.join(userId);
      socket.userId = userId;

      const existing = activeUsers.get(userId);
      if (existing) {
        existing.socketIds.add(socket.id);
        existing.updatedAt = new Date();
      } else {
        activeUsers.set(userId, {
          socketIds: new Set([socket.id]),
          username: userData.username,
          status: "Online 🟢",
          updatedAt: new Date(),
        });
      }

      broadcastPresence();
      console.log(
        `User ${userData.username} (${userId}) connected with socket ${socket.id}`,
      );
    }
    socket.emit("connected");
  });

  socket.on("change activity", ({ userId, activity }) => {
    if (!userId) return;
    const key = userId.toString();
    const existing = activeUsers.get(key);

    if (existing) {
      existing.status = activity;
      existing.updatedAt = new Date();
      broadcastPresence();
    }
  });

  socket.on("join chat", (room) => {
    if (room) {
      socket.join(room.toString());
    }
  });

  socket.on("typing", ({ chatId, userId }) => {
    if (chatId) {
      socket.to(chatId.toString()).emit("typing", { chatId, userId });
    }
  });

  socket.on("stop typing", ({ chatId, userId }) => {
    if (chatId) {
      socket.to(chatId.toString()).emit("stop typing", { chatId, userId });
    }
  });

  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived?.chat;
    if (!chat) return;

    const chatId = (chat._id || chat).toString();
    const senderId = (
      newMessageReceived.sender?._id || newMessageReceived.sender
    )?.toString();

    socket.in(chatId).emit("message received", newMessageReceived);

    if (chat.users && Array.isArray(chat.users)) {
      chat.users.forEach((user) => {
        const userId = (user._id || user).toString();
        const userSession = activeUsers.get(userId);

        if (
          userId !== senderId &&
          userSession &&
          userSession.socketIds.size > 0
        ) {
          userSession.socketIds.forEach((sId) => {
            const userSocket = io.sockets.sockets.get(sId);
            if (userSocket && !userSocket.rooms.has(chatId)) {
              socket.in(userId).emit("message received", newMessageReceived);
            }
          });
        }
      });
    }
  });

  socket.on("message reaction", (updatedMessage) => {
    const chat = updatedMessage?.chat;
    if (!chat) return;
    const chatId = (chat._id || chat).toString();
    socket.in(chatId).emit("message reaction", updatedMessage);
  });

  socket.on("message edited", (updatedMessage) => {
    const chat = updatedMessage?.chat;
    if (!chat) return;
    socket
      .in((chat._id || chat).toString())
      .emit("message edited", updatedMessage);
  });

  socket.on("message deleted", (deleteData) => {
    const chatId = (deleteData.chatId?._id || deleteData.chatId)?.toString();
    if (!chatId) return;
    socket.in(chatId).emit("message deleted", deleteData);
  });

  socket.on("messages read", ({ chatId, userId }) => {
    if (chatId) {
      socket.in(chatId.toString()).emit("messages read", { chatId, userId });
    }
  });

  socket.on("chat deleted", ({ chatId, usersToNotify }) => {
    if (usersToNotify && Array.isArray(usersToNotify)) {
      usersToNotify.forEach((userId) => {
        io.to(userId.toString()).emit("chat deleted", { chatId });
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId && activeUsers.has(socket.userId)) {
      const userSession = activeUsers.get(socket.userId);
      userSession.socketIds.delete(socket.id);

      if (userSession.socketIds.size === 0) {
        activeUsers.delete(socket.userId);
        console.log(`User ${socket.userId} fully disconnected & removed`);
      } else {
        console.log(
          `User ${socket.userId} closed tab ${socket.id}, but remains online in another tab`,
        );
      }
      broadcastPresence();
    }
  });
  socket.on("group updated", (updatedGroup) => {
    if (updatedGroup?._id) {
      io.in(updatedGroup._id.toString()).emit("group updated", updatedGroup);
    }
  });
  socket.on("create group", (newGroupChat) => {
    if (newGroupChat?.users && Array.isArray(newGroupChat.users)) {
      newGroupChat.users.forEach((user) => {
        const userId = (user._id || user).toString();
        io.to(userId).emit("chat created", newGroupChat);
      });
    }
  });
  socket.on("leave chat", (room) => {
    if (room) {
      socket.leave(room.toString());
      console.log(`Socket ${socket.id} left room ${room}`);
    }
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Express + Socket.io)`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();
