// ========================
// IMPORTS
// ========================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { auth } = require('./middleware/auth'); // Your auth middleware
const userRoutes = require('./routes/user');

// ========================
// CLOUDINARY IMPORTS (ADDED)
// ========================
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

// ========================
// LOAD ENVIRONMENT VARIABLES
// ========================
dotenv.config();

// ========================
// CLOUDINARY CONFIGURATION (ADDED)
// ========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Log Cloudinary status
console.log('🔧 Cloudinary Status:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Configured' : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Configured' : '❌ Missing'
});

// ========================
// MULTER CONFIGURATION (for file uploads) (ADDED)
// ========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// ========================
// CREATE EXPRESS APP
// ========================
const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(express.json());

// ========================
// SERVE STATIC FILES
// ========================
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));

// ========================
// HTML PAGE ROUTES
// ========================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// ========================
// USER PROFILE ROUTES WITH ID
// ========================
app.get('/user/:userId/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// ========================
// API TEST ROUTES
// ========================
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// ========================
// CLOUDINARY TEST ENDPOINT (ADDED)
// ========================
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    
    res.json({
      success: true,
      message: 'Cloudinary is working!',
      cloudinary: result,
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Missing'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Cloudinary configuration error'
    });
  }
});

// ========================
// API ROUTES
// ========================
const authRoutes = require('./routes/auth');
const nftRoutes = require('./routes/nft');
const User = require('./models/User'); // Your User model

// Register page route
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

// User-specific register route (optional)
app.get("/user/:userId/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);

// ========================
// PAGE ROUTES
// ========================
app.get('/add-eth', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'add-eth.html'));
});

app.get('/convert-weth', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'convert-weth.html'));
});

app.get('/create-nft', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'create-nft.html'));
});

app.get('/activity', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'activity.html'));
});

// ========================
// REAL API: GET USER BY ID
// ========================
//app.get('/api/user/:userId', auth, async (req, res) => {
  //  try {
    //    const user = await User.findById(req.params.userId).select('-password');
      //  
        //if (!user) {
          //  return res.status(404).json({ error: 'User not found' });
      //  }
        
      //  res.json({
        //    success: true,
          //  user: {
            //    _id: user._id,
              //  email: user.email,
                //fullName: user.fullName,
         //       bio: user.bio,
           //     balance: user.balance,
             //   ethBalance: user.ethBalance,
               // wethBalance: user.wethBalance,
    //       //     profileImage: user.profileImage,
               // isAdmin: user.isAdmin,
                //createdAt: user.createdAt,
                //nftCount: user.nftCount,
               // totalVolume: user.totalVolume,
                //twitter: user.twitter,
               // website: user.website
          //  }
       // });
   // } catch (error) {
     //   console.error('Get user error:', error);
       // res.status(500).json({ error: 'Failed to fetch user' });
   // }
//});

// ========================
// REAL API: UPDATE USER PROFILE
// ========================
app.put('/api/user/:userId/profile', auth, async (req, res) => {
    try {
        // Check if user is updating their own profile
        if (req.user._id.toString() !== req.params.userId) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }
        
        const { fullName, bio, twitter, website } = req.body;
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields if provided
        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;
        if (twitter !== undefined) user.twitter = twitter;
        if (website !== undefined) user.website = website;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                bio: user.bio,
                twitter: user.twitter,
                website: user.website,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========================
// REAL API: GET USER'S NFTS
// ========================
app.get('/api/user/:userId/nfts', auth, async (req, res) => {
    try {
        const NFT = require('./models/NFT');
        const nfts = await NFT.find({ owner: req.params.userId })
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            nfts: nfts.map(nft => ({
                _id: nft._id,
                name: nft.name,
                collectionName: nft.collectionName,
                price: nft.price,
                image: nft.image,
                category: nft.category,
                tokenId: nft.tokenId,
                createdAt: nft.createdAt
            }))
        });
    } catch (error) {
        console.error('Get user NFTs error:', error);
        res.status(500).json({ error: 'Failed to fetch NFTs' });
    }
});

// Add this to your server.js (backend)
app.get('/api/eth-price', async (req, res) => {
  try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      // Cache for 5 minutes
      res.set('Cache-Control', 'public, max-age=300');
      
      res.json({
          success: true,
          price: data.ethereum?.usd || 2500,
          timestamp: Date.now()
      });
  } catch (error) {
      console.error('ETH price fetch error:', error);
      res.json({
          success: false,
          price: 2500,
          error: error.message,
          timestamp: Date.now()
      });
  }
});

// ========================
// DATABASE CONNECTION
// ========================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/magic-eden';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
    })
    .catch((err) => {
        console.log('⚠️ MongoDB Connection Note:', err.message);
        console.log('⚠️ App will continue without database');
    });

// ========================
// ERROR HANDLING
// ========================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});


// USER ROUTES
// ========================
app.use('/api/user', userRoutes);

// ========================
// ========================
// 404 HANDLER
// ========================
// At the end of your server.js, replace the 404 handler with:
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'), function(err) {
      if (err) {
          // If 404.html doesn't exist, send a simple JSON response
          res.status(404).json({ 
              error: 'Route not found',
              message: `Cannot GET ${req.originalUrl}`,
              timestamp: new Date().toISOString()
          });
      }
  });
});
// Add this test route
app.get('/api/test-user-routes', async (req, res) => {
  try {
      // Try to get user routes
      const user = require('./routes/user');
      
      const routes = [];
      user.stack.forEach((layer) => {
          if (layer.route) {
              routes.push({
                  path: `/api/user${layer.route.path}`,
                  methods: Object.keys(layer.route.methods)
              });
          }
      });
      
      res.json({
          success: true,
          message: 'Available user routes:',
          routes: routes,
          total: routes.length
      });
      
  } catch (error) {
      res.json({
          success: false,
          error: error.message
      });
  }
});
// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ REAL API Endpoints:`);
    console.log(`   • GET  /api/user/:userId - Get user data`);
    console.log(`   • PUT  /api/user/:userId/profile - Update profile`);
    console.log(`   • GET  /api/user/:userId/nfts - Get user's NFTs`);
    console.log(`🔗 Cloudinary Test: http://localhost:${PORT}/api/test-cloudinary`);
    console.log(`🔗 Profile Example: http://localhost:${PORT}/user/123/profile`);
});