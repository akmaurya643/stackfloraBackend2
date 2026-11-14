import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import jobApplicationRoutes from "./routes/jobApplicationRoutes.js";
import multer from "multer";
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to STACKFLORA API",
    status: "Server Running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(
      err.code === "LIMIT_FILE_SIZE" ? 413 : 400
    ).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Resume size cannot exceed 5MB"
          : err.message,
    });
  }

  if (err.message === "Only PDF, DOC and DOCX files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Job Application Routes
app.use("/api/job-applications", jobApplicationRoutes);

export default app;