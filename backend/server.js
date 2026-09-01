import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./src/config/db.js";
// 1. 👇 Додаємо імпорт сідера (переконайся в точності шляху!)
import seedDatabase from "./src/config/seeder.js";

import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import postRoutes from "./src/routes/postRoutes.js";

const app = express();
const PORT = process.env.PORT || 3333;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

app.get("/", (req, res) => {
  res.send("API is running smoothly with ES Modules...");
});

const startServer = async () => {
  try {
    console.log("⏳ Підключаємося до MongoDB...");
    await connectDB();

    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is live on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Не вдалося підключитися до бази даних:", error);
  }
};

startServer();
