// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { auth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Upload image to Cloudinary
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer);
    
    res.json({
      success: true,
      imageUrl: result.secure_url,
      cloudinaryId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

module.exports = router;