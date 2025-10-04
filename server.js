const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { createCanvas } = require("canvas");

const app = express();
const PORT = 3001;

// --- Fix for pdfjs-dist in Node ---
global.Canvas = createCanvas;
global.HTMLCanvasElement = function () {};
global.document = {
  createElement: (tag) => {
    if (tag === "canvas") {
      return createCanvas(200, 200);
    }
    throw new Error("Only canvas is supported in this polyfill");
  },
};

const pdfExtract = require("pdf-table-extractor");

// --- Middlewares ---
app.use(cors());
app.use(express.json());

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF Extractor API is running' });
});

app.post('/api/extract-pdf', upload.single('pdf'), async (req, res) => {
  let pdfPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    pdfPath = req.file.path;
    console.log('Processing PDF:', req.file.originalname);

    pdfExtract(pdfPath, (data) => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      console.log('PDF processed successfully');
      res.json({ success: true, data, filename: req.file.originalname });
    }, (err) => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      console.error('Extraction error:', err);
      res.status(500).json({ success: false, error: 'Failed to extract tables from PDF', details: err.message });
    });

  } catch (error) {
    console.error('Server error:', error);
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
});

// --- Error handling ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Something went wrong', details: err.message });
});


// Prevent crashing on async pdfjs errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception (ignored):", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection (ignored):", reason);
});


// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 PDF Extractor API running on http://localhost:${PORT}`);
});
