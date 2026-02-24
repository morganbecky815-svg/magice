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
const Redis = require('redis');
const { auth } = require('./middleware/auth');
const multer = require('multer');
const fs = require('fs');

// Cloudinary imports
const cloudinary = require('cloudinary').v2;

// Model imports
const User = require('./models/User');
const Activity = require('./models/Activity');
const ActivityLogger = require('./utils/activityLogger');
const Transaction = require('./models/Transaction');
const Staking = require('./models/Staking');

// ========================
// LOAD ENVIRONMENT VARIABLES
// ========================
dotenv.config();

// ========================
// INITIALIZE EXPRESS APP
// ========================
const app = express();

// ========================
// RAILWAY REDIS CONNECTION
// ========================
let redisClient = null;
let redisReady = false;

async function initRedis() {
    console.log('🔧 Setting up Redis for Railway...');
    
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        console.log('⚠️  REDIS_URL not found in environment variables');
        console.log('📋 Redis will be disabled - some features may be slower');
        redisReady = false;
        return;
    }
    
    console.log('🔗 Connecting to Railway Redis...');
    
    try {
        const url = new URL(redisUrl);
        console.log(`📡 Redis Host: ${url.hostname}:${url.port || 6379}`);
        
        redisClient = Redis.createClient({
            url: redisUrl,
            socket: {
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
            console.log('🔌 Redis connecting to Railway...');
        });
        
        redisClient.on('ready', () => {
            console.log('✅ Redis connected and ready on Railway!');
            redisReady = true;
        });
        
        await Promise.race([
            redisClient.connect(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout (10s)')), 10000)
            )
        ]);
        
        await redisClient.set('railway-test', 'connected-' + Date.now());
        const testResult = await redisClient.get('railway-test');
        console.log(`🧪 Redis test successful: ${testResult}`);
        
        redisReady = true;
        
    } catch (error) {
        console.log(`❌ Redis initialization failed: ${error.message}`);
        redisClient = null;
        redisReady = false;
    }
}

// Initialize Redis
initRedis();

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
// MIDDLEWARE - UPDATED CORS
// ========================
app.use(cors({
    origin: [
      'https://magicedenmarketplace.com',
      'https://www.magicedenmarketplace.com',
      'https://magiceden.up.railway.app',
      'https://bountiful-youth.railway.app',
      'http://localhost:3000',
      'http://localhost:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add this OPTIONS handler for preflight requests
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'views'), {
    extensions: ['html'],
    index: ['index.html', 'index.htm']
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========================
// ROUTE IMPORTS
// ========================
const authRoutes = require('./routes/auth');
const nftRoutes = require('./routes/nft');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const depositRoutes = require('./routes/deposit');
const withdrawRoutes = require('./routes/withdraw'); // NEW
const collectionRoutes = require('./routes/collection');
const ticketRoutes = require('./routes/ticketRoutes');
const nftImportRoutes = require('./routes/nftImport');

// ========================
// REGISTER API ROUTES
// ========================
app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/user', userRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdraw', withdrawRoutes); // NEW
app.use('/api/collection', collectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support/tickets', ticketRoutes);
app.use('/api/nft-import', nftImportRoutes);

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
// NEW ROUTES FOR STAKING & TRANSFER
// ========================
app.get('/transfer', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transfer.html'));
});

app.get('/staking', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'staking.html'));
});

// ============================================
// STAKING & TRANSFER API ROUTES
// ============================================

// ✅ Get user's staking data
app.get('/api/staking/user-stakes', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        console.log(`📊 Fetching staking data for user: ${userId}`);
        
        let userStakes = await Staking.findOne({ userId });
        
        if (!userStakes) {
            console.log('🆕 No staking data found, creating default');
            userStakes = new Staking({
                userId,
                ethStaked: 0,
                wethStaked: 0,
                ethRewards: 0,
                wethRewards: 0,
                apy: {
                    eth: 4.8,
                    weth: 5.2
                },
                lastRewardCalculation: new Date()
            });
            
            await userStakes.save();
        }
        
        const totalStaked = userStakes.ethStaked + userStakes.wethStaked;
        const totalRewards = userStakes.ethRewards + userStakes.wethRewards;
        
        console.log(`✅ Found staking data: ${totalStaked} ETH staked, ${totalRewards} ETH rewards`);
        
        res.json({
            success: true,
            stakingData: {
                ethStaked: userStakes.ethStaked,
                wethStaked: userStakes.wethStaked,
                ethRewards: userStakes.ethRewards,
                wethRewards: userStakes.wethRewards,
                apy: userStakes.apy || { eth: 4.8, weth: 5.2 },
                totalStaked,
                totalRewards,
                lastRewardCalculation: userStakes.lastRewardCalculation
            }
        });
    } catch (error) {
        console.error('❌ Failed to fetch staking data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staking data'
        });
    }
});

// ✅ Get staking history
app.get('/api/staking/history', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, limit = 50 } = req.query;
        
        let query = { 
            $or: [
                { fromUser: userId },
                { toUser: userId }
            ],
            type: { $in: ['staking', 'unstaking', 'reward'] }
        };
        
        if (type && ['staking', 'unstaking', 'reward'].includes(type)) {
            query.type = type;
        }
        
        const history = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .select('-__v -metadata');
        
        res.json({
            success: true,
            history: history.map(tx => ({
                type: tx.type,
                currency: tx.currency,
                amount: tx.amount,
                timestamp: tx.createdAt,
                status: tx.status
            }))
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch staking history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch staking history'
        });
    }
});

// ✅ Stake tokens
app.post('/api/staking/stake', auth, async (req, res) => {
    try {
        const { currency, amount } = req.body;
        const userId = req.user._id;
        
        console.log(`🎯 Staking request: ${amount} ${currency} from user ${userId}`);
        
        if (!currency || !['eth', 'weth'].includes(currency.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency. Use "eth" or "weth"'
            });
        }
        
        const stakeAmount = parseFloat(amount);
        if (isNaN(stakeAmount) || stakeAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be positive number'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const balance = currency === 'eth' ? user.ethBalance : user.wethBalance;
        if (balance < stakeAmount) {
            return res.status(400).json({
                success: false,
                error: `Insufficient ${currency.toUpperCase()} balance. Available: ${balance.toFixed(4)}`
            });
        }
        
        const minStake = 0.01;
        if (stakeAmount < minStake) {
            return res.status(400).json({
                success: false,
                error: `Minimum stake amount is ${minStake} ${currency.toUpperCase()}`
            });
        }
        
        if (currency === 'eth') {
            user.ethBalance -= stakeAmount;
        } else {
            user.wethBalance -= stakeAmount;
        }
        
        await user.save();
        
        let staking = await Staking.findOne({ userId });
        if (!staking) {
            staking = new Staking({ userId });
        }
        
        if (currency === 'eth') {
            staking.ethStaked += stakeAmount;
        } else {
            staking.wethStaked += stakeAmount;
        }
        
        staking.stakes.push({
            type: currency,
            amount: stakeAmount,
            duration: 30,
            status: 'active'
        });
        
        await staking.save();
        
        const transaction = new Transaction({
            type: 'staking',
            fromUser: userId,
            amount: stakeAmount,
            currency: currency.toUpperCase(),
            status: 'completed',
            metadata: {
                stakeId: staking._id,
                duration: 30,
                stakeType: currency
            }
        });
        await transaction.save();
        
        try {
            const activityLogger = require('./utils/activityLogger');
            await activityLogger.logStaking(userId, currency, stakeAmount);
            console.log('📝 Activity logged for staking');
        } catch (activityError) {
            console.log('⚠️ Could not log staking activity:', activityError.message);
        }
        
        console.log(`✅ Successfully staked ${stakeAmount} ${currency.toUpperCase()}`);
        
        res.json({
            success: true,
            message: `Successfully staked ${stakeAmount.toFixed(4)} ${currency.toUpperCase()}`,
            stakingData: {
                ethStaked: staking.ethStaked,
                wethStaked: staking.wethStaked,
                ethRewards: staking.ethRewards,
                wethRewards: staking.wethRewards
            },
            newBalance: currency === 'eth' ? user.ethBalance : user.wethBalance
        });
        
    } catch (error) {
        console.error('❌ Staking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stake tokens',
            message: error.message
        });
    }
});

// ✅ Unstake tokens
app.post('/api/staking/unstake', auth, async (req, res) => {
    try {
        const { currency, amount } = req.body;
        const userId = req.user._id;
        
        console.log(`🔄 Unstaking request: ${amount} ${currency} from user ${userId}`);
        
        if (!currency || !['eth', 'weth'].includes(currency.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency. Use "eth" or "weth"'
            });
        }
        
        const unstakeAmount = parseFloat(amount);
        if (isNaN(unstakeAmount) || unstakeAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be positive number'
            });
        }
        
        const staking = await Staking.findOne({ userId });
        if (!staking) {
            return res.status(400).json({
                success: false,
                error: 'No staking data found'
            });
        }
        
        const stakedAmount = currency === 'eth' ? staking.ethStaked : staking.wethStaked;
        if (stakedAmount < unstakeAmount) {
            return res.status(400).json({
                success: false,
                error: `Cannot unstake more than staked. Staked: ${stakedAmount.toFixed(4)} ${currency.toUpperCase()}`
            });
        }
        
        if (currency === 'eth') {
            staking.ethStaked -= unstakeAmount;
        } else {
            staking.wethStaked -= unstakeAmount;
        }
        
        await staking.save();
        
        const user = await User.findById(userId);
        if (currency === 'eth') {
            user.ethBalance += unstakeAmount;
        } else {
            user.wethBalance += unstakeAmount;
        }
        await user.save();
        
        const transaction = new Transaction({
            type: 'unstaking',
            toUser: userId,
            amount: unstakeAmount,
            currency: currency.toUpperCase(),
            status: 'completed',
            metadata: {
                stakeId: staking._id,
                stakeType: currency
            }
        });
        await transaction.save();
        
        try {
            const activityLogger = require('./utils/activityLogger');
            await activityLogger.logUnstaking(userId, currency, unstakeAmount);
            console.log('📝 Activity logged for unstaking');
        } catch (activityError) {
            console.log('⚠️ Could not log unstaking activity:', activityError.message);
        }
        
        console.log(`✅ Successfully unstaked ${unstakeAmount} ${currency.toUpperCase()}`);
        
        res.json({
            success: true,
            message: `Successfully unstaked ${unstakeAmount.toFixed(4)} ${currency.toUpperCase()}`,
            stakingData: {
                ethStaked: staking.ethStaked,
                wethStaked: staking.wethStaked
            },
            newBalance: currency === 'eth' ? user.ethBalance : user.wethBalance
        });
        
    } catch (error) {
        console.error('❌ Unstaking error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unstake tokens',
            message: error.message
        });
    }
});

// ✅ Claim rewards
app.post('/api/staking/claim-rewards', auth, async (req, res) => {
    try {
        const { currency } = req.body;
        const userId = req.user._id;
        
        console.log(`🎁 Claim rewards request for ${currency} from user ${userId}`);
        
        if (!currency || !['eth', 'weth'].includes(currency.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency. Use "eth" or "weth"'
            });
        }
        
        const staking = await Staking.findOne({ userId });
        if (!staking) {
            return res.status(400).json({
                success: false,
                error: 'No staking data found'
            });
        }
        
        const rewards = currency === 'eth' ? staking.ethRewards : staking.wethRewards;
        if (rewards <= 0) {
            return res.status(400).json({
                success: false,
                error: `No ${currency.toUpperCase()} rewards to claim`
            });
        }
        
        if (currency === 'eth') {
            staking.ethRewards = 0;
        } else {
            staking.wethRewards = 0;
        }
        staking.lastRewardCalculation = new Date();
        await staking.save();
        
        const user = await User.findById(userId);
        if (currency === 'eth') {
            user.ethBalance += rewards;
        } else {
            user.wethBalance += rewards;
        }
        await user.save();
        
        const transaction = new Transaction({
            type: 'reward',
            toUser: userId,
            amount: rewards,
            currency: currency.toUpperCase(),
            status: 'completed',
            metadata: {
                stakeId: staking._id,
                rewardType: 'staking'
            }
        });
        await transaction.save();
        
        try {
            const activityLogger = require('./utils/activityLogger');
            await activityLogger.logRewardClaim(userId, currency, rewards);
            console.log('📝 Activity logged for reward claim');
        } catch (activityError) {
            console.log('⚠️ Could not log reward activity:', activityError.message);
        }
        
        console.log(`✅ Successfully claimed ${rewards.toFixed(4)} ${currency.toUpperCase()} rewards`);
        
        res.json({
            success: true,
            message: `Successfully claimed ${rewards.toFixed(4)} ${currency.toUpperCase()} rewards`,
            stakingData: {
                ethRewards: staking.ethRewards,
                wethRewards: staking.wethRewards
            },
            newBalance: currency === 'eth' ? user.ethBalance : user.wethBalance
        });
        
    } catch (error) {
        console.error('❌ Claim rewards error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to claim rewards',
            message: error.message
        });
    }
});

// ✅ Calculate rewards
app.get('/api/staking/calculate-rewards', auth, async (req, res) => {
    try {
        const { amount, currency, duration } = req.query;
        const userId = req.user._id;
        
        const stakeAmount = parseFloat(amount) || 1;
        const stakeCurrency = currency || 'eth';
        const stakeDuration = parseInt(duration) || 30;
        
        if (!['eth', 'weth'].includes(stakeCurrency)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency'
            });
        }
        
        const staking = await Staking.findOne({ userId });
        const apy = staking?.apy?.[stakeCurrency] || (stakeCurrency === 'eth' ? 4.8 : 5.2);
        
        const annualRewards = stakeAmount * (apy / 100);
        const dailyRewards = annualRewards / 365;
        const estimatedRewards = dailyRewards * stakeDuration;
        
        res.json({
            success: true,
            calculation: {
                amount: stakeAmount,
                currency: stakeCurrency.toUpperCase(),
                duration: stakeDuration,
                apy,
                estimatedRewards,
                totalAfterStaking: stakeAmount + estimatedRewards,
                dailyRewards
            }
        });
        
    } catch (error) {
        console.error('❌ Calculate rewards error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate rewards'
        });
    }
});

// ============================================
// TRANSFER & WITHDRAWAL ROUTES
// ============================================

// ✅ Transfer crypto
app.post('/api/transfer/send', auth, async (req, res) => {
    try {
        const { recipient, amount, currency, network, note } = req.body;
        const userId = req.user._id;
        
        console.log(`💸 Transfer request: ${amount} ${currency} to ${recipient} from user ${userId}`);
        
        if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid recipient address. Must be a valid Ethereum address'
            });
        }
        
        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount. Must be positive number'
            });
        }
        
        if (!currency || !['eth', 'weth', 'usdc'].includes(currency.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid currency'
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        let balance = 0;
        switch (currency) {
            case 'eth':
                balance = user.ethBalance;
                break;
            case 'weth':
                balance = user.wethBalance;
                break;
            case 'usdc':
                balance = user.usdcBalance || 0;
                break;
        }
        
        if (balance < transferAmount) {
            return res.status(400).json({
                success: false,
                error: `Insufficient ${currency.toUpperCase()} balance. Available: ${balance.toFixed(4)}`
            });
        }
        
        switch (currency) {
            case 'eth':
                user.ethBalance -= transferAmount;
                break;
            case 'weth':
                user.wethBalance -= transferAmount;
                break;
            case 'usdc':
                user.usdcBalance = (user.usdcBalance || 0) - transferAmount;
                break;
        }
        
        await user.save();
        
        const transaction = new Transaction({
            type: 'transfer',
            fromUser: userId,
            amount: transferAmount,
            currency: currency.toUpperCase(),
            recipientAddress: recipient,
            network: network || 'ethereum',
            note,
            status: 'completed',
            metadata: {
                fromAddress: user.walletAddress || 'marketplace',
                toAddress: recipient,
                timestamp: Date.now()
            }
        });
        await transaction.save();
        
        try {
            const activityLogger = require('./utils/activityLogger');
            await activityLogger.logTransfer(userId, currency, transferAmount, recipient);
            console.log('📝 Activity logged for transfer');
        } catch (activityError) {
            console.log('⚠️ Could not log transfer activity:', activityError.message);
        }
        
        console.log(`✅ Successfully transferred ${transferAmount} ${currency.toUpperCase()} to ${recipient.substring(0, 10)}...`);
        
        res.json({
            success: true,
            message: `Successfully transferred ${transferAmount.toFixed(4)} ${currency.toUpperCase()}`,
            transactionId: transaction._id,
            newBalance: balance - transferAmount
        });
        
    } catch (error) {
        console.error('❌ Transfer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to transfer funds',
            message: error.message
        });
    }
});

// Add near your other routes
app.get('/api/test-import/:contract/:tokenId', auth, async (req, res) => {
    try {
        const { contract, tokenId } = req.params;
        
        console.log('🧪 TEST IMPORT - Fetching NFT:', contract, tokenId);
        
        // Use your moralisService to fetch just this NFT
        const moralisService = require('./services/moralisService');
        
        // You might need to add this method to moralisService
        const nftData = await moralisService.fetchSingleNFT(contract, tokenId);
        
        console.log('🧪 TEST IMPORT - Raw data received');
        
        res.json({
            success: true,
            message: 'Test import completed',
            data: nftData
        });
    } catch (error) {
        console.error('🧪 TEST IMPORT - Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get transaction history
app.get('/api/transactions', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, currency, limit = 50, page = 1 } = req.query;
        
        let query = { 
            $or: [
                { fromUser: userId },
                { toUser: userId }
            ]
        };
        
        if (type && type !== 'all') {
            query.type = type;
        }
        
        if (currency && currency !== 'all') {
            query.currency = currency.toUpperCase();
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .select('-__v -metadata')
            .populate('fromUser', 'fullName email')
            .populate('toUser', 'fullName email');
        
        const total = await Transaction.countDocuments(query);
        
        res.json({
            success: true,
            transactions: transactions.map(tx => ({
                _id: tx._id,
                type: tx.type,
                currency: tx.currency,
                amount: tx.amount,
                recipient: tx.recipientAddress,
                sender: tx.senderAddress || (tx.fromUser?.fullName || tx.fromUser?.email),
                network: tx.network,
                note: tx.note,
                status: tx.status,
                transactionHash: tx.transactionHash,
                gasFee: tx.gasFee,
                createdAt: tx.createdAt
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
        
    } catch (error) {
        console.error('❌ Get transactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transactions'
        });
    }
});

// ✅ Get recent contacts
app.get('/api/transfer/contacts', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const recentTransfers = await Transaction.find({
            fromUser: userId,
            type: 'transfer',
            recipientAddress: { $exists: true, $ne: '' }
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('recipientAddress createdAt');
        
        const uniqueRecipients = [];
        const seen = new Set();
        
        recentTransfers.forEach(tx => {
            if (tx.recipientAddress && !seen.has(tx.recipientAddress)) {
                seen.add(tx.recipientAddress);
                uniqueRecipients.push({
                    address: tx.recipientAddress,
                    lastTransaction: tx.createdAt
                });
            }
        });
        
        const contacts = [
            {
                address: '0x742d35Cc6634C0532925a3b844Bc9e90E4343A9B',
                name: 'Marketplace Wallet',
                isMarketplace: true,
                lastTransaction: new Date()
            }
        ];
        
        uniqueRecipients.slice(0, 4).forEach(recipient => {
            contacts.push({
                address: recipient.address,
                name: `Contact ${recipient.address.substring(0, 6)}...${recipient.address.substring(recipient.address.length - 4)}`,
                lastTransaction: recipient.lastTransaction
            });
        });
        
        res.json({
            success: true,
            contacts
        });
        
    } catch (error) {
        console.error('❌ Get contacts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts'
        });
    }
});

// ✅ Validate address
app.post('/api/transfer/validate-address', auth, async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.json({
                success: false,
                valid: false,
                error: 'Address is required'
            });
        }
        
        const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
        
        const isMarketplace = address.toLowerCase() === '0x742d35cc6634c0532925a3b844bc9e90e4343a9b';
        
        res.json({
            success: true,
            valid: isValid,
            isMarketplace,
            formattedAddress: isValid ? 
                `${address.substring(0, 10)}...${address.substring(address.length - 8)}` : 
                null
        });
        
    } catch (error) {
        console.error('❌ Validate address error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate address'
        });
    }
});

// ✅ Get gas estimate
app.post('/api/transfer/estimate-gas', auth, async (req, res) => {
    try {
        const { currency, network } = req.body;
        
        const gasEstimates = {
            ethereum: {
                eth: 0.0012,
                weth: 0.0015,
                usdc: 0.0020
            },
            arbitrum: {
                eth: 0.0003,
                weth: 0.0004,
                usdc: 0.0005
            },
            polygon: {
                eth: 0.0001,
                weth: 0.0002,
                usdc: 0.0003
            },
            optimism: {
                eth: 0.0004,
                weth: 0.0005,
                usdc: 0.0006
            }
        };
        
        const selectedNetwork = network || 'ethereum';
        const selectedCurrency = currency || 'eth';
        
        const gasEstimate = gasEstimates[selectedNetwork]?.[selectedCurrency] || 0.0012;
        
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
        
        const gasUsd = gasEstimate * ethPrice;
        
        res.json({
            success: true,
            estimate: {
                network: selectedNetwork,
                currency: selectedCurrency,
                gasEth: gasEstimate,
                gasUsd,
                ethPrice,
                timestamp: Date.now()
            }
        });
        
    } catch (error) {
        console.error('❌ Gas estimate error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to estimate gas'
        });
    }
});

// ✅ Get bank accounts
app.get('/api/bank-accounts', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const bankAccounts = [
            {
                id: 'bank_1',
                bankName: 'Chase Bank',
                accountNumber: '**** **** 7890',
                accountHolder: req.user.fullName || 'User',
                country: 'US',
                isVerified: true,
                isDefault: true
            }
        ];
        
        res.json({
            success: true,
            accounts: bankAccounts
        });
        
    } catch (error) {
        console.error('❌ Get bank accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch bank accounts'
        });
    }
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

// ========================
// MARKETPLACE STATS WITH FORMATTING
// ========================
app.get('/api/marketplace/stats', async (req, res) => {
    try {
        const MarketplaceStats = require('./models/MarketplaceStats');
        const stats = await MarketplaceStats.getStats();
        
        // Helper function to format numbers
        const formatNumber = (num) => {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M+';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K+';
            } else {
                return num.toString();
            }
        };
        
        // Format the numbers
        const formattedNFTs = formatNumber(stats.displayedNFTs);
        const formattedUsers = formatNumber(stats.displayedUsers);
        const formattedVolume = formatNumber(stats.displayedVolume);
        const formattedCollections = formatNumber(stats.displayedCollections);
        
        res.json({
            success: true,
            stats: {
                nfts: formattedNFTs,
                users: formattedUsers,
                volume: formattedVolume,
                collections: formattedCollections,
                // Keep raw numbers for calculations if needed
                raw: {
                    nfts: stats.displayedNFTs,
                    users: stats.displayedUsers,
                    volume: stats.displayedVolume,
                    collections: stats.displayedCollections
                },
                lastUpdated: stats.lastUpdated
            }
        });
        
    } catch (error) {
        console.error('Marketplace stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch marketplace stats' 
        });
    }
});

// ========================
// DASHBOARD DATA ENDPOINT (UPDATED with custodial fields)
// ========================
app.get('/api/user/me/dashboard', auth, async (req, res) => {
  try {
      console.log('📊 Dashboard data request for user:', req.user.email);
      
      const userId = req.user._id;
      
      const user = await User.findById(userId).select('-password -__v -encryptedPrivateKey');
      
      const recentActivities = await Activity.find({ userId: userId })
          .sort({ createdAt: -1 })
          .limit(5);
      
      const NFT = require('./models/NFT');
      const userNFTs = await NFT.find({ owner: userId })
          .sort({ price: -1, createdAt: -1 })
          .limit(2);
      
      const recommendedNFTs = await NFT.find({ 
          owner: { $ne: userId },
          isListed: true 
      })
          .sort({ createdAt: -1 })
          .limit(4)
          .populate('owner', 'fullName profileImage');
      
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
                  depositAddress: user.depositAddress,
                  internalBalance: user.internalBalance || 0,
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
// LATEST NFTS ENDPOINT
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
// USER ACTIVITY ENDPOINT
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
// NFT CREATION ENDPOINT (UPDATED to use internalBalance)
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
          isListed: true
      });
      
      nft.tokenId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await nft.save();
      
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
// UPDATE USER PROFILE (UPDATED)
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
// GET USER'S NFTS (UPDATED)
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
                isListed: nft.isListed || true
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
// ADD FUNDS ENDPOINT (DEPRECATED - Use deposit system)
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
                    internalBalance: amount 
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
            message: `Added ${amount} to your wallet balance`,
            newBalance: user.internalBalance
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
                type: 'deposit_received',
                title: 'Deposit Received',
                description: 'ETH deposit credited to your account',
                amount: 1.5,
                currency: 'ETH',
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
        const maxSize = 50 * 1024 * 1024;
        
        if (image.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: `File size (${(image.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB`
            });
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(image.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'File type not supported. Please upload JPEG, PNG, GIF, or WebP'
            });
        }
        
        console.log(`📁 Uploading file: ${image.name} (${(image.size / 1024 / 1024).toFixed(2)}MB)`);
        
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(image.name);
        const uploadPath = path.join(uploadDir, uniqueName);
        
        await image.mv(uploadPath);
        
        console.log('✅ File saved locally:', uploadPath);
        
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
                
                fs.unlinkSync(uploadPath);
                
            } catch (cloudinaryError) {
                console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
            }
        }
        
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
// START SWEEP JOB (NEW)
// ========================
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SWEEP === 'true') {
    try {
        require('./jobs/sweepJob');
        console.log('✅ Sweep job scheduler started');
    } catch (error) {
        console.error('❌ Failed to start sweep job:', error.message);
    }
}

// ========================
// DATABASE CONNECTION
// ========================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/magic-eden';

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
        
        const totalTickets = await Ticket.countDocuments();
        
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
    
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
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
    console.log(`   • POST /api/nft-import/fetch - Fetch NFTs from Moralis`);
    console.log(`   • POST /api/nft-import/save - Save imported NFTs`);
    console.log(`   • GET  /api/deposit/info - Get deposit address (NEW)`);
    console.log(`   • POST /api/withdraw/request - Request withdrawal (NEW)`);
    console.log(`🔗 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔗 Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 Explore page: http://localhost:${PORT}/`);
    console.log(`🔗 Activity Page: http://localhost:${PORT}/activity`);
});