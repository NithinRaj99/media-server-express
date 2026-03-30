const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());

// =====================
// Storage Config
// =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, "uploads/videos");
    } else if (file.mimetype.startsWith("image/")) {
      cb(null, "uploads/images");
    } else {
      cb(new Error("Only image/video allowed"), null);
    }
  },
  filename: (req, file, cb) => {
  const ext = path.extname(file.originalname); // .mp4, .jpg
  const uniqueName =
    Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

  cb(null, uniqueName);
},
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB
});

// =====================
// Upload API
// =====================
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let url = "";

  if (req.file.mimetype.startsWith("video/")) {
    url = `/video/${req.file.filename}`;
  } else {
    url = `/image/${req.file.filename}`;
  }

  res.json({
    filename: req.file.filename,
    type: req.file.mimetype,
    url: url,
  });
});

// =====================
// Video Streaming
// =====================
app.get("/video/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads/videos", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// =====================
// Image Serve
// =====================
app.get("/image/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads/images", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Image not found");
  }

  res.sendFile(filePath);
});

// =====================
// Start Server
// =====================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});