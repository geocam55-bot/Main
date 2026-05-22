import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/import-export/upload
router.post('/', upload.single('file'), async (req, res) => {
  // TODO: Upload file to S3 or process as needed
  // For now, just return the uploaded file info
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ fileId: req.file.filename, originalName: req.file.originalname });
});

export default router;
