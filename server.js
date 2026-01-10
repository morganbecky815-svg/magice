const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { auth } = require('./middleware/auth'); // Your auth middleware

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ SERVE STATIC FILES
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ HTML PAGE ROUTES
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

// ✅ USER PROFILE ROUTES WITH ID
app.get('/user/:userId/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// ✅ API TEST ROUTE
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// ✅ API ROUTES
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
// ✅ ADD-ETH PAGE (for buying ETH)
app.get('/add-eth', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'add-eth.html'));
});

// ✅ CONVERT-WETH PAGE  
app.get('/convert-weth', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'convert-weth.html'));
});

// ✅ CREATE-NFT PAGE
app.get('/create-nft', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'create-nft.html'));
});

// ✅ ACTIVITY PAGE
app.get('/activity', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'activity.html'));
});

// ✅ REAL API: GET USER BY ID
app.get('/api/user/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                bio: user.bio,
                balance: user.balance,
                ethBalance: user.ethBalance,
                wethBalance: user.wethBalance,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                nftCount: user.nftCount,
                totalVolume: user.totalVolume,
                twitter: user.twitter,
                website: user.website
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ✅ REAL API: UPDATE USER PROFILE
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

// ✅ REAL API: GET USER'S NFTS
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

// ✅ DATABASE CONNECTION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/magic-eden';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
    })
    .catch((err) => {
        console.log('⚠️ MongoDB Connection Note:', err.message);
        console.log('⚠️ App will continue without database');
    });

// ✅ ERROR HANDLING
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

// ✅ 404 HANDLER
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ REAL API Endpoints:`);
    console.log(`   • GET  /api/user/:userId - Get user data`);
    console.log(`   • PUT  /api/user/:userId/profile - Update profile`);
    console.log(`   • GET  /api/user/:userId/nfts - Get user's NFTs`);
    console.log(`🔗 Profile Example: http://localhost:${PORT}/user/123/profile`);
});