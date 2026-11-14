
import express from "express";

import {
    submitJobApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    downloadResume,
    deleteApplication,
} from "../controllers/jobApplicationController.js";

import uploadResume from "../middleware/uploadResume.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: Apply for Job
router.post(
    "/apply",
    uploadResume.single("resume"),
    submitJobApplication
);

// Admin: Get All Applications
router.get(
    "/",
    protect,
    adminOnly,
    getAllApplications
);

// Admin: Get Single Application
router.get(
    "/:id",
    protect,
    adminOnly,
    getApplicationById
);

// Admin: Download Resume
router.get(
    "/:id/resume",
    protect,
    adminOnly,
    downloadResume
);

// Admin: Update Status
router.patch(
    "/:id/status",
    protect,
    adminOnly,
    updateApplicationStatus
);

// Admin: Delete Application
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteApplication
);

export default router;
