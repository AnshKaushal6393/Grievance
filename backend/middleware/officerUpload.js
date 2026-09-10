import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const allowedExtensions = /jpeg|jpg|png|webp/i;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.test(ext)) {
    cb(null, true);
  } else {
    const error = new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed.");
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

const officerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file limit
  },
  fileFilter,
});

export const uploadOfficerStatusImages = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    return next();
  }
  officerUpload.fields([
    { name: "evidenceImages", maxCount: 5 },
    { name: "resolutionImages", maxCount: 5 },
  ])(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum size is 5MB per file.",
        });
      }
      if (err.code === "INVALID_FILE_TYPE" || err.message?.includes("Invalid file type")) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};
