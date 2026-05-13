import "./loadEnv.js";
import express from "express";
import multer from "multer";
import {
  isAllowedVideo,
  MAX_FILE_SIZE_BYTES,
  processVideoUpload,
} from "./videoUploadCore.js";
import { analyzeVideoFromUrl } from "./videoAnalysisCore.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

function setCorsHeaders(req, res, next) {
  const allowedOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
}

app.use(setCorsHeaders);

app.options("/api/upload-video", (_req, res) => {
  res.status(204).end();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/analyze-video", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const { fileName, fileUrl, prompt } = req.body || {};
    const result = await analyzeVideoFromUrl({ fileName, fileUrl, prompt });
    res.status(200).json(result);
  } catch (error) {
    console.error("[cloud-run-upload] analysis failed", error);
    res.status(502).json({
      error: error instanceof Error ? error.message : "Video analysis failed.",
    });
  }
});

app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No video file was uploaded." });
      return;
    }

    if (!isAllowedVideo(file.originalname, file.mimetype)) {
      res.status(400).json({
        error: "Only .mp4, .mov, .webm, and .m4v video files are allowed.",
      });
      return;
    }

    const metadata = await processVideoUpload({
      file: {
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      video: new Blob([file.buffer], { type: file.mimetype }),
      fields: {
        subjectName: String(req.body?.subject_name || ""),
        orderNumber: String(req.body?.order_number || ""),
      },
    });

    res.status(200).json(metadata);
  } catch (error) {
    console.error("[cloud-run-upload] upload failed", error);
    const statusCode = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : 502;
    res.status(statusCode).json({
      error: error.publicMessage || (error instanceof Error ? error.message : "Video upload failed."),
      detail: error.publicMessage && error instanceof Error ? error.message : undefined,
    });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`[cloud-run-upload] listening on ${port}`);
});
