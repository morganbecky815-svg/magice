const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// ===== GET DEPOSIT INFORMATION =====
router.get('/info', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      message: 'Send funds to the platform wallet address below',
      platformWallet: process.env.PLATFORM_WALLET_ADDRESS,
      yourWalletAddress: user.systemWalletAddress, // ← User's unique wallet address
      note: 'Include your wallet address in the transaction memo so we can credit your account'
    });
  } catch (error) {
    console.error('Error getting deposit info:', error);
    res.status(500).json({ error: 'Failed to get deposit information' });
  }
});

module.exports = router;