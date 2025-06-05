import "dotenv/config.js";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { initSocket } from "./socket.js";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/users.route.js";
import fileRoutes from "./routes/files.route.js";
import notificationRoutes from "./routes/notification.route.js";
// import documentsRoutes from "./routes/documents.route.js";
import loanApplicationsRoutes from "./routes/loanApplications.route.js";
import generatedFilesRoutes from "./routes/generatedFiles.route.js";

// Create Express application
const app = express();

// Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get port from environment or default to 5000
const PORT = process.env.PORT || 8000;

const ALLOWED_ORIGINS = ["http://localhost:3000"].filter(Boolean);

const corsOptions = {
  // origin: function (origin, callback) {
  //   if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
  //     callback(null, true);
  //   } else {
  //     callback(new Error("Not allowed by CORS"));
  //   }
  // },
  // credentials: true,
  // methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  // allowedHeaders: [
  //   "Content-Type",
  //   "Authorization",
  //   "Access-Control-Allow-Origin",
  //   "Access-Control-Allow-Headers",
  //   "Access-Control-Allow-Credentials",
  // ],
  origin: "http://localhost:3000",
  // credentials: true,
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

initSocket(io);
console.log("Socket.io initialized");

// Serve /temp/uploads as public folder
app.use("/temp/uploads", express.static(path.join(__dirname, "temp/uploads")));
app.use("/temp/excel", express.static(path.join(__dirname, "/temp/excel")));
app.use(express.static(path.join(__dirname, "public")));
// Basic route for testing
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
  0;
});

//user routers handling:
app.use("/api/users", userRoutes);
// console.log("User routes initialized");

// File upload and document handling routes
app.use("/api/upload-docs", fileRoutes);
app.use("/api/admin-verify", fileRoutes);
// app.use("/api/generate-docs", documentsRoutes);

//notification routes handling:
app.use("/api/notification", notificationRoutes);

//handling loan applications routing
app.use("/api/loan-applications", loanApplicationsRoutes);

//handling generated excel document routes
app.use("/api/generated-excel", generatedFilesRoutes);

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
server.listen(PORT, () => {
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
