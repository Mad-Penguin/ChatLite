import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "./auth.js";

// Cloudinary credentials (need of .env not in repository)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer in-memory storage (no saving files to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // max 5 MB
});


function streamUpload(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: process.env.CLOUDINARY_FOLDER || folder, resource_type: "image" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });
}

export default function uploadRouter() {
  const router = express.Router();

  router.post("/avatar", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const result = await streamUpload(req.file.buffer, "avatars");
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  router.post("/image", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const result = await streamUpload(req.file.buffer, "messages");
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error("Image upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  return router;
}
