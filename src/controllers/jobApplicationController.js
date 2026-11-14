
import JobApplication from "../models/JobApplication.js";
import fs from "fs/promises";
import path from "path";

// Helper: Uploaded resume delete
const removeResume = async (filename) => {
  if (!filename) return;

  try {
    const filePath = path.resolve("uploads/resumes", filename);
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Resume deletion error:", error.message);
    }
  }
};

// 1. Submit Job Application
export const submitJobApplication = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      jobCategory,
      education,
      experience,
      skills,
      portfolio,
      message,
    } = req.body;

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !jobCategory?.trim() ||
      !education?.trim() ||
      !experience?.trim() ||
      !skills?.trim()
    ) {
      if (req.file) await removeResume(req.file.filename);

      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      if (req.file) await removeResume(req.file.filename);

      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone.trim())) {
      if (req.file) await removeResume(req.file.filename);

      return res.status(400).json({
        success: false,
        message: "Please enter a valid Indian phone number",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume is required",
      });
    }

    if (portfolio?.trim()) {
      try {
        const url = new URL(portfolio.trim());

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        await removeResume(req.file.filename);

        return res.status(400).json({
          success: false,
          message: "Please enter a valid portfolio URL",
        });
      }
    }

    const application = await JobApplication.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      jobCategory: jobCategory.trim(),
      education: education.trim(),
      experience: experience.trim(),
      skills: skills.trim(),
      portfolio: portfolio?.trim() || "",
      message: message?.trim() || "",

      resume: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: `uploads/resumes/${req.file.filename}`,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Job application submitted successfully!",
      application: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        jobCategory: application.jobCategory,
        status: application.status,
        submittedAt: application.submittedAt,
      },
    });

  } catch (error) {
    if (req.file) await removeResume(req.file.filename);

    console.error("Submit Application Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit application",
    });
  }
};

// 2. Get All Applications (Admin)
export const getAllApplications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { status, jobCategory } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (jobCategory) filter.jobCategory = jobCategory;

    const [applications, total] = await Promise.all([
      JobApplication.find(filter)
        .select("-resume.path -resume.filename")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),

      JobApplication.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      applications,
    });

  } catch (error) {
    console.error("Get Applications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch applications",
    });
  }
};

// 3. Get Single Application
export const getApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id)
      .select("-resume.path -resume.filename");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid application ID",
    });
  }
};

// 4. Update Application Status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "reviewed",
      "shortlisted",
      "rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status",
      });
    }

    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select("-resume.path -resume.filename");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated",
      application,
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to update application",
    });
  }
};

// 5. Download Resume (Admin)
export const downloadResume = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const filePath = path.resolve(
      "uploads/resumes",
      application.resume.filename
    );

    return res.download(
      filePath,
      application.resume.originalName,
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({
            success: false,
            message: "Resume file not found",
          });
        }
      }
    );

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to download resume",
    });
  }
};

// 6. Delete Application (Admin)
export const deleteApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    await removeResume(application.resume.filename);
    await application.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });

  } catch (error) {
    console.error("Delete Application Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete application",
    });
  }
};
