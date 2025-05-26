import "dotenv/config.js";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { initSocket } from "./socket.js";

import userRoutes from "./routes/users.route.js";
import fileRoutes from "./routes/files.route.js";

// Create Express application
const app = express();

// Get port from environment or default to 5000
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initSocket(io);



// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "Loan Application API Server is running!",
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

app.use("/api/users", userRoutes);
app.use("/api/upload-docs", fileRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong!",
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
