// ========================
// IMPORTS
// ========================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const Redis = require('redis');
const { auth } = require('./middleware/auth');
const userRoutes = require('./routes/user');

// ========================
// CLOUDINARY IMPORTS
// ========================
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

// ========================
// LOAD ENVIRONMENT VARIABLES
// ========================
dotenv.config();

// ========================
// INITIALIZE EXPRESS APP
// ========================
const app = express();

// ========================
// WINDOWS REDIS CONNECTION (FIXED)
// ========================
let redisClient = null;
let redisReady = false;

async function initWindowsRedis() {
    console.log('🔧 Setting up Redis for Windows...');
    
    try {
        // Windows Redis connection
        redisClient = Redis.createClient({
            socket: {
                host: '127.0.0.1',
                port: 6379,
                connectTimeout: 10000,
                reconnectStrategy: (retries) => {
                    console.log(`Redis reconnection attempt ${retries}`);
                    if (retries > 3) {
                        console.log('❌ Max Redis retries reached');
                        return new Error('Too many retries');
                    }
                    return Math.min(retries * 100, 1000);
                }
            }
        });
        
        // Error handling
        redisClient.on('error', (err) => {
            console.log('⚠️ Redis Error:', err.message);
            redisReady = false;
        });
        
        redisClient.on('connect', () => {
            console.log('🔌 Redis connecting...');
        });
        
        redisClient.on('ready', () => {
            console.log('✅ Redis connected and ready!');
            redisReady = true;
        });
        
        // Connect with timeout
        await Promise.race([
            redisClient.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
            )
        ]);
        
        // Test connection
        await redisClient.set('windows-test', 'connected-' + Date.now());
        const testResult = await redisClient.get('windows-test');
        console.log(`🧪 Redis test successful: ${testResult}`);
        
        redisReady = true;
        
    } catch (error) {
        console.log(`❌ Redis initialization failed: ${error.message}`);
        console.log('\n📋 Windows Redis Troubleshooting:');
        console.log('1. Open Command Prompt AS ADMINISTRATOR');
        console.log('2. Run: net start Redis');
        console.log('3. If service not found, run:');
        console.log('   cd "C:\\Program Files\\Redis"');
        console.log('   redis-server --service-install redis.windows.conf');
        console.log('   redis-server --service-start');
        console.log('4. Test manually: redis-cli ping');
        
        redisClient = null;
        redisReady = false;
    }
}

// Initialize Redis
initWindowsRedis();

// ========================
// CLOUDINARY CONFIGURATION
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
// ========================
// ========================
// ETH PRICE ENDPOINT (WITH AXIOS)
// ========================
app.get('/api/eth-price', async (req, res) => {
  console.log('🌐 ETH price request received');
  
  try {
    let cachedPrice = null;
    let cachedTime = null;
    
    // Try Redis cache if available
    if (redisReady && redisClient) {
      try {
        cachedPrice = await redisClient.get('eth:price');
        cachedTime = await redisClient.get('eth:price:time');
        console.log('📦 Redis cache:', cachedPrice ? 'HIT' : 'MISS');
      } catch (redisErr) {
        console.log('⚠️ Redis cache error:', redisErr.message);
      }
    }
    
    const now = Date.now();
    const CACHE_DURATION = 60000; // 1 minute
    
    // Return cached if fresh
    if (cachedPrice && cachedTime && 
        (now - parseInt(cachedTime)) < CACHE_DURATION) {
      return res.json({
        success: true,
        price: parseFloat(cachedPrice),
        cached: true,
        timestamp: cachedTime,
        source: 'redis-cache'
      });
    }
    
    // Fetch fresh from CoinGecko using AXIOS
    console.log('🔄 Fetching fresh ETH price from CoinGecko (axios)...');
    
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'ethereum',
            vs_currencies: 'usd'
          },
          headers: {
            'User-Agent': 'MagicEden-NFT-Marketplace/1.0',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      const data = response.data;
      const price = data.ethereum?.usd || 2500;
      console.log('✅ CoinGecko response:', price);
      
      // Update Redis cache if available
      if (redisReady && redisClient) {
        try {
          await redisClient.set('eth:price', price.toString());
          await redisClient.set('eth:price:time', now.toString());
          console.log('💾 Price saved to Redis cache');
        } catch (setErr) {
          console.log('⚠️ Could not save to Redis:', setErr.message);
        }
      }
      
      // Return fresh price
      return res.json({
        success: true,
        price: price,
        cached: false,
        timestamp: now,
        source: 'coingecko-fresh'
      });
      
    } catch (axiosError) {
      console.error('❌ Axios CoinGecko error:', axiosError.message);
      
      // If we have stale cache, use it
      if (cachedPrice) {
        console.log('⚠️ Using stale cache due to CoinGecko error');
        return res.json({
          success: true,
          price: parseFloat(cachedPrice),
          cached: true,
          stale: true,
          timestamp: cachedTime,
          source: 'stale-cache-error'
        });
      }
      
      throw new Error(`CoinGecko API error: ${axiosError.message}`);
    }
    
  } catch (error) {
    console.error('❌ ETH price endpoint error:', error.message);
    
    // Final fallback
    return res.json({
      success: false,
      price: 2500,
      cached: false,
      error: true,
      message: 'Using default price',
      timestamp: Date.now()
    });
  }
});
// ========================
// ========================
// MULTIPLE CRYPTOCURRENCY PRICES ENDPOINT (AXIOS)
// ========================
app.get('/api/crypto-prices', async (req, res) => {
  try {
    const ids = req.query.ids || 'ethereum,solana';
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: ids,
          vs_currencies: 'usd'
        }
      }
    );
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Crypto prices error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch prices',
      message: error.message 
    });
  }
});

// ========================
// MULTER CONFIGURATION (for file uploads)
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
// CLOUDINARY TEST ENDPOINT
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
const User = require('./models/User');

// ========================
// REAL NFT CREATION API (with Cloudinary)
// ========================
app.post('/api/nft/create', auth, upload.single('image'), async (req, res) => {
  try {
      console.log('📤 NFT Creation Request:', req.body);
      console.log('📁 File received:', req.file);
      
      if (!req.file) {
          return res.status(400).json({ 
              success: false, 
              error: 'No image file provided' 
          });
      }
      
      // Upload to Cloudinary
      console.log('☁️ Uploading to Cloudinary...');
      const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'magic-eden-nfts',
          resource_type: 'auto'
      });
      
      console.log('✅ Cloudinary upload successful:', cloudinaryResult.url);
      
      // Clean up local file
      fs.unlinkSync(req.file.path);
      
      // Get user from request (added by auth middleware)
      const user = req.user;
      
      // Create NFT in database
      const NFT = require('./models/NFT');
      const nft = new NFT({
          name: req.body.name,
          collectionName: req.body.collection_name || 'Unnamed Collection',
          price: parseFloat(req.body.price),
          category: req.body.category || 'art',
          image: cloudinaryResult.secure_url,
          owner: user._id,
          description: req.body.description || '',
          externalUrl: req.body.external_url || '',
          royalty: parseFloat(req.body.royalty) || 5,
          cloudinaryId: cloudinaryResult.public_id,
          metadata: {
              format: cloudinaryResult.format,
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
              bytes: cloudinaryResult.bytes
          }
      });
      
      // Generate token ID
      nft.tokenId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await nft.save();
      
      // Update user's NFT count
      await User.findByIdAndUpdate(user._id, {
          $inc: { nftCount: 1 }
      });
      
      console.log('✅ NFT saved to database:', nft._id);
      
      res.json({
          success: true,
          message: 'NFT created successfully!',
          nft: {
              _id: nft._id,
              name: nft.name,
              price: nft.price,
              image: nft.image,
              collectionName: nft.collectionName,
              tokenId: nft.tokenId,
              createdAt: nft.createdAt
          }
      });
      
  } catch (error) {
      console.error('❌ NFT creation error:', error);
      
      // Clean up file if exists
      if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
          success: false, 
          error: error.message || 'Failed to create NFT' 
      });
  }
});

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

// USER ROUTES
// ========================
app.use('/api/user', userRoutes);

// ========================
// TEST USER ROUTES ENDPOINT
// ========================
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
// ERROR HANDLING
// ========================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// ========================
// 404 HANDLER
// ========================
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

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ REAL API Endpoints:`);
    console.log(`   • GET  /api/eth-price - Get ETH price with Redis cache`);
    console.log(`   • GET  /api/crypto-prices - Get multiple crypto prices`);
    console.log(`   • PUT  /api/user/:userId/profile - Update profile`);
    console.log(`   • GET  /api/user/:userId/nfts - Get user's NFTs`);
    console.log(`🔗 Cloudinary Test: http://localhost:${PORT}/api/test-cloudinary`);
    console.log(`🔗 ETH Price Test: http://localhost:${PORT}/api/eth-price`);
    console.log(`🔗 Profile Example: http://localhost:${PORT}/user/123/profile`);
});