// ========================
// IMPORTS
// ========================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const ticketRoutes = require('./routes/ticketRoutes');
const Redis = require('redis');
const { auth } = require('./middleware/auth');
const userRoutes = require('./routes/user');
const collectionRoutes = require('./routes/collection');

// Cloudinary imports
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');

// Model imports
const User = require('./models/User');
const Activity = require('./models/Activity');
const ActivityLogger = require('./utils/activityLogger');

// ========================
// LOAD ENVIRONMENT VARIABLES
// ========================
dotenv.config();

// ========================
// INITIALIZE EXPRESS APP
// ========================
const app = express();

// ========================
// WINDOWS REDIS CONNECTION
// ========================
let redisClient = null;
let redisReady = false;

async function initWindowsRedis() {
    console.log('🔧 Setting up Redis for Windows...');
    
    try {
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
        
        await Promise.race([
            redisClient.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
            )
        ]);
        
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

initWindowsRedis();

// ========================
// CLOUDINARY CONFIGURATION
// ========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔧 Cloudinary Status:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ Configured' : '❌ Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ Configured' : '❌ Missing'
});

// ========================
// MULTER CONFIGURATION
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
  limits: { fileSize: 10 * 1024 * 1024 },
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
app.use(express.json({ limit: '50mb' })); // CHANGED: Add limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // CHANGED: Add limit
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({ // ADD THIS LINE
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    abortOnLimit: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ========================
// HELPER FUNCTIONS
// ========================
function getActivityIcon(type) {
    const icons = {
        'nft_created': '🖼️',
        'nft_purchased': '🛒',
        'nft_sold': '💰',
        'nft_transferred': '🔄',
        'bid_placed': '🎯',
        'bid_accepted': '✅',
        'funds_added': '➕',
        'login': '🔐',
        'profile_updated': '👤'
    };
    return icons[type] || '📌';
}

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

app.get('/user/:userId/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

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

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get("/user/:userId/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get('/create-collection', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'create-collection.html'));
});

app.get('/collection/:collectionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'collection.html'));
});

app.get('/nft/:nftId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'nft-detail.html'));
});

// ========================
// API ROUTES
// ========================
const authRoutes = require('./routes/auth');
const nftRoutes = require('./routes/nft');
const adminRoutes = require('./routes/admin');

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/user', userRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support/tickets', ticketRoutes);

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

app.get('/api/test-user-routes', async (req, res) => {
  try {
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
// ETH PRICE ENDPOINT
// ========================
app.get('/api/eth-price', async (req, res) => {
  console.log('🌐 ETH price request received');
  
  try {
    let cachedPrice = null;
    let cachedTime = null;
    
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
    const CACHE_DURATION = 60000;
    
    if (cachedPrice && cachedTime && (now - parseInt(cachedTime)) < CACHE_DURATION) {
      return res.json({
        success: true,
        price: parseFloat(cachedPrice),
        cached: true,
        timestamp: cachedTime,
        source: 'redis-cache'
      });
    }
    
    console.log('🔄 Fetching fresh ETH price from CoinGecko...');
    
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
          timeout: 10000
        }
      );
      
      const data = response.data;
      const price = data.ethereum?.usd || 2500;
      console.log('✅ CoinGecko response:', price);
      
      if (redisReady && redisClient) {
        try {
          await redisClient.set('eth:price', price.toString());
          await redisClient.set('eth:price:time', now.toString());
          console.log('💾 Price saved to Redis cache');
        } catch (setErr) {
          console.log('⚠️ Could not save to Redis:', setErr.message);
        }
      }
      
      return res.json({
        success: true,
        price: price,
        cached: false,
        timestamp: now,
        source: 'coingecko-fresh'
      });
      
    } catch (axiosError) {
      console.error('❌ Axios CoinGecko error:', axiosError.message);
      
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
// CRYPTO PRICES ENDPOINT
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

// Add to server.js (not admin routes - this is public)
app.get('/api/marketplace/stats', async (req, res) => {
    try {
        const MarketplaceStats = require('./models/MarketplaceStats');
        const stats = await MarketplaceStats.getStats();
        
        res.json({
            success: true,
            stats: {
                nfts: stats.displayedNFTs,
                users: stats.displayedUsers,
                volume: stats.displayedVolume.toFixed(1),
                collections: stats.displayedCollections,
                lastUpdated: stats.lastUpdated
            }
        });
        
    } catch (error) {
        console.error('Public marketplace stats error:', error);
        // Fallback to actual counts
        try {
            const NFT = require('./models/NFT');
            const User = require('./models/User');
            
            const actualNFTs = await NFT.countDocuments({ isListed: true });
            const actualUsers = await User.countDocuments({ isActive: true });
            
            res.json({
                success: true,
                stats: {
                    nfts: actualNFTs,
                    users: actualUsers,
                    volume: '0.0',
                    collections: 0,
                    lastUpdated: new Date()
                }
            });
        } catch (fallbackError) {
            res.json({
                success: true,
                stats: {
                    nfts: 0,
                    users: 0,
                    volume: '0.0',
                    collections: 0,
                    lastUpdated: new Date()
                }
            });
        }
    }
});

// ========================
// DASHBOARD DATA ENDPOINT
// ========================
app.get('/api/user/me/dashboard', auth, async (req, res) => {
  try {
      console.log('📊 Dashboard data request for user:', req.user.email);
      
      const userId = req.user._id;
      
      // Get user data
      const user = await User.findById(userId).select('-password -__v');
      
      // Get recent activities (limit 5)
      const recentActivities = await Activity.find({ userId: userId })
          .sort({ createdAt: -1 })
          .limit(5);
      
      // Get user's NFTs (limit 2 for dashboard)
      const NFT = require('./models/NFT');
      const userNFTs = await NFT.find({ owner: userId })
          .sort({ price: -1, createdAt: -1 })
          .limit(2);
      
      // Get recommended NFTs (from marketplace)
      const recommendedNFTs = await NFT.find({ 
          owner: { $ne: userId }, // Not owned by user
          isListed: true 
      })
          .sort({ createdAt: -1 })
          .limit(4)
          .populate('owner', 'fullName profileImage');
      
      // Get ETH price
      let ethPrice = 2500;
      if (redisReady && redisClient) {
          try {
              const cachedPrice = await redisClient.get('eth:price');
              if (cachedPrice) {
                  ethPrice = parseFloat(cachedPrice);
              }
          } catch (redisErr) {
              console.log('⚠️ Could not get ETH price from Redis:', redisErr.message);
          }
      }
      
      res.json({
          success: true,
          dashboard: {
              user: {
                  _id: user._id,
                  email: user.email,
                  fullName: user.fullName,
                  bio: user.bio,
                  twitter: user.twitter,
                  website: user.website,
                  profileImage: user.profileImage,
                  ethBalance: user.ethBalance || 0,
                  wethBalance: user.wethBalance || user.balance || 0,
                  nftCount: user.nftCount || 0,
                  createdAt: user.createdAt
              },
              recentActivities: recentActivities.map(activity => ({
                  _id: activity._id,
                  type: activity.type,
                  title: activity.title,
                  description: activity.description,
                  amount: activity.amount,
                  currency: activity.currency,
                  icon: getActivityIcon(activity.type),
                  createdAt: activity.createdAt
              })),
              userNFTs: userNFTs.map(nft => ({
                  _id: nft._id,
                  name: nft.name,
                  collectionName: nft.collectionName,
                  price: nft.price,
                  image: nft.image,
                  tokenId: nft.tokenId,
                  isListed: nft.isListed || true,
                  createdAt: nft.createdAt
              })),
              recommendedNFTs: recommendedNFTs.map(nft => ({
                  _id: nft._id,
                  name: nft.name,
                  collectionName: nft.collectionName,
                  price: nft.price,
                  image: nft.image,
                  tokenId: nft.tokenId,
                  creator: nft.owner ? nft.owner.fullName || 'Anonymous' : 'Anonymous',
                  createdAt: nft.createdAt
              })),
              marketData: {
                  ethPrice: ethPrice,
                  timestamp: Date.now()
              }
          }
      });
      
  } catch (error) {
      console.error('❌ Dashboard data error:', error);
      res.status(500).json({
          success: false,
          error: 'Failed to fetch dashboard data',
          message: error.message
      });
  }
});

// ========================
// LATEST NFTS ENDPOINT (FOR RECOMMENDATIONS)
// ========================
app.get('/api/nft/latest', auth, async (req, res) => {
  try {
      const NFT = require('./models/NFT');
      const latestNFTs = await NFT.find({ isListed: true })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('owner', 'fullName profileImage');
      
      res.json({
          success: true,
          nfts: latestNFTs.map(nft => ({
              _id: nft._id,
              name: nft.name,
              collectionName: nft.collectionName,
              price: nft.price,
              image: nft.image,
              tokenId: nft.tokenId,
              creator: nft.owner ? nft.owner.fullName || 'Anonymous' : 'Anonymous',
              creatorImage: nft.owner?.profileImage,
              createdAt: nft.createdAt
          }))
      });
      
  } catch (error) {
      console.error('Latest NFTs error:', error);
      res.status(500).json({ 
          success: false,
          error: 'Failed to fetch latest NFTs' 
      });
  }
});

// ========================
// MARKETPLACE ACTIVITY ENDPOINT
// ========================
app.get('/api/activity/marketplace', async (req, res) => {
  try {
      console.log('📊 Marketplace activity request');
      
      let Activity;
      try {
          Activity = require('./models/Activity');
      } catch (error) {
          console.log('Activity model not available yet');
          return res.json({
              success: true,
              count: 0,
              activities: []
          });
      }
      
      const activities = await Activity.find({})
          .populate('userId', 'email fullName')
          .sort({ createdAt: -1 })
          .limit(100);
      
      console.log(`✅ Found ${activities.length} marketplace activities`);
      
      const formattedActivities = activities.map(activity => ({
          _id: activity._id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          amount: activity.amount,
          currency: activity.currency,
          createdAt: activity.createdAt,
          user: activity.userId ? {
              _id: activity.userId._id,
              email: activity.userId.email,
              fullName: activity.userId.fullName
          } : null,
          metadata: activity.metadata
      }));
      
      res.json({
          success: true,
          count: formattedActivities.length,
          activities: formattedActivities
      });
      
  } catch (error) {
      console.error('❌ Error fetching marketplace activity:', error);
      res.status(500).json({
          success: false,
          error: 'Failed to fetch marketplace activity',
          message: error.message
      });
  }
});

// ========================
// USER ACTIVITY ENDPOINT (FIXED)
// ========================
app.get('/api/user/:userId/activity', auth, async (req, res) => {
  try {
      console.log('📊 Activity request for user:', req.params.userId);
      
      if (req.user._id.toString() !== req.params.userId) {
          return res.status(403).json({ 
              success: false,
              error: 'Not authorized to view this activity' 
          });
      }
      
      const activities = await Activity.find({ userId: req.params.userId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('userId', 'email fullName profileImage');
      
      console.log(`✅ Found ${activities.length} activities for user`);
      
      const formattedActivities = activities.map(activity => ({
          _id: activity._id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          amount: activity.amount,
          currency: activity.currency,
          createdAt: activity.createdAt,
          icon: getActivityIcon(activity.type),
          user: activity.userId ? {
              _id: activity.userId._id,
              email: activity.userId.email,
              fullName: activity.userId.fullName,
              profileImage: activity.userId.profileImage
          } : null,
          metadata: activity.metadata,
          relatedId: activity.relatedId,
          relatedType: activity.relatedType
      }));
      
      res.json({
          success: true,
          count: formattedActivities.length,
          activities: formattedActivities
      });
      
  } catch (error) {
      console.error('❌ Error fetching activity:', error);
      res.status(500).json({ 
          success: false,
          error: 'Failed to fetch activity',
          message: error.message 
      });
  }
});

// ========================
// NFT CREATION ENDPOINT (WITH ACTIVITY LOGGING)
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
      
      console.log('☁️ Uploading to Cloudinary...');
      const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'magic-eden-nfts',
          resource_type: 'auto'
      });
      
      console.log('✅ Cloudinary upload successful:', cloudinaryResult.url);
      
      fs.unlinkSync(req.file.path);
      
      const user = req.user;
      
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
          },
          isListed: true // Automatically list when created
      });
      
      nft.tokenId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await nft.save();
      
      // Log activity for NFT creation
      try {
          await ActivityLogger.logNFTCreation(
              user._id,
              nft._id,
              nft.name,
              nft.price
          );
          console.log('📝 Activity logged for NFT creation');
      } catch (activityError) {
          console.log('⚠️ Could not log activity:', activityError.message);
      }
      
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
              createdAt: nft.createdAt,
              isListed: nft.isListed
          }
      });
      
  } catch (error) {
      console.error('❌ NFT creation error:', error);
      
      if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
          success: false, 
          error: error.message || 'Failed to create NFT' 
      });
  }
});

// ========================
// UPDATE USER PROFILE (WITH ACTIVITY LOGGING)
// ========================
app.put('/api/user/:userId/profile', auth, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.userId) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }
        
        const { fullName, bio, twitter, website } = req.body;
        
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const updates = {};
        if (fullName !== undefined && fullName !== user.fullName) {
            updates.fullName = fullName;
            user.fullName = fullName;
        }
        if (bio !== undefined && bio !== user.bio) {
            updates.bio = bio;
            user.bio = bio;
        }
        if (twitter !== undefined && twitter !== user.twitter) {
            updates.twitter = twitter;
            user.twitter = twitter;
        }
        if (website !== undefined && website !== user.website) {
            updates.website = website;
            user.website = website;
        }
        
        await user.save();
        
        if (Object.keys(updates).length > 0) {
            try {
                await ActivityLogger.logProfileUpdate(user._id, updates);
                console.log('📝 Activity logged for profile update');
            } catch (activityError) {
                console.log('⚠️ Could not log profile update activity:', activityError.message);
            }
        }
        
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
// GET USER'S NFTS (UPDATED WITH isListed FIELD)
// ========================
app.get('/api/user/:userId/nfts', auth, async (req, res) => {
    try {
        const NFT = require('./models/NFT');
        const nfts = await NFT.find({ owner: req.params.userId })
            .sort({ price: -1, createdAt: -1 });
        
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
                createdAt: nft.createdAt,
                isListed: nft.isListed || true // Include this field
            }))
        });
    } catch (error) {
        console.error('Get user NFTs error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch NFTs' 
        });
    }
});

// ========================
// ADD FUNDS ENDPOINT (WITH ACTIVITY LOGGING)
// ========================
app.post('/api/user/:userId/add-funds', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.params.userId;
        
        if (req.user._id.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                $inc: { 
                    balance: amount,
                    wethBalance: amount 
                } 
            },
            { new: true }
        );
        
        try {
            await ActivityLogger.logFundsAdded(userId, amount);
            console.log('📝 Activity logged for funds added');
        } catch (activityError) {
            console.log('⚠️ Could not log funds activity:', activityError.message);
        }
        
        res.json({
            success: true,
            message: `Added ${amount} WETH to your wallet`,
            newBalance: user.balance
        });
        
    } catch (error) {
        console.error('Add funds error:', error);
        res.status(500).json({ error: 'Failed to add funds' });
    }
});

// ========================
// TEST ROUTE FOR SAMPLE ACTIVITIES
// ========================
app.post('/api/test/add-sample-activities/:userId', auth, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.params.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const userId = req.params.userId;
        const sampleActivities = [
            {
                userId,
                type: 'login',
                title: 'User Login',
                description: 'Logged into your account',
                createdAt: new Date(Date.now() - 3600000)
            },
            {
                userId,
                type: 'nft_created',
                title: 'NFT Created',
                description: 'Created "Crypto Punk #123"',
                amount: 2.5,
                currency: 'WETH',
                createdAt: new Date(Date.now() - 7200000)
            },
            {
                userId,
                type: 'funds_added',
                title: 'Funds Added',
                description: 'Added 10 WETH to wallet',
                amount: 10,
                currency: 'WETH',
                createdAt: new Date(Date.now() - 10800000)
            },
            {
                userId,
                type: 'profile_updated',
                title: 'Profile Updated',
                description: 'Updated your profile information',
                createdAt: new Date(Date.now() - 14400000)
            }
        ];
        
        await Activity.insertMany(sampleActivities);
        
        res.json({
            success: true,
            message: 'Added 4 sample activities',
            count: sampleActivities.length
        });
        
    } catch (error) {
        console.error('Sample activities error:', error);
        res.status(500).json({ error: 'Failed to add sample activities' });
    }
});

// ========================
// UPLOAD ENDPOINT
// ========================
app.post('/api/upload/image', auth, async (req, res) => {
    try {
        console.log('📤 Image upload request received');
        
        if (!req.files || !req.files.image) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image file provided' 
            });
        }
        
        const image = req.files.image;
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        // Validate file size
        if (image.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: `File size (${(image.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB`
            });
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(image.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'File type not supported. Please upload JPEG, PNG, GIF, or WebP'
            });
        }
        
        console.log(`📁 Uploading file: ${image.name} (${(image.size / 1024 / 1024).toFixed(2)}MB)`);
        
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Generate unique filename
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(image.name);
        const uploadPath = path.join(uploadDir, uniqueName);
        
        // Save file locally
        await image.mv(uploadPath);
        
        console.log('✅ File saved locally:', uploadPath);
        
        // Option 1: Upload to Cloudinary (if configured)
        let cloudinaryId = null;
        let imageUrl = null;
        
        if (process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_API_KEY && 
            process.env.CLOUDINARY_API_SECRET) {
            
            try {
                console.log('☁️ Uploading to Cloudinary...');
                const cloudinaryResult = await cloudinary.uploader.upload(uploadPath, {
                    folder: 'magic-eden-nfts',
                    resource_type: 'auto'
                });
                
                imageUrl = cloudinaryResult.secure_url;
                cloudinaryId = cloudinaryResult.public_id;
                
                console.log('✅ Cloudinary upload successful:', imageUrl);
                
                // Remove local file after Cloudinary upload
                fs.unlinkSync(uploadPath);
                
            } catch (cloudinaryError) {
                console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
                // Fall back to local storage
            }
        }
        
        // Option 2: Use local URL (fallback)
        if (!imageUrl) {
            imageUrl = `http://localhost:5000/uploads/${uniqueName}`;
            cloudinaryId = `local_${Date.now()}`;
        }
        
        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imageUrl,
            cloudinaryId: cloudinaryId,
            fileName: image.name,
            fileSize: image.size,
            mimetype: image.mimetype
        });
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to upload image',
            message: error.message 
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
// TEST TICKET ENDPOINT
// ========================
app.get('/api/test-ticket', async (req, res) => {
    try {
        const Ticket = require('./models/Ticket');
        
        // Count total tickets
        const totalTickets = await Ticket.countDocuments();
        
        // Get sample tickets
        const sampleTickets = await Ticket.find({})
            .limit(5)
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            message: 'Ticket system test',
            totalTickets,
            sampleTickets: sampleTickets.map(t => ({
                ticketId: t.ticketId,
                subject: t.subject,
                status: t.status,
                createdAt: t.createdAt
            }))
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Debug: List all registered routes
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    
    // Check main routes
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            // Check mounted routers
            if (middleware.handle && middleware.handle.stack) {
                middleware.handle.stack.forEach((handler) => {
                    if (handler.route) {
                        const basePath = middleware.regexp.toString()
                            .replace('/^', '')
                            .replace('\\/?(?=\\/|$)/i', '')
                            .replace(/\\\//g, '/');
                        
                        routes.push({
                            path: basePath + handler.route.path,
                            methods: Object.keys(handler.route.methods)
                        });
                    }
                });
            }
        }
    });
    
    res.json({
        success: true,
        totalRoutes: routes.length,
        routes: routes.filter(route => route.path.includes('/api/')).sort((a, b) => a.path.localeCompare(b.path))
    });
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
    console.log(`✅ API Endpoints:`);
    console.log(`   • GET  /api/test - Test API`);
    console.log(`   • GET  /api/marketplace/stats - Public Marketplace stats`);
    console.log(`   • GET  /api/admin/* - Admin routes`);
    console.log(`   • GET  /api/user/me/dashboard - Dashboard data`);
    console.log(`   • GET  /api/nft/latest - Latest NFTs`);
    console.log(`   • POST /api/nft/create - Create NFT`);
    console.log(`🔗 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔗 Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 Explore page: htp://localhost:${PORT}/`);
    console.log(`🔗 Activity Page: http://localhost:${PORT}/activity`);
});